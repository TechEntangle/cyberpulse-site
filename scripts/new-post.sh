#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# CyberPulse · New post scaffolding from template
# Usage:
#   ./scripts/new-post.sh YYYY-MM-DD "Article Title"
#
# Creates a new post file from templates/post.html with placeholder
# variables pre-filled and ready for content editing.
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE="$ROOT/templates/post.html"

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 YYYY-MM-DD \"Article Title\"" >&2
  exit 1
fi

DATE="$1"
TITLE="$2"

[[ "$DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || { echo "Date must be YYYY-MM-DD" >&2; exit 1; }
[[ -f "$TEMPLATE" ]] || { echo "Template not found: $TEMPLATE" >&2; exit 1; }

OUT="$ROOT/posts/$DATE.html"
if [[ -f "$OUT" ]]; then
  echo "Post already exists: $OUT" >&2
  echo "Delete it first or choose a different date." >&2
  exit 1
fi

# Parse date components
DISPLAY_DATE=$(python3 -c "
from datetime import datetime
dt = datetime.strptime('$DATE', '%Y-%m-%d')
print(dt.strftime('%B %d, %Y').replace(' 0', ' '))
")
FULL_DATE=$(python3 -c "
from datetime import datetime
dt = datetime.strptime('$DATE', '%Y-%m-%d')
print(dt.strftime('%A, %B %d, %Y').replace(' 0', ' '))
")

# URL-encode for share links
ENCODED_URL=$(python3 -c "import urllib.parse; print(urllib.parse.quote('https://tusharvartak.com/posts/$DATE.html', safe=''))")
ENCODED_TITLE=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$TITLE', safe=''))")

# Count existing posts to determine edition number
EDITION_NUM=$(( $(ls -1 "$ROOT/posts/"*.html 2>/dev/null | wc -l) + 1 ))

mkdir -p "$ROOT/posts"

# Replace template variables
sed \
  -e "s|{{DATE}}|$DATE|g" \
  -e "s|{{TITLE}}|$TITLE|g" \
  -e "s|{{DISPLAY_DATE}}|$DISPLAY_DATE|g" \
  -e "s|{{FULL_DATE}}|$FULL_DATE|g" \
  -e "s|{{ENCODED_URL}}|$ENCODED_URL|g" \
  -e "s|{{ENCODED_TITLE}}|$ENCODED_TITLE|g" \
  -e "s|{{EDITION_NUMBER}}|$EDITION_NUM|g" \
  -e "s|{{META_DESCRIPTION}}|A CyberPulse executive briefing: $TITLE|g" \
  -e "s|{{OG_DESCRIPTION}}|$TITLE — executive cyber intelligence briefing.|g" \
  -e "s|{{DEK}}|[Your sub-headline / deck text here]|g" \
  -e "s|{{READ_TIME}}|7|g" \
  -e "s|{{CONFIDENCE}}|[High/Moderate confidence, describe sources]|g" \
  -e "s|{{PRIMARY_SIGNAL}}|[One-sentence primary signal]|g" \
  -e "s|{{WHY_IT_MATTERS}}|[One-sentence why it matters]|g" \
  -e "s|{{AT_A_GLANCE}}|[Brief summary of this edition]|g" \
  "$TEMPLATE" > "$OUT"

echo "Created: $OUT"
echo "Edition: No. $EDITION_NUM"
echo ""
echo "Next steps:"
echo "  1. Edit $OUT — fill in content sections"
echo "  2. Run: ./scripts/publish.sh $DATE $OUT"
