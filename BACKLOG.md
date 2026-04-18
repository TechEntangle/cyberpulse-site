# CyberPulse Backlog

## Completed

- [x] **1. One-command publishing automation** — `scripts/publish.sh` handles the full
  end-to-end flow: copy post HTML, copy PDF, generate cover art (DALL-E 3), generate
  OG/social PNG card, update index/feed/sitemap/archive, git commit & push. Supports
  `--dry-run`, `--skip-cover`, `--skip-og`, `--skip-git`, `--cover`, `--cover-prompt`,
  `--og-only`, and auto-extracts title/description from HTML meta tags.

- [x] **2. Reusable article template system** — `templates/post.html` is a full
  production-ready template with `{{PLACEHOLDER}}` variables for all content fields.
  `scripts/new-post.sh YYYY-MM-DD "Title"` scaffolds a new post from the template with
  dates, share URLs, and edition number pre-filled.

- [x] **3. OG/social card generation (PNG)** — `scripts/generate-og.js` generates
  branded 1200x630 OG cards with proper text wrapping, date display, and CP monogram.
  Renders SVG to PNG via rsvg-convert (or sips on macOS). All pages now reference PNG
  instead of SVG for full social platform compatibility (LinkedIn, Twitter/X, Facebook,
  Slack, iMessage, etc.).

- [x] **4. Richer homepage publication dashboard** — Homepage now includes a publication
  stats strip (editions, topics, avg read time, signal confidence), clickable tag cloud
  with links to archive filtering, tag badges on archive items, and a search trigger
  button with keyboard shortcut (`/`) that navigates to the archive search.

- [x] **5. Search, tagging, and filtering** — Archive page has a full client-side search
  bar with instant filtering by title, description, and tags. Tag filter buttons allow
  one-click topic filtering. URL parameters (`?tag=X`, `?search=1`) enable deep linking
  from homepage tags and search trigger. Keyboard shortcuts: `/` to focus search, `Esc`
  to clear. Tags on article pages are now clickable links to filtered archive views.

- [x] **6. Motion refinement** — All pages now use CSS custom property duration tokens
  (`--duration-fast`, `--duration-med`, `--duration-slow`) for consistent timing.
  `translateY` entry animations reduced from 18px to 12px. All pages include
  `@media (prefers-reduced-motion: reduce)` which disables all animations and transitions
  for accessibility. Pulse animation on edition dot respects reduced motion.

- [x] **7. Final brand-system polish** — Unified design tokens across all pages: duration
  variables, consistent border-radius, shadow, and spacing tokens. All transition
  durations reference `var(--duration-*)` instead of hardcoded values. Light theme
  brand-mark shadow consistent across all page types.

- [x] **8. Analytics groundwork** — All interactive elements across homepage, archive,
  and article pages carry `data-analytics` attributes (e.g., `cta-read-today`,
  `archive-click`, `share-linkedin`, `share-x`, `share-copy`, `search-open`,
  `hero-panel-click`). A lightweight analytics stub listens for clicks and dispatches
  to `window.cpAnalytics()` when a provider is connected. Ready for Plausible, Fathom,
  or custom integration without any markup changes.

- [x] **9. Email/newsletter distribution** — Full Resend-compatible newsletter system:
  premium branded HTML email template (`email/template.js`) with dark theme, Outlook VML
  fallback, and Apple Mail dark mode support. Subscriber management via JSON flat-file
  (`email/subscribers.js`) with add/remove/import/export CLI. Batch send script
  (`email/send.js`) with per-recipient Resend API calls, rate limiting, and dry-run mode.
  Serverless-ready API handler (`email/api.js`) for subscribe/unsubscribe endpoints.
  Homepage subscribe form with gold-accent card design and localStorage fallback.
  Unsubscribe page (`email/unsubscribe.html`) matching site branding. Publish pipeline
  (`scripts/publish.sh`) updated to 7-step flow with automatic newsletter distribution
  when `RESEND_API_KEY` is set.

- [x] **10. Subscription layer hardening** — Double opt-in with
  pending/confirmed/unsubscribed state machine and per-subscriber crypto tokens.
  Confirmation email template (`email/confirm-template.js`) sent via Resend on
  subscribe. Tokenized unsubscribe links in every newsletter (no email in URL).
  Cloudflare Turnstile CAPTCHA widget on subscribe form. In-memory per-IP rate
  limiting (5 requests / 15 min). Dedupe and safe re-subscribe handling (pending
  token refresh, already-confirmed short-circuit). Static landing pages for confirm
  (`email/confirmed.html`) and unsubscribe (`email/unsubscribe.html`) with
  URL-param-driven state display. Legacy `send-test.js` removed. Homepage form
  updated to POST to API with async UX. **Requires deployment**: Turnstile site key
  is a placeholder, API endpoint URL needs updating, and the serverless function
  (api.js) must be deployed to Cloudflare Workers / Vercel / Netlify.

## Backlog

- [ ] **11. Multi-author support** — Extend template and publish script to support
  guest contributors with per-author metadata and bylines.

- [ ] **12. Automated PDF generation** — Generate PDF versions of each briefing
  automatically during the publish flow (e.g., via Puppeteer or wkhtmltopdf).

- [ ] **13. Deploy subscriber API** — Deploy `email/api.js` to a serverless platform,
  configure Turnstile site key, update `SUBSCRIBE_API` URL in `index.html`, and set
  environment secrets (`RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`).
