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

## Backlog

- [ ] **4. Email/newsletter distribution** — Add email capture and automated distribution
  for new briefings (e.g., Buttondown, Resend, or custom SMTP).

- [ ] **5. Analytics integration** — Add privacy-respecting analytics (e.g., Plausible,
  Fathom, or Umami) to track readership and sharing metrics.

- [ ] **6. Multi-author support** — Extend template and publish script to support
  guest contributors with per-author metadata and bylines.

- [ ] **7. Search / full-text index** — Add client-side search across all published
  editions (e.g., Pagefind or Lunr.js).

- [ ] **8. Automated PDF generation** — Generate PDF versions of each briefing
  automatically during the publish flow (e.g., via Puppeteer or wkhtmltopdf).
