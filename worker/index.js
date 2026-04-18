// ─────────────────────────────────────────────────────────────────
// CyberPulse · Cloudflare Worker entry point
//
// Subscriber API running on Workers + D1.
// Replaces the Node.js http server in email/api.js with the
// Workers fetch handler. Business logic is identical.
//
// Endpoints:
//   POST /subscribe       { email, captchaToken }
//   GET  /confirm?token=
//   GET  /unsubscribe?token=
//   POST /unsubscribe     { token }
//
// Env bindings (wrangler.toml):
//   DB                   D1 database
//   CORS_ORIGIN          Allowed origin
//   CYBERPULSE_API_URL   Base URL for confirm/unsub links
//   FROM_EMAIL           Sender address
//
// Secrets (wrangler secret put):
//   RESEND_API_KEY
//   TURNSTILE_SECRET_KEY
// ─────────────────────────────────────────────────────────────────
import { add, confirm, removeByToken } from './subscribers-d1.js';
import { buildConfirmEmail } from './confirm-email.js';

// ── Rate limiting (per-IP, in-memory — resets on cold start) ────
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 5;
const rateBuckets = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    rateBuckets.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  bucket.count++;
  return bucket.count > RATE_LIMIT;
}

// ── Turnstile CAPTCHA verification ──────────────────────────────
async function verifyCaptcha(token, ip, secret) {
  if (!secret) return { success: true };
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: ip || '' })
    });
    return await res.json();
  } catch {
    return { success: false, 'error-codes': ['network-error'] };
  }
}

// ── Send confirmation email via Resend ──────────────────────────
async function sendConfirmEmail(email, token, env) {
  const apiBase = env.CYBERPULSE_API_URL || 'https://tusharvartak.com/api';
  const confirmUrl = `${apiBase}/confirm?token=${token}`;
  const { html, text } = buildConfirmEmail({ email, confirmUrl });

  if (!env.RESEND_API_KEY) {
    console.log(`[dev] Confirm link for ${email}: ${confirmUrl}`);
    return { ok: true, dev: true };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL || 'CyberPulse <cyberpulse@tusharvartak.com>',
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

// ── CORS headers ────────────────────────────────────────────────
function corsHeaders(origin, env) {
  const allowed = env.CORS_ORIGIN || 'https://tusharvartak.com';
  return {
    'Access-Control-Allow-Origin': origin === allowed ? allowed : allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
}

function redirect(url, headers) {
  return new Response(null, { status: 302, headers: { ...headers, 'Location': url } });
}

// ── Worker fetch handler ────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const origin = request.headers.get('Origin') || '';
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const headers = corsHeaders(origin, env);
    const corsOrigin = env.CORS_ORIGIN || 'https://tusharvartak.com';

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    const pathname = url.pathname;

    try {
      // ── GET /confirm?token=xxx ──────────────────────────────
      if (method === 'GET' && pathname === '/confirm') {
        const token = url.searchParams.get('token');
        if (!token) {
          return redirect(`${corsOrigin}/email/confirmed.html?status=error`, headers);
        }
        const result = await confirm(env.DB, token);
        if (!result.ok) {
          return redirect(`${corsOrigin}/email/confirmed.html?status=error`, headers);
        }
        return redirect(
          `${corsOrigin}/email/confirmed.html?status=ok&email=${encodeURIComponent(result.email)}`,
          headers
        );
      }

      // ── GET /unsubscribe?token=xxx ──────────────────────────
      if (method === 'GET' && pathname === '/unsubscribe') {
        const token = url.searchParams.get('token');
        if (!token) {
          return redirect(`${corsOrigin}/email/unsubscribe.html?status=error`, headers);
        }
        const result = await removeByToken(env.DB, token);
        if (!result.ok) {
          return redirect(`${corsOrigin}/email/unsubscribe.html?status=invalid`, headers);
        }
        return redirect(
          `${corsOrigin}/email/unsubscribe.html?status=ok&email=${encodeURIComponent(result.email)}`,
          headers
        );
      }

      // All remaining endpoints are POST
      if (method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405, headers);
      }

      let data;
      try {
        data = await request.json();
      } catch {
        return jsonResponse({ error: 'Invalid JSON' }, 400, headers);
      }

      // ── POST /subscribe ─────────────────────────────────────
      if (pathname === '/subscribe') {
        if (ip && isRateLimited(ip)) {
          return jsonResponse({ error: 'Too many requests. Please try again later.' }, 429, headers);
        }

        const captchaToken = data && data.captchaToken;
        const turnstileSecret = env.TURNSTILE_SECRET_KEY || '';
        if (turnstileSecret && !captchaToken) {
          return jsonResponse({ error: 'CAPTCHA verification required' }, 400, headers);
        }
        if (captchaToken || turnstileSecret) {
          const captchaResult = await verifyCaptcha(captchaToken || '', ip, turnstileSecret);
          if (!captchaResult.success) {
            return jsonResponse({ error: 'CAPTCHA verification failed' }, 403, headers);
          }
        }

        const email = data && data.email;
        if (!email || typeof email !== 'string') {
          return jsonResponse({ error: 'Email is required' }, 400, headers);
        }

        const result = await add(env.DB, email);
        if (!result.ok) return jsonResponse({ error: result.error }, 400, headers);

        if (result.action === 'already_subscribed') {
          return jsonResponse({ ok: true, action: 'already_subscribed' }, 200, headers);
        }

        // Send confirmation email
        try {
          await sendConfirmEmail(email.trim().toLowerCase(), result.token, env);
        } catch (err) {
          console.error(`Failed to send confirmation to ${email}: ${err.message}`);
        }

        return jsonResponse({ ok: true, action: 'confirmation_sent' }, 200, headers);
      }

      // ── POST /unsubscribe ───────────────────────────────────
      if (pathname === '/unsubscribe') {
        const token = data && data.token;
        if (!token) return jsonResponse({ error: 'Token is required' }, 400, headers);
        const result = await removeByToken(env.DB, token);
        if (!result.ok) return jsonResponse({ error: result.error }, 400, headers);
        return jsonResponse({ ok: true, action: result.action }, 200, headers);
      }

      return jsonResponse({ error: 'Not found' }, 404, headers);
    } catch (err) {
      console.error('Handler error:', err);
      return jsonResponse({ error: 'Internal server error' }, 500, headers);
    }
  }
};
