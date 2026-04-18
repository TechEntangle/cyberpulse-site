#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 YYYY-MM-DD path/to/post.html path/to/post.pdf [title]" >&2
  exit 1
fi

DATE="$1"
HTML_SRC="$2"
PDF_SRC="$3"
TITLE="${4:-CyberPulse, $DATE}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
POSTS_DIR="$ROOT/posts"
ASSETS_DIR="$ROOT/assets"
INDEX="$ROOT/index.html"
POST_OUT="$POSTS_DIR/$DATE.html"
PDF_OUT="$ASSETS_DIR/cyberpulse-$DATE.pdf"

mkdir -p "$POSTS_DIR" "$ASSETS_DIR"
cp "$HTML_SRC" "$POST_OUT"
cp "$PDF_SRC" "$PDF_OUT"

python3 - <<'PY' "$INDEX" "$DATE" "$TITLE"
from pathlib import Path
import sys, re
index_path = Path(sys.argv[1])
date = sys.argv[2]
title = sys.argv[3]
html = index_path.read_text()
html = re.sub(r'(<div class="latest-title">)(.*?)(</div>)', rf'\1{title}\3', html, count=1, flags=re.S)
html = re.sub(r'href="\./posts/[0-9\-]+\.html"', f'href="./posts/{date}.html"', html, count=1)
html = re.sub(r'href="\./assets/cyberpulse-[0-9\-]+\.pdf"', f'href="./assets/cyberpulse-{date}.pdf"', html, count=2)
archive_block = f'''        <div class="archive-item">\n          <div>\n            <a href="./posts/{date}.html">{title}</a>\n            <div class="archive-date">Published {date}</div>\n          </div>\n          <a class="btn secondary" href="./assets/cyberpulse-{date}.pdf">PDF</a>\n        </div>'''
marker = '<div class="archive">\n'
if archive_block not in html:
    html = html.replace(marker, marker + archive_block + '\n', 1)
index_path.write_text(html)
PY

echo "Published $DATE into $ROOT"
