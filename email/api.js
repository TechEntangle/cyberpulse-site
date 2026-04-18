#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// CyberPulse · Subscriber API handler (hardened)
//
// Serverless-compatible request handler with:
//   - Double opt-in (pending → confirmed via token)
//   - Tokenized unsubscribe (no email in URL)
//   - Cloudflare Turnstile CAPTCHA verification on subscribe
//   - In-memory rate limiting (per-IP, resets on restart)
//   - Confirmation email via Resend API
//
// Endpoints:
//   POST /subscribe       { email, captchaToken }  → pending + sends confirm email
//   GET  /confirm?token=  (from email link)        → confirmed
//   GET  /unsubscribe?token= (from email link)     → unsubscribed
//   POST /unsubscribe     { token }                → unsubscribed (API)
//
// Environment:
//   RESEND_API_KEY           Required for sending confirmation emails
//   TURNSTILE_SECRET_KEY     Required for CAPTCHA verification
//   CYBERPULSE_API_URL       Base URL of the deployed API (for confirm links)
//                            Defaults to https://tusharvartak.com/api
//
// Local test server:
//   node email/api.js            # starts on port 3001
// ─────────────────────────────────────────────────────────────────
const http = require('http');
const { add, confirm, removeByToken, findByToken } = require('./subscribers');
const { buildConfirmEmail } = require('./confirm-template');

// ── Configuration ────────────────────────────────────────────────
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://tusharvartak.com';
const API_BASE = process.env.CYBERPULSE_API_URL || 'https://tusharvartak.com/api';
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY || '';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = 'CyberPulse <cyberpulse@tusharvartak.com>';

// ── Rate limiting (in-memory, per-IP) ────────────────────────────
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT = 5;                   // max subscribe attempts per window
const rateBuckets = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    rateBuckets.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  bucket.count++;
  if (bucket.count > RATE_LIMIT) return true;
  return false;
}

// Clean stale buckets every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of rateBuckets) {
    if (now - bucket.windowStart > RATE_WINDOW_MS) rateBuckets.delete(ip);
  }
}, 30 * 60 * 1000).unref();

// ── Turnstile CAPTCHA verification ───────────────────────────────
async function verifyCaptcha(token, ip) {
  if (!TURNSTILE_SECRET) {
    // In dev/test mode without a secret, skip verification
    return { success: true };
  }
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: TURNSTILE_SECRET,
        response: token,
        remoteip: ip || ''
      })
    });
    return await res.json();
  } catch {
    return { success: false, 'error-codes': ['network-error'] };
  }
}

// ── Send confirmation email via Resend ───────────────────────────
async function sendConfirmEmail(email, token) {
  if (!RESEND_API_KEY) {
    console.log(`[dev] Confirm link for ${email}: ${API_BASE}/confirm?token=${token}`);
    return { ok: true, dev: true };
  }
  const confirmUrl = `${API_BASE}/confirm?token=${token}`;
  const { html, text } = buildConfirmEmail({ email, confirmUrl });
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [email],
      subject: 'Confirm your CyberPulse subscription',
      html,
      text
    })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to send confirmation email');
  return { ok: true };
}

// ── CORS headers ─────────────────────────────────────────────────
function corsHeaders(origin) {
  const allowed = origin === CORS_ORIGIN || (process.env.NODE_ENV !== 'production');
  return {
    'Access-Control-Allow-Origin': allowed ? (origin || '*') : CORS_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}

// ── Request handler ──────────────────────────────────────────────
async function handleRequest(method, path, body, { ip, origin } = {}) {
  // CORS preflight
  if (method === 'OPTIONS') {
    return { status: 204, body: '' };
  }

  const url = new URL(path, 'http://localhost');
  const pathname = url.pathname;

  // ── GET /confirm?token=xxx ───────────────────────────────────
  if (method === 'GET' && pathname === '/confirm') {
    const token = url.searchParams.get('token');
    if (!token) {
      return { status: 400, body: { error: 'Missing token' }, redirect: null };
    }
    const result = confirm(token);
    if (!result.ok) {
      // Redirect to site with error
      return { status: 302, redirect: `${CORS_ORIGIN}/email/confirmed.html?status=error` };
    }
    // Redirect to confirmation success page
    return { status: 302, redirect: `${CORS_ORIGIN}/email/confirmed.html?status=ok&email=${encodeURIComponent(result.email)}` };
  }

  // ── GET /unsubscribe?token=xxx ───────────────────────────────
  if (method === 'GET' && pathname === '/unsubscribe') {
    const token = url.searchParams.get('token');
    if (!token) {
      return { status: 302, redirect: `${CORS_ORIGIN}/email/unsubscribe.html?status=error` };
    }
    const result = removeByToken(token);
    if (!result.ok) {
      return { status: 302, redirect: `${CORS_ORIGIN}/email/unsubscribe.html?status=invalid` };
    }
    return { status: 302, redirect: `${CORS_ORIGIN}/email/unsubscribe.html?status=ok&email=${encodeURIComponent(result.email)}` };
  }

  // All remaining endpoints are POST
  if (method !== 'POST') {
    return { status: 405, body: { error: 'Method not allowed' } };
  }

  let data;
  try { data = typeof body === 'string' ? JSON.parse(body) : body; }
  catch { return { status: 400, body: { error: 'Invalid JSON' } }; }

  // ── POST /subscribe ──────────────────────────────────────────
  if (pathname === '/subscribe') {
    // Rate limit check
    if (ip && isRateLimited(ip)) {
      return { status: 429, body: { error: 'Too many requests. Please try again later.' } };
    }

    // CAPTCHA verification
    const captchaToken = data && data.captchaToken;
    if (TURNSTILE_SECRET && !captchaToken) {
      return { status: 400, body: { error: 'CAPTCHA verification required' } };
    }
    if (captchaToken || TURNSTILE_SECRET) {
      const captchaResult = await verifyCaptcha(captchaToken || '', ip);
      if (!captchaResult.success) {
        return { status: 403, body: { error: 'CAPTCHA verification failed' } };
      }
    }

    const email = data && data.email;
    if (!email || typeof email !== 'string') {
      return { status: 400, body: { error: 'Email is required' } };
    }

    const result = add(email);
    if (!result.ok) return { status: 400, body: { error: result.error } };

    if (result.action === 'already_subscribed') {
      return { status: 200, body: { ok: true, action: 'already_subscribed' } };
    }

    // Send confirmation email for pending subscribers
    try {
      await sendConfirmEmail(email.trim().toLowerCase(), result.token);
    } catch (err) {
      console.error(`Failed to send confirmation to ${email}: ${err.message}`);
      // Still return success — subscriber is saved, they can retry
    }

    return { status: 200, body: { ok: true, action: 'confirmation_sent' } };
  }

  // ── POST /unsubscribe ────────────────────────────────────────
  if (pathname === '/unsubscribe') {
    const token = data && data.token;
    if (!token) return { status: 400, body: { error: 'Token is required' } };
    const result = removeByToken(token);
    if (!result.ok) return { status: 400, body: { error: result.error } };
    return { status: 200, body: { ok: true, action: result.action } };
  }

  return { status: 404, body: { error: 'Not found' } };
}

// Export for serverless use
module.exports = { handleRequest, corsHeaders };

// ── Local test server ────────────────────────────────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 3001;

  const server = http.createServer(async (req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      const origin = req.headers.origin || '';
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      const headers = corsHeaders(origin);
      // In dev, allow all origins
      headers['Access-Control-Allow-Origin'] = '*';

      try {
        const result = await handleRequest(req.method, req.url, body, { ip, origin });

        if (result.redirect) {
          res.writeHead(result.status, { ...headers, 'Location': result.redirect });
          res.end();
          return;
        }

        res.writeHead(result.status, headers);
        res.end(typeof result.body === 'string' ? result.body : JSON.stringify(result.body));
      } catch (err) {
        console.error('Handler error:', err);
        res.writeHead(500, headers);
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
  });

  server.listen(PORT, () => {
    console.log(`\x1b[34m\u25b8\x1b[0m CyberPulse subscriber API running on http://localhost:${PORT}`);
    console.log(`  POST /subscribe      { "email": "...", "captchaToken": "..." }`);
    console.log(`  GET  /confirm?token=  (from confirmation email)`);
    console.log(`  GET  /unsubscribe?token= (from newsletter email)`);
    if (!TURNSTILE_SECRET) console.log(`  \x1b[33m\u26a0\x1b[0m  TURNSTILE_SECRET_KEY not set — CAPTCHA verification skipped`);
    if (!RESEND_API_KEY) console.log(`  \x1b[33m\u26a0\x1b[0m  RESEND_API_KEY not set — confirm links logged to console`);
  });
}
