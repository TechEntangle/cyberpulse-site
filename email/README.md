# CyberPulse Email & Newsletter System

## Overview

Hardened Resend-compatible email infrastructure for CyberPulse newsletter distribution
with double opt-in, tokenized unsubscribe, CAPTCHA protection, and rate limiting.

## Architecture

**Static site (GitHub Pages) + Cloudflare Workers API + D1 database**

Subscribers are stored in Cloudflare D1 (SQLite at the edge). The subscribe form
on the homepage POSTs to a Workers API endpoint that writes to D1. Newsletter sends
read from the same D1 database locally via `wrangler d1 execute --remote`.

```
Subscribe flow (deployed Worker):
  User submits form → Turnstile CAPTCHA verified → subscriber saved as "pending" in D1
    → confirmation email sent via Resend → user clicks confirm link
    → Worker sets status to "confirmed" in D1 → redirects to confirmed.html

Newsletter send (local CLI):
  node email/send.js → wrangler d1 execute → reads confirmed subscribers from D1
    → sends per-subscriber personalised email via Resend API
```

## Files

| File | Purpose |
|------|---------|
| `template.js` | Premium branded HTML + plain-text newsletter template (per-subscriber unsubscribe tokens) |
| `confirm-template.js` | Double opt-in confirmation email template |
| `send.js` | Newsletter send script — reads subscribers from D1, sends via Resend API |
| `subscribers-d1.js` | Local D1 reader — queries production D1 via `wrangler d1 execute --remote` |
| `subscribers.js` | Legacy JSON flat-file subscriber management (retained for local dev/testing) |
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
# Prerequisites: wrangler must be authenticated for D1 access
wrangler login

# Preview email template
node email/template.js --title "Title" --desc "Description" --date 2026-04-18

# Send newsletter to all confirmed subscribers (reads from D1)
RESEND_API_KEY=re_xxx node email/send.js \
  --date 2026-04-18 \
  --title "The Executive Is the New Perimeter" \
  --desc "Why SharePoint exploitation..."

# Test send to a single address (no D1/wrangler needed)
RESEND_API_KEY=re_xxx node email/send.js \
  --date 2026-04-18 --title "Title" --desc "Desc" \
  --to you@example.com

# Dry run — queries D1 for subscriber count but sends nothing
node email/send.js --date 2026-04-18 --title "Title" --desc "Desc" --dry-run

# Query subscribers directly via wrangler
wrangler d1 execute cyberpulse_subscribers --remote \
  --command "SELECT email, status FROM subscribers"
```

## Deployment

### Prerequisites

1. **Resend API key** (`RESEND_API_KEY`) — for sending emails
2. **Cloudflare Turnstile site key + secret** — for CAPTCHA on subscribe form
3. **Wrangler CLI** authenticated (`wrangler login`) — for local newsletter sends
4. Cloudflare Workers deployment (`wrangler deploy`) — for the subscribe API

### Worker deployment

```bash
wrangler deploy                              # deploy subscribe API
wrangler secret put RESEND_API_KEY           # set Resend key
wrangler secret put TURNSTILE_SECRET_KEY     # set Turnstile secret
```

### How subscriber data flows

1. Users subscribe via the deployed Worker → D1 stores as "pending"
2. Confirmation email link → Worker confirms in D1 → "confirmed"
3. Newsletter send (`send.js`) queries D1 remotely via wrangler → sends to confirmed list
4. Unsubscribe links in emails → Worker sets "unsubscribed" in D1

The local `subscribers.json` is no longer used for production sends.

## Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `RESEND_API_KEY` | For sending | Resend API key (`re_...`) |
| `TURNSTILE_SECRET_KEY` | For CAPTCHA | Cloudflare Turnstile secret key |
| `CYBERPULSE_API_URL` | Optional | Base URL of deployed API (default: `https://tusharvartak.com/api`) |
| `CORS_ORIGIN` | Optional | Allowed CORS origin (default: `https://tusharvartak.com`) |
