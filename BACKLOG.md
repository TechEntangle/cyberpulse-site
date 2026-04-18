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

## Backlog

- [ ] **9. Email/newsletter distribution** — Add email capture and automated distribution
  for new briefings (e.g., Buttondown, Resend, or custom SMTP).

- [ ] **10. Multi-author support** — Extend template and publish script to support
  guest contributors with per-author metadata and bylines.

- [ ] **11. Automated PDF generation** — Generate PDF versions of each briefing
  automatically during the publish flow (e.g., via Puppeteer or wkhtmltopdf).
