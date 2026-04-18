# CyberPulse Email & Newsletter System

## Overview

Hardened Resend-compatible email infrastructure for CyberPulse newsletter distribution
with double opt-in, tokenized unsubscribe, CAPTCHA protection, and rate limiting.

## Architecture

**Static site (GitHub Pages) + serverless API (deploy separately)**

The subscribe form on the homepage POSTs to a serverless API endpoint. The API handles
all subscription logic, sends confirmation emails via Resend, and redirects users to
static confirmation/unsubscribe pages hosted on the same domain.

```
User submits form → Turnstile CAPTCHA verified → subscriber saved as "pending"
  → confirmation email sent via Resend → user clicks confirm link
  → API sets status to "confirmed" → redirects to confirmed.html
```

## Files

| File | Purpose |
|------|---------|
| `template.js` | Premium branded HTML + plain-text newsletter template (per-subscriber unsubscribe tokens) |
| `confirm-template.js` | Double opt-in confirmation email template |
| `send.js` | Newsletter send script (per-subscriber personalised emails via Resend API) |
| `subscribers.js` | Subscriber management with pending/confirmed/unsubscribed states and crypto tokens |
| `api.js` | HTTP endpoint handler: subscribe, confirm, unsubscribe (with rate limiting + Turnstile) |
| `subscribers.json` | Subscriber data (do not commit with real emails) |
| `unsubscribe.html` | Tokenized unsubscribe landing page |
| `confirmed.html` | Subscription confirmation success page |

## Subscriber states

```
           add()            confirm(token)
  (new) ──────────▶ pending ───────────────▶ confirmed
                      ▲                         │
                      │    remove/removeByToken  │
                      └──── re-subscribe ◀───────┘
                                                 │
                                          unsubscribed
```

- **pending**: Email submitted, awaiting confirmation click. Has a token.
- **confirmed**: Double opt-in complete. Receives newsletters.
- **unsubscribed**: Opted out. Token preserved for one-click unsubscribe links.

## Abuse protection

| Layer | Implementation |
|-------|---------------|
| CAPTCHA | Cloudflare Turnstile (invisible/compact widget) on subscribe form |
| Rate limiting | In-memory per-IP: 5 subscribe attempts per 15-minute window |
| Double opt-in | Prevents email bombing — subscriber must confirm from their inbox |
| Token auth | Unsubscribe links use 64-char hex tokens, no email addresses in URLs |

## Quick start

```bash
# Add a subscriber (creates as pending, prints confirm token)
node email/subscribers.js add reader@example.com

# Confirm a subscriber (simulates clicking the email link)
node email/subscribers.js confirm <token>

# Preview email template
node email/template.js --title "Title" --desc "Description" --date 2026-04-18

# Send newsletter to all confirmed subscribers
RESEND_API_KEY=re_xxx node email/send.js \
  --date 2026-04-18 \
  --title "The Executive Is the New Perimeter" \
  --desc "Why SharePoint exploitation..."

# Test send to a single address
RESEND_API_KEY=re_xxx node email/send.js \
  --date 2026-04-18 --title "Title" --desc "Desc" \
  --to you@example.com

# Dry run
node email/send.js --date 2026-04-18 --title "Title" --desc "Desc" --dry-run

# Run subscriber API locally
node email/api.js  # http://localhost:3001
```

## Deployment

### Prerequisites

1. **Resend API key** (`RESEND_API_KEY`) — for sending emails
2. **Cloudflare Turnstile site key + secret** — for CAPTCHA
3. A serverless platform to host `api.js` (Cloudflare Workers, Vercel, Netlify, etc.)

### Steps

1. Deploy `api.js` to your serverless platform
2. Set environment variables: `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `CYBERPULSE_API_URL`
3. Update `index.html`:
   - Replace `0x4AAAAAAA_PLACEHOLDER_KEY` with your Turnstile site key
   - Update `SUBSCRIBE_API` URL in the script to your deployed API URL
4. The static pages (`confirmed.html`, `unsubscribe.html`) are served from GitHub Pages

### Not yet done

- Turnstile site key is a placeholder — needs a real Cloudflare Turnstile key
- `SUBSCRIBE_API` URL in index.html needs to point to the deployed serverless function
- subscribers.json is a flat file — works fine at small scale, consider Resend Contacts
  API or a KV store if the list grows past a few hundred

## Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `RESEND_API_KEY` | For sending | Resend API key (`re_...`) |
| `TURNSTILE_SECRET_KEY` | For CAPTCHA | Cloudflare Turnstile secret key |
| `CYBERPULSE_API_URL` | Optional | Base URL of deployed API (default: `https://tusharvartak.com/api`) |
| `CORS_ORIGIN` | Optional | Allowed CORS origin (default: `https://tusharvartak.com`) |
