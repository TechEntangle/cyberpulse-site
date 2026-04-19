#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# CyberPulse · One-command publishing automation
# Usage:
#   ./scripts/publish.sh YYYY-MM-DD path/to/post.html [OPTIONS]
#
# Options:
#   --pdf PATH          Attach a PDF asset
#   --title TEXT        Article title (default: extracted from HTML <title>)
#   --desc TEXT         Short description (default: extracted from HTML meta)
#   --cover PATH        Use an existing cover image instead of generating one
#   --cover-prompt PATH Text file with a custom DALL-E prompt for cover art
#   --og-only           Regenerate OG image only (skip other updates)
#   --skip-cover        Skip cover art generation
#   --skip-og           Skip OG image generation
#   --skip-git          Skip git add/commit/push
#   --dry-run           Show what would be done without writing files
#   --help              Show this help message
#
# Environment:
#   OPENAI_API_KEY      Required for cover art generation (skipped if absent)
#
# Examples:
#   ./scripts/publish.sh 2026-04-19 ~/briefing.html
#   ./scripts/publish.sh 2026-04-19 ~/briefing.html --title "Zero Trust Dies at the Inbox"
#   ./scripts/publish.sh 2026-04-19 ~/briefing.html --pdf ~/briefing.pdf --skip-cover
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── Helpers ──────────────────────────────────────────────────────
info()  { printf '\033[1;34m▸\033[0m %s\n' "$*"; }
ok()    { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
warn()  { printf '\033[1;33m⚠\033[0m %s\n' "$*" >&2; }
fail()  { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

usage() {
  sed -n '2,/^# ──/{ /^#/s/^# \?//p }' "$0"
  exit 0
}

# ── Parse arguments ──────────────────────────────────────────────
DATE=""
HTML_SRC=""
PDF_SRC=""
TITLE=""
DESC=""
COVER_PATH=""
COVER_PROMPT=""
OG_ONLY=false
SKIP_COVER=false
SKIP_OG=false
SKIP_GIT=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help)          usage ;;
    --pdf)           PDF_SRC="$2";      shift 2 ;;
    --title)         TITLE="$2";        shift 2 ;;
    --desc)          DESC="$2";         shift 2 ;;
    --cover)         COVER_PATH="$2";   shift 2 ;;
    --cover-prompt)  COVER_PROMPT="$2"; shift 2 ;;
    --og-only)       OG_ONLY=true;      shift ;;
    --skip-cover)    SKIP_COVER=true;   shift ;;
    --skip-og)       SKIP_OG=true;      shift ;;
    --skip-git)      SKIP_GIT=true;     shift ;;
    --dry-run)       DRY_RUN=true;      shift ;;
    -*)              fail "Unknown option: $1" ;;
    *)
      if [[ -z "$DATE" ]]; then
        DATE="$1"
      elif [[ -z "$HTML_SRC" ]]; then
        HTML_SRC="$1"
      else
        fail "Unexpected argument: $1"
      fi
      shift ;;
  esac
done

[[ -n "$DATE" ]] || fail "Date argument (YYYY-MM-DD) is required"
[[ "$DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || fail "Date must be YYYY-MM-DD format"

if ! $OG_ONLY; then
  [[ -n "$HTML_SRC" ]] || fail "HTML source file is required"
  [[ -f "$HTML_SRC" ]] || fail "HTML file not found: $HTML_SRC"
fi

# ── Paths ────────────────────────────────────────────────────────
POSTS_DIR="$ROOT/posts"
ASSETS_DIR="$ROOT/assets"
COVERS_DIR="$ASSETS_DIR/covers"
OG_DIR="$ASSETS_DIR/og"
POST_OUT="$POSTS_DIR/$DATE.html"

mkdir -p "$POSTS_DIR" "$COVERS_DIR" "$OG_DIR"

# ── Extract title/desc from HTML if not provided ─────────────────
if [[ -n "$HTML_SRC" ]]; then
  if [[ -z "$TITLE" ]]; then
    TITLE=$(python3 -c "
import re, sys
html = open(sys.argv[1]).read()
# Try og:title first, then <title> tag
m = re.search(r'property=\"og:title\"\s+content=\"([^\"]+)\"', html)
if not m:
    m = re.search(r'<title>[^|]*\|\s*(.+?)</title>', html)
if not m:
    m = re.search(r'<title>(.+?)</title>', html)
print(m.group(1).strip() if m else '')
" "$HTML_SRC" 2>/dev/null || echo "")
    TITLE="${TITLE:-CyberPulse, $DATE}"
  fi
  if [[ -z "$DESC" ]]; then
    DESC=$(python3 -c "
import re, sys
html = open(sys.argv[1]).read()
m = re.search(r'property=\"og:description\"\s+content=\"([^\"]+)\"', html)
if not m:
    m = re.search(r'name=\"description\"\s+content=\"([^\"]+)\"', html)
print(m.group(1).strip() if m else '')
" "$HTML_SRC" 2>/dev/null || echo "")
    DESC="${DESC:-Executive cyber intelligence briefing for $DATE.}"
  fi
fi

TITLE="${TITLE:-CyberPulse, $DATE}"
DESC="${DESC:-Executive cyber intelligence briefing for $DATE.}"

# ── Summary ──────────────────────────────────────────────────────
echo ""
info "CyberPulse publish: $DATE"
info "Title: $TITLE"
info "Desc:  $DESC"
[[ -n "$PDF_SRC" ]] && info "PDF:   $PDF_SRC"
echo ""

if $DRY_RUN; then
  warn "DRY RUN — no files will be written"
  echo ""
fi

# ── Step 1: Render integrated post HTML ──────────────────────────
if ! $OG_ONLY; then
  info "Step 1/7: Rendering integrated post HTML"
  if ! $DRY_RUN; then
    node "$ROOT/scripts/render-post.js" "$DATE" "$HTML_SRC"
  fi
  ok "Post → $POST_OUT"
fi

# ── Step 2: Copy PDF (optional) ──────────────────────────────────
if [[ -n "$PDF_SRC" ]] && ! $OG_ONLY; then
  info "Step 2/7: Copying PDF asset"
  if [[ -f "$PDF_SRC" ]]; then
    if ! $DRY_RUN; then
      cp "$PDF_SRC" "$ASSETS_DIR/cyberpulse-$DATE.pdf"
    fi
    ok "PDF → $ASSETS_DIR/cyberpulse-$DATE.pdf"
  else
    warn "PDF not found: $PDF_SRC (skipping)"
  fi
else
  info "Step 2/7: No PDF — skipping"
fi

# ── Step 3: Generate cover art ───────────────────────────────────
if ! $SKIP_COVER && ! $OG_ONLY; then
  info "Step 3/7: Cover art"
  if [[ -n "$COVER_PATH" ]]; then
    if [[ -f "$COVER_PATH" ]]; then
      if ! $DRY_RUN; then
        cp "$COVER_PATH" "$COVERS_DIR/$DATE.png"
      fi
      ok "Cover (copied) → $COVERS_DIR/$DATE.png"
    else
      fail "Cover file not found: $COVER_PATH"
    fi
  elif [[ -n "${OPENAI_API_KEY:-}" ]]; then
    info "Generating DALL-E 3 cover art..."
    if ! $DRY_RUN; then
      COVER_ARGS=("$DATE")
      [[ -n "$COVER_PROMPT" ]] && COVER_ARGS+=("$COVER_PROMPT")
      node "$ROOT/scripts/generate-cover.js" "${COVER_ARGS[@]}"
    fi
    ok "Cover (generated) → $COVERS_DIR/$DATE.png"
  else
    warn "No OPENAI_API_KEY and no --cover provided — skipping cover generation"
    if [[ ! -f "$COVERS_DIR/$DATE.png" && -f "$OG_DIR/$DATE.png" ]]; then
      warn "Falling back to OG image as article cover"
      if ! $DRY_RUN; then
        cp "$OG_DIR/$DATE.png" "$COVERS_DIR/$DATE.png"
      fi
    elif [[ ! -f "$COVERS_DIR/$DATE.png" ]]; then
      warn "No cover image exists at $COVERS_DIR/$DATE.png"
    fi
  fi
else
  info "Step 3/7: Cover art — skipping"
fi

# ── Step 4: Generate OG/social card ──────────────────────────────
if ! $SKIP_OG; then
  info "Step 4/7: Generating OG social card"
  if ! $DRY_RUN; then
    node "$ROOT/scripts/generate-og.js" "$DATE" "$TITLE" "$DESC"
    if [[ ! -f "$COVERS_DIR/$DATE.png" && -f "$OG_DIR/$DATE.png" ]]; then
      cp "$OG_DIR/$DATE.png" "$COVERS_DIR/$DATE.png"
    fi
  fi
  ok "OG card → $OG_DIR/$DATE.png"
else
  info "Step 4/7: OG card — skipping"
fi

if $OG_ONLY; then
  ok "OG-only mode complete"
  exit 0
fi

# ── Step 5: Update index, feed, sitemap, archive ─────────────────
info "Step 5/7: Updating index, feed, sitemap, archive"
if ! $DRY_RUN; then
  python3 - <<'PY' "$ROOT/index.html" "$ROOT/feed.xml" "$ROOT/sitemap.xml" "$ROOT/archive/index.html" "$DATE" "$TITLE" "$DESC"
from pathlib import Path
import sys, re
from datetime import datetime

index_path = Path(sys.argv[1])
feed_path = Path(sys.argv[2])
sitemap_path = Path(sys.argv[3])
archive_path = Path(sys.argv[4])
date = sys.argv[5]
title = sys.argv[6]
desc = sys.argv[7]

# Parse date for RSS pubDate
dt = datetime.strptime(date, "%Y-%m-%d")
rfc822 = dt.strftime("%a, %d %b %Y 06:00:00 +0000")
display_date = dt.strftime("%B %d, %Y").replace(" 0", " ")

post_url = f"https://tusharvartak.com/posts/{date}.html"
cover_url = f"https://tusharvartak.com/assets/covers/{date}.png"

# --- Update index.html ---
html = index_path.read_text()
html = re.sub(r'href="\./posts/[0-9\-]+\.html"', f'href="./posts/{date}.html"', html, count=1)
html = re.sub(r'(<h2 class="signal-title">)(.*?)(</h2>)', rf'\g<1>{title}\3', html, count=1, flags=re.S)
html = re.sub(r'src="\./assets/covers/[0-9\-]+\.png"', f'src="./assets/covers/{date}.png"', html, count=1)
# Prepend new archive item
archive_block = f'''        <a class="archive-item" href="./posts/{date}.html">
          <div>
            <div class="archive-date">{display_date}</div>
            <div class="archive-title">{title}</div>
            <div class="archive-desc">{desc}</div>
          </div>
          <div class="archive-arrow">\u2192</div>
        </a>'''
marker = '<div class="archive">\n'
if f'href="./posts/{date}.html"' not in html.split('id="archive"')[1] if 'id="archive"' in html else '':
    html = html.replace(marker, marker + archive_block + '\n', 1)
index_path.write_text(html)

# --- Update feed.xml ---
if feed_path.exists():
    feed = feed_path.read_text()
    new_item = f'''    <item>
      <title>{title}</title>
      <link>{post_url}</link>
      <guid isPermaLink="true">{post_url}</guid>
      <pubDate>{rfc822}</pubDate>
      <dc:creator>Tushar Vartak</dc:creator>
      <description>{desc}</description>
      <enclosure url="{cover_url}" type="image/png" length="0"/>
    </item>'''
    if post_url not in feed:
        feed = re.sub(r'(<lastBuildDate>)(.*?)(</lastBuildDate>)', rf'\1{rfc822}\3', feed, count=1)
        feed = feed.replace('    <item>', new_item + '\n    <item>', 1)
    feed_path.write_text(feed)

# --- Update sitemap.xml ---
if sitemap_path.exists():
    sitemap = sitemap_path.read_text()
    new_url = f'''  <url>
    <loc>{post_url}</loc>
    <lastmod>{date}</lastmod>
    <changefreq>never</changefreq>
    <priority>0.9</priority>
  </url>'''
    if post_url not in sitemap:
        sitemap = re.sub(r'(<lastmod>)[0-9\-]+(</lastmod>)', rf'\g<1>{date}\2', sitemap, count=1)
        sitemap = sitemap.replace('</urlset>', new_url + '\n</urlset>')
    sitemap_path.write_text(sitemap)

# --- Update archive/index.html ---
if archive_path.exists():
    archive = archive_path.read_text()
    new_archive_item = f'''    <a class="item" href="/posts/{date}.html">
      <div>
        <div class="date">{display_date}</div>
        <div class="title">{title}</div>
        <div class="desc">{desc}</div>
      </div>
      <div class="arrow">\u2192</div>
    </a>'''
    if f'href="/posts/{date}.html"' not in archive:
        archive = archive.replace('    <a class="item"', new_archive_item + '\n    <a class="item"', 1)
    archive_path.write_text(archive)

PY
fi
ok "Index, feed, sitemap, archive updated"

# ── Step 6: Git commit & push ────────────────────────────────────
if ! $SKIP_GIT; then
  info "Step 6/7: Git commit & push"
  if ! $DRY_RUN; then
    cd "$ROOT"
    git add \
      "posts/$DATE.html" \
      "assets/covers/$DATE.png" \
      "assets/og/$DATE.png" \
      "index.html" \
      "feed.xml" \
      "sitemap.xml" \
      "archive/index.html" \
      2>/dev/null || true
    [[ -n "$PDF_SRC" ]] && git add "assets/cyberpulse-$DATE.pdf" 2>/dev/null || true
    git commit -m "Publish $DATE: $TITLE" || warn "Nothing to commit"
    git push || warn "Push failed — you may need to push manually"
  fi
  ok "Committed and pushed"
else
  info "Step 6/7: Git — skipping"
fi

# ── Step 7: Send newsletter to subscribers ───────────────────────
info "Step 7/7: Newsletter distribution"
if [[ -n "${RESEND_API_KEY:-}" ]]; then
  SEND_ARGS=(--date "$DATE" --title "$TITLE" --desc "$DESC")
  # Try to extract edition number from post HTML
  if [[ -f "$POST_OUT" ]]; then
    EDITION=$(python3 -c "
import re, sys
html = open(sys.argv[1]).read()
m = re.search(r'Edition\s+(?:No\.\s*)?(\d+)', html, re.I)
print(m.group(1) if m else '')
" "$POST_OUT" 2>/dev/null || echo "")
    [[ -n "$EDITION" ]] && SEND_ARGS+=(--edition "$EDITION")
  fi
  if $DRY_RUN; then
    SEND_ARGS+=(--dry-run)
  fi
  node "$ROOT/email/send.js" "${SEND_ARGS[@]}"
  ok "Newsletter sent"
else
  warn "No RESEND_API_KEY — skipping newsletter send"
  info "To send manually: RESEND_API_KEY=re_xxx node email/send.js --date $DATE --title \"$TITLE\" --desc \"$DESC\""
fi

# ── Done ─────────────────────────────────────────────────────────
echo ""
ok "Publishing complete for $DATE"
echo "  Post:    https://tusharvartak.com/posts/$DATE.html"
echo "  Cover:   https://tusharvartak.com/assets/covers/$DATE.png"
echo "  OG:      https://tusharvartak.com/assets/og/$DATE.png"
echo ""
