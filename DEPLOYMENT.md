# CyberPulse Subscriber API — Cloudflare Deployment

## What's ready

| Component | Status | File(s) |
|-----------|--------|---------|
| Wrangler config | Done | `wrangler.toml` |
| D1 database binding | Done | `cyberpulse_subscribers` / `4d6cffe9-59a3-431e-931a-058d53ad4809` |
| D1 schema + migration | Done | `migrations/0001_create_subscribers.sql` |
| Worker entry point | Done | `worker/index.js` (ESM, fetch handler) |
| D1 storage layer | Done | `worker/subscribers-d1.js` (replaces JSON flat-file) |
| Confirmation email template | Done | `worker/confirm-email.js` (ESM copy of `email/confirm-template.js`) |
| Build verification | Done | `wrangler deploy --dry-run` passes (15.3 KiB / 4.27 KiB gzipped) |
| Local migration test | Done | SQL applied successfully against local D1 |

### Architecture

```
Homepage (GitHub Pages)          Worker (Cloudflare)
┌─────────────────────┐          ┌─────────────────────────┐
│  Subscribe form     │──POST──▶│  worker/index.js        │
│  (index.html)       │         │    ├─ subscribers-d1.js  │──▶ D1 (SQLite)
│                     │◀─JSON───│    └─ confirm-email.js   │──▶ Resend API
│  confirmed.html     │◀─302────│  /confirm?token=xxx     │
│  unsubscribe.html   │◀─302────│  /unsubscribe?token=xxx │
└─────────────────────┘          └─────────────────────────┘
```

## What remains to go live

### 1. Set Worker secrets (required)

```bash
wrangler secret put RESEND_API_KEY
# Paste your Resend API key (re_...)

wrangler secret put TURNSTILE_SECRET_KEY
# Paste your Cloudflare Turnstile secret key
```

### 2. Apply D1 migration to remote database (required)

```bash
wrangler d1 migrations apply cyberpulse_subscribers --remote
```

### 3. Create Cloudflare Turnstile widget (required)

1. Go to Cloudflare dashboard > Turnstile
2. Create a site widget for `tusharvartak.com`
3. Copy the **Site Key** and **Secret Key**
4. Update `index.html`: replace `0x4AAAAAAA_PLACEHOLDER_KEY` with the real site key
5. Set the secret via `wrangler secret put TURNSTILE_SECRET_KEY`

### 4. Deploy the Worker (required)

```bash
wrangler deploy
```

Note the deployed URL (e.g., `https://cyberpulse-api.<account>.workers.dev`).

### 5. Configure custom domain or route (recommended)

Option A — Custom domain:
```bash
# In wrangler.toml, add:
# [routes]
# pattern = "api.tusharvartak.com/*"
# zone_name = "tusharvartak.com"
```

Option B — Workers Routes in Cloudflare dashboard.

### 6. Update frontend API URL (required)

In `index.html`, update the `SUBSCRIBE_API` constant to point to the deployed Worker:

```javascript
const SUBSCRIBE_API = 'https://api.tusharvartak.com/subscribe';
// or: 'https://cyberpulse-api.<account>.workers.dev/subscribe'
```

### 7. Update `CYBERPULSE_API_URL` in wrangler.toml (if using custom domain)

The `CYBERPULSE_API_URL` variable controls the base URL embedded in confirmation
and unsubscribe email links. Make sure it matches your deployed Worker URL.

## Files overview

```
wrangler.toml                        # Worker + D1 config
migrations/
  0001_create_subscribers.sql        # D1 schema (subscribers table + indexes)
worker/
  index.js                           # Cloudflare Worker fetch handler
  subscribers-d1.js                  # D1-backed subscriber CRUD
  confirm-email.js                   # Confirmation email template (ESM)
email/
  api.js                             # Original Node.js API (local dev / fallback)
  subscribers.js                     # Original JSON flat-file storage (CLI tools)
  confirm-template.js                # Original confirmation template (CJS)
  send.js                            # Newsletter batch send (still uses JSON + Resend directly)
```

## Local development

```bash
# Run Worker locally with D1
wrangler dev

# Apply migration to local D1
wrangler d1 migrations apply cyberpulse_subscribers --local

# Test subscribe
curl -X POST http://localhost:8787/subscribe \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com"}'
```

## Notes

- **Newsletter send** (`email/send.js`) still reads from `email/subscribers.json` and
  calls Resend directly. For full D1 integration of the send script, a future step
  would add a `wrangler d1 execute` query or a separate Worker endpoint that returns
  the active subscriber list.
- The original `email/api.js` + `email/subscribers.js` are preserved for local CLI use
  and as a fallback. They are not used by the Worker.
- Rate limiting in the Worker uses in-memory state, which resets on Worker cold starts.
  For persistent rate limiting, consider Cloudflare Rate Limiting rules or a KV-based counter.
