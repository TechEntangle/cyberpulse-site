#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// CyberPulse · Subscriber API handler
//
// Serverless-compatible request handler for subscribe/unsubscribe.
// Can be deployed as a Cloudflare Worker, Vercel Edge Function,
// or run locally for testing.
//
// Endpoints:
//   POST /subscribe   { email: "user@example.com" }
//   POST /unsubscribe { email: "user@example.com" }
//
// Local test server:
//   node email/api.js            # starts on port 3001
//   curl -X POST http://localhost:3001/subscribe \
//     -H 'Content-Type: application/json' \
//     -d '{"email":"test@example.com"}'
// ─────────────────────────────────────────────────────────────────
const http = require('http');
const { add, remove } = require('./subscribers');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://tusharvartak.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

function handleRequest(method, path, body) {
  // CORS preflight
  if (method === 'OPTIONS') {
    return { status: 204, body: '' };
  }

  if (method !== 'POST') {
    return { status: 405, body: { error: 'Method not allowed' } };
  }

  let data;
  try { data = JSON.parse(body); }
  catch { return { status: 400, body: { error: 'Invalid JSON' } }; }

  const email = data && data.email;
  if (!email || typeof email !== 'string') {
    return { status: 400, body: { error: 'Email is required' } };
  }

  if (path === '/subscribe') {
    const result = add(email);
    if (!result.ok) return { status: 400, body: { error: result.error } };
    return { status: 200, body: { ok: true, action: result.action } };
  }

  if (path === '/unsubscribe') {
    const result = remove(email);
    return { status: 200, body: { ok: true, action: result.action } };
  }

  return { status: 404, body: { error: 'Not found' } };
}

// Export for serverless use
module.exports = { handleRequest, CORS_HEADERS };

// ── Local test server ────────────────────────────────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 3001;

  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      // Allow localhost in dev
      const headers = { ...CORS_HEADERS, 'Access-Control-Allow-Origin': '*' };
      const result = handleRequest(req.method, req.url, body);
      res.writeHead(result.status, headers);
      res.end(typeof result.body === 'string' ? result.body : JSON.stringify(result.body));
    });
  });

  server.listen(PORT, () => {
    console.log(`\x1b[34m▸\x1b[0m CyberPulse subscriber API running on http://localhost:${PORT}`);
    console.log(`  POST /subscribe   { "email": "..." }`);
    console.log(`  POST /unsubscribe { "email": "..." }`);
  });
}
