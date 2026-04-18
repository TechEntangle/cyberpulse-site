#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// CyberPulse · OG/Social Card Generator
//
// Generates a 1200×630 PNG social card from the branded SVG template.
// Works without any npm dependencies — uses only Node.js built-ins.
//
// Usage:
//   node scripts/generate-og.js YYYY-MM-DD "Title" "Description"
//   node scripts/generate-og.js --default   (regenerate default.png)
//
// Output:
//   assets/og/{date}.png   (per-article card)
//   assets/og/default.png  (site-wide fallback)
// ─────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/generate-og.js YYYY-MM-DD "Title" "Description"');
  console.error('       node scripts/generate-og.js --default');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const OG_DIR = path.join(ROOT, 'assets', 'og');
fs.mkdirSync(OG_DIR, { recursive: true });

// ── Brand constants ─────────────────────────────────────────────
const BRAND = {
  bg: '#07080B',
  cardBg1: '#1A1D28',
  cardBg2: '#0B0D12',
  gold: '#F0B44A',
  cream: '#F5EFE6',
  muted: '#C9BFB1',
  subtle: '#8F887B',
  monoBg: '#0A0C12',
};

// ── SVG text wrapping ───────────────────────────────────────────
function wrapText(text, maxChars) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if (current.length + word.length + 1 > maxChars) {
      lines.push(current.trim());
      current = word;
    } else {
      current += (current ? ' ' : '') + word;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}

function escSvg(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── CP Monogram (shared across all cards) ───────────────────────
const MONOGRAM = `
  <rect x="80" y="80" width="56" height="56" rx="14" fill="${BRAND.monoBg}"/>
  <path d="M100 96C96.7 96 94 98.7 94 102C94 105.3 96.7 108 100 108H102V105.5H100C98.1 105.5 96.5 103.9 96.5 102C96.5 100.1 98.1 98.5 100 98.5H102V96H100Z" fill="${BRAND.gold}"/>
  <rect x="105" y="96" width="3" height="12" rx="1.5" fill="${BRAND.cream}"/>
  <path d="M106.5 96H109C111.2 96 113 97.8 113 100C113 102.2 111.2 104 109 104H106.5V101.5H109C109.8 101.5 110.5 100.8 110.5 100C110.5 99.2 109.8 98.5 109 98.5H106.5V96Z" fill="${BRAND.cream}"/>
  <circle cx="112" cy="108" r="1.5" fill="${BRAND.gold}" opacity="0.55"/>`;

// ── Generate article-specific OG card ───────────────────────────
function articleCard(date, title, description) {
  const titleLines = wrapText(title, 28);
  const descLines = wrapText(description, 65);

  // Title positioning
  const titleStartY = 240;
  const titleLineHeight = 72;
  const titleTspans = titleLines.slice(0, 3).map((line, i) =>
    `<text x="84" y="${titleStartY + i * titleLineHeight}" fill="${BRAND.cream}" font-family="Arial, Helvetica, sans-serif" font-size="60" font-weight="800" letter-spacing="-1">${escSvg(line)}</text>`
  ).join('\n  ');

  // Description positioning (below title)
  const descStartY = titleStartY + titleLines.slice(0, 3).length * titleLineHeight + 40;
  const descTspans = descLines.slice(0, 2).map((line, i) =>
    `<text x="84" y="${descStartY + i * 36}" fill="${BRAND.muted}" font-family="Arial, Helvetica, sans-serif" font-size="26">${escSvg(line)}</text>`
  ).join('\n  ');

  // Format date for display
  const dt = new Date(date + 'T00:00:00Z');
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const displayDate = `${months[dt.getUTCMonth()]} ${dt.getUTCDate()}, ${dt.getUTCFullYear()}`;

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="${BRAND.bg}"/>
  <rect x="40" y="40" width="1120" height="550" rx="30" fill="url(#g1)" stroke="rgba(255,255,255,0.10)"/>
  ${MONOGRAM}
  <text x="148" y="117" fill="${BRAND.gold}" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" letter-spacing="4">CYBERPULSE</text>
  <text x="84" y="170" fill="${BRAND.subtle}" font-family="Arial, Helvetica, sans-serif" font-size="18">${escSvg(displayDate)}</text>
  ${titleTspans}
  ${descTspans}
  <text x="84" y="535" fill="${BRAND.subtle}" font-family="Arial, Helvetica, sans-serif" font-size="20">tusharvartak.com</text>
  <line x1="84" y1="548" x2="340" y2="548" stroke="${BRAND.gold}" stroke-width="2" opacity="0.3"/>
  <defs>
    <linearGradient id="g1" x1="90" y1="40" x2="1110" y2="590" gradientUnits="userSpaceOnUse">
      <stop stop-color="${BRAND.cardBg1}"/>
      <stop offset="1" stop-color="${BRAND.cardBg2}"/>
    </linearGradient>
  </defs>
</svg>`;
}

// ── Generate default/fallback OG card ───────────────────────────
function defaultCard() {
  return `<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="${BRAND.bg}"/>
  <rect x="40" y="40" width="1120" height="550" rx="28" fill="url(#g1)" stroke="rgba(255,255,255,0.10)"/>
  ${MONOGRAM}
  <text x="148" y="117" fill="${BRAND.gold}" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" letter-spacing="4">CYBERPULSE</text>
  <text x="84" y="270" fill="${BRAND.cream}" font-family="Arial, Helvetica, sans-serif" font-size="62" font-weight="800">Executive cyber intelligence</text>
  <text x="84" y="340" fill="${BRAND.muted}" font-family="Arial, Helvetica, sans-serif" font-size="30">Modern daily briefings for operators, boards, and security teams.</text>
  <text x="84" y="535" fill="${BRAND.subtle}" font-family="Arial, Helvetica, sans-serif" font-size="22">tusharvartak.com</text>
  <defs>
    <linearGradient id="g1" x1="90" y1="40" x2="1080" y2="590" gradientUnits="userSpaceOnUse">
      <stop stop-color="${BRAND.cardBg1}"/>
      <stop offset="1" stop-color="${BRAND.cardBg2}"/>
    </linearGradient>
  </defs>
</svg>`;
}

// ── SVG → PNG conversion ────────────────────────────────────────
// Tries rsvg-convert first (best quality), then sips (macOS), then falls back to SVG
function svgToPng(svgContent, outputPath) {
  const svgPath = outputPath.replace(/\.png$/, '.svg');
  fs.writeFileSync(svgPath, svgContent);

  // Try rsvg-convert (librsvg)
  try {
    execSync(`rsvg-convert -w 1200 -h 630 -o "${outputPath}" "${svgPath}"`, { stdio: 'pipe' });
    console.log(`  PNG rendered via rsvg-convert → ${outputPath}`);
    return true;
  } catch {}

  // Try sips (macOS built-in) — converts SVG to PNG natively
  try {
    execSync(`sips -s format png "${svgPath}" --out "${outputPath}" 2>/dev/null`, { stdio: 'pipe' });
    console.log(`  PNG rendered via sips → ${outputPath}`);
    return true;
  } catch {}

  // Fallback: keep SVG alongside (platforms that support SVG OG images)
  console.log(`  SVG written (no PNG converter available) → ${svgPath}`);
  console.log('  Install librsvg for PNG: brew install librsvg');
  return false;
}

// ── Main ────────────────────────────────────────────────────────
if (args[0] === '--default') {
  const svg = defaultCard();
  const outPng = path.join(OG_DIR, 'default.png');
  svgToPng(svg, outPng);
  // Also update the SVG
  fs.writeFileSync(path.join(OG_DIR, 'default.svg'), svg);
  console.log('Default OG card generated');
} else {
  const [date, title, description] = args;
  if (!date || !title) {
    console.error('Date and title are required for article OG cards');
    process.exit(1);
  }
  const desc = description || `Executive cyber intelligence briefing for ${date}.`;
  const svg = articleCard(date, title, desc);
  const outPng = path.join(OG_DIR, `${date}.png`);
  const rendered = svgToPng(svg, outPng);

  // Also keep the SVG for backwards compatibility
  fs.writeFileSync(path.join(OG_DIR, `${date}.svg`), svg);
  console.log(`OG card generated for ${date}`);
}
