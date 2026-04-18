#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 YYYY-MM-DD path/to/post.html [path/to/post.pdf] [title] [description]" >&2
  exit 1
fi

DATE="$1"
HTML_SRC="$2"
PDF_SRC="${3:-}"
TITLE="${4:-CyberPulse, $DATE}"
DESC="${5:-Executive cyber intelligence briefing for $DATE.}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
POSTS_DIR="$ROOT/posts"
ASSETS_DIR="$ROOT/assets"
INDEX="$ROOT/index.html"
FEED="$ROOT/feed.xml"
SITEMAP="$ROOT/sitemap.xml"
ARCHIVE="$ROOT/archive/index.html"
POST_OUT="$POSTS_DIR/$DATE.html"

mkdir -p "$POSTS_DIR" "$ASSETS_DIR"
cp "$HTML_SRC" "$POST_OUT"

if [[ -n "$PDF_SRC" && -f "$PDF_SRC" ]]; then
  cp "$PDF_SRC" "$ASSETS_DIR/cyberpulse-$DATE.pdf"
fi

# Update index.html, feed.xml, sitemap.xml, and archive/index.html
python3 - <<'PY' "$INDEX" "$FEED" "$SITEMAP" "$ARCHIVE" "$DATE" "$TITLE" "$DESC"
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

echo "Published $DATE into $ROOT"
echo "  - Post:    $POST_OUT"
echo "  - Index:   updated"
echo "  - Feed:    updated"
echo "  - Sitemap: updated"
echo "  - Archive: updated"
