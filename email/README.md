# CyberPulse Email & Newsletter System

## Overview

Resend-compatible email infrastructure for CyberPulse newsletter distribution.

## Files

| File | Purpose |
|------|---------|
| `template.js` | Premium branded HTML + plain-text email generator |
| `send.js` | Newsletter send script (single or batch via Resend API) |
| `subscribers.js` | Subscriber list management (JSON flat-file) |
| `api.js` | HTTP endpoint handler for subscribe/unsubscribe |
| `subscribers.json` | Subscriber data (do not commit with real emails) |
| `unsubscribe.html` | Public unsubscribe/manage preferences page |
| `send-test.js` | Legacy test send script (kept for reference) |

## Quick start

```bash
# Add a subscriber
node email/subscribers.js add reader@example.com

# Preview email template (HTML to stdout)
node email/template.js --title "Title" --desc "Description" --date 2026-04-18

# Send newsletter to all subscribers
RESEND_API_KEY=re_xxx node email/send.js \
  --date 2026-04-18 \
  --title "The Executive Is the New Perimeter" \
  --desc "Why SharePoint exploitation and executive-targeted social engineering..."

# Test send to a single address
RESEND_API_KEY=re_xxx node email/send.js \
  --date 2026-04-18 --title "Title" --desc "Desc" \
  --to you@example.com

# Dry run (no API calls)
node email/send.js --date 2026-04-18 --title "Title" --desc "Desc" --dry-run

# Run subscriber API locally
node email/api.js  # http://localhost:3001
```

## Publish pipeline integration

The publish script (`scripts/publish.sh`) now includes a Step 7 that automatically sends
the newsletter to all active subscribers when `RESEND_API_KEY` is set. Without the key,
it prints a manual send command instead.

## Subscriber management

```bash
node email/subscribers.js add user@example.com
node email/subscribers.js remove user@example.com
node email/subscribers.js list
node email/subscribers.js count
node email/subscribers.js export          # one email per line
node email/subscribers.js import list.txt # bulk import
```

## Deployment options for the subscribe API

The `api.js` handler exports a `handleRequest(method, path, body)` function compatible with:

- **Cloudflare Workers** — wrap in a `fetch` handler
- **Vercel Edge Functions** — wrap in `export default`
- **Netlify Functions** — wrap in `exports.handler`
- **Local dev** — `node email/api.js` runs a test server on port 3001

For a static GitHub Pages deployment, the subscribe form stores intent in localStorage
and you manage subscribers manually via the CLI tools.

## Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `RESEND_API_KEY` | For sending | Resend API key (`re_...`) |

## Email template design

- Dark theme matching site branding (orange/black/white)
- Outlook VML fallback for CTA button
- Apple Mail dark mode meta tags
- Hidden preheader text for inbox preview
- Mobile-responsive table layout
- Unsubscribe and preference management links in footer
