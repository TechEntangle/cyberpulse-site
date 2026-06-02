#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const [,, date, promptFile] = process.argv;
if (!date) {
  console.error('Usage: node scripts/generate-cover.js YYYY-MM-DD [prompt-file]');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const outDir = path.join(ROOT, 'assets', 'covers');
const promptDir = path.join(ROOT, 'assets', 'cover-prompts');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(promptDir, { recursive: true });

function esc(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function readContentManifest() {
  const p = path.join(ROOT, 'content', `${date}.json`);
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function themeFromContent(entry) {
  const text = [
    entry.title,
    entry.dek,
    entry.primarySignal,
    entry.whyItMatters,
    ...(entry.tags || []),
  ].join(' ').toLowerCase();
  const themes = [];
  if (/supply|package|dependency|build|software|registry/.test(text)) themes.push('supply-chain');
  if (/identity|directory|credential|privilege|access/.test(text)) themes.push('identity');
  if (/gateway|remote|session|vpn|edge/.test(text)) themes.push('gateway');
  if (/ai|artificial intelligence|agent|workflow|connector|prompt/.test(text)) themes.push('ai-workflow');
  if (/third.party|supplier|partner|adjacency/.test(text)) themes.push('third-party');
  if (!themes.length) themes.push('control-plane');
  return themes.slice(0, 5);
}

function buildPrompt(entry, themes) {
  const title = entry.title || 'CyberPulse Daily';
  const dek = entry.dek || entry.primarySignal || 'executive cyber risk and control-plane security';
  const primarySignal = entry.primarySignal || dek;
  const whyItMatters = entry.whyItMatters || '';
  const tags = (entry.tags || themes).join(', ');
  return [
    `Create a premium editorial hero image for a CyberPulse Daily article titled "${title}".`,
    `The article thesis is: ${dek}`,
    `Primary signal: ${primarySignal}`,
    whyItMatters ? `Why it matters: ${whyItMatters}` : '',
    `Themes to visualize: ${themes.join(', ')}. Topic tags: ${tags}.`,
    'Make it look like a high-end cyber-intelligence magazine commission, not an icon set or abstract wallpaper.',
    'Use one strong scene/metaphor: an enterprise trust control room / digital infrastructure command layer where software supply-chain packages, identity directories, remote access gateways, AI workflow agents, and supplier access routes converge around a vulnerable but protected control plane.',
    'Style: cinematic 3D editorial illustration with realistic depth, volumetric light, glassy translucent interface layers, precise cyber-forensics detail, premium Bloomberg/FT-style restraint, dark navy-black base, warm amber/gold CyberPulse light, small red risk accents, no clutter.',
    'Composition: 16:9 article header, wide horizontal crop, strong central focal point with meaningful surrounding details, usable negative space near edges, sophisticated contrast, publication-ready at 1200x630.',
    'Avoid: flat vector icons, generic network dots, childish sci-fi UI, stock-photo hackers, people, flags, logos, text, letters, numbers, watermarks, vendor marks, victim names, country symbolism.'
  ].filter(Boolean).join(' ');
}

async function generateWithOpenAI(prompt, out) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.CYBERPULSE_IMAGE_MODEL || 'dall-e-3',
      prompt,
      size: '1792x1024',
      quality: 'hd',
      n: 1,
      response_format: 'b64_json'
    })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json, null, 2));
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image returned');
  fs.writeFileSync(out, Buffer.from(b64, 'base64'));
  return 'openai';
}

function motifSvg(theme, x, y, scale = 1) {
  const gold = '#F0B44A';
  const cream = '#F5EFE6';
  const red = '#C8372D';
  const blue = '#7AA7FF';
  const muted = '#8F887B';
  if (theme === 'supply-chain') {
    return `<g transform="translate(${x} ${y}) scale(${scale})" opacity="0.95">
      <path d="M0 -26 45 0 0 26 -45 0Z" fill="#171B26" stroke="${gold}" stroke-opacity="0.65" stroke-width="2"/>
      <path d="M0 -26 0 26M-45 0 0 26 45 0" stroke="${gold}" stroke-opacity="0.28" stroke-width="2"/>
      <circle cx="0" cy="0" r="5" fill="${red}" opacity="0.85"/>
    </g>`;
  }
  if (theme === 'identity') {
    return `<g transform="translate(${x} ${y}) scale(${scale})" opacity="0.95">
      <circle cx="0" cy="0" r="34" fill="#121722" stroke="${blue}" stroke-opacity="0.55" stroke-width="2"/>
      ${[-55,55,0,0].map((v,i)=> i<2 ? `<line x1="0" y1="0" x2="${v}" y2="${i?24:-24}" stroke="${blue}" stroke-opacity="0.35"/>` : '').join('')}
      <circle cx="0" cy="0" r="9" fill="${cream}" opacity="0.82"/>
      <circle cx="-55" cy="-24" r="7" fill="${gold}"/><circle cx="55" cy="24" r="7" fill="${gold}"/><circle cx="42" cy="-36" r="5" fill="${muted}"/>
    </g>`;
  }
  if (theme === 'gateway') {
    return `<g transform="translate(${x} ${y}) scale(${scale})" opacity="0.95">
      <rect x="-48" y="-30" width="96" height="60" rx="18" fill="#121722" stroke="${gold}" stroke-opacity="0.5" stroke-width="2"/>
      <path d="M-18 0h36M8 -12 22 0 8 12" stroke="${red}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M-58 -42C-20 -62 22 -62 58 -42" stroke="${gold}" stroke-opacity="0.24" stroke-width="2" fill="none"/>
    </g>`;
  }
  if (theme === 'ai-workflow') {
    return `<g transform="translate(${x} ${y}) scale(${scale})" opacity="0.95">
      <rect x="-40" y="-36" width="80" height="72" rx="22" fill="#121722" stroke="${blue}" stroke-opacity="0.55" stroke-width="2"/>
      <path d="M-18 -8C-18 -24 18 -24 18 -8M-18 8C-18 24 18 24 18 8M-24 0h48M0 -24v48" stroke="${blue}" stroke-opacity="0.7" stroke-width="3" fill="none" stroke-linecap="round"/>
      <circle cx="-24" cy="0" r="4" fill="${gold}"/><circle cx="24" cy="0" r="4" fill="${red}"/>
    </g>`;
  }
  return `<g transform="translate(${x} ${y}) scale(${scale})" opacity="0.95">
    <circle cx="0" cy="0" r="42" fill="#121722" stroke="${gold}" stroke-opacity="0.55" stroke-width="2"/>
    <path d="M0 -30v60M-30 0h60M-21 -21l42 42M21 -21-21 42" stroke="${gold}" stroke-opacity="0.42" stroke-width="2"/>
    <circle cx="0" cy="0" r="8" fill="${red}"/>
  </g>`;
}

function generateFallbackSvg(entry, themes) {
  const seed = [...date].reduce((a, c) => a + c.charCodeAt(0), 0);
  const positions = [[270,310,1.05],[450,205,.86],[640,350,1.18],[830,235,.92],[980,385,.82]];
  const motifs = positions.map((p, i) => motifSvg(themes[i % themes.length], p[0] + ((seed+i*17)%35-17), p[1] + ((seed+i*23)%31-15), p[2])).join('\n');
  const lines = Array.from({ length: 34 }, (_, i) => {
    const x1 = 130 + ((i * 73 + seed) % 920);
    const y1 = 95 + ((i * 47 + seed) % 430);
    const x2 = 600 + ((i * 53 + seed) % 380) - 190;
    const y2 = 315 + ((i * 37 + seed) % 240) - 120;
    const color = i % 5 === 0 ? '#C8372D' : '#F0B44A';
    return `<path d="M${x1} ${y1} C${(x1+x2)/2} ${y1}, ${(x1+x2)/2} ${y2}, ${x2} ${y2}" stroke="${color}" stroke-opacity="${i%5===0 ? .16 : .12}" stroke-width="1.5" fill="none"/>`;
  }).join('\n');
  const dots = Array.from({ length: 62 }, (_, i) => {
    const x = 80 + ((i * 61 + seed * 3) % 1040);
    const y = 70 + ((i * 43 + seed * 5) % 500);
    const r = 1.5 + ((i + seed) % 4) * .6;
    const color = i % 7 === 0 ? '#C8372D' : (i % 3 === 0 ? '#F5EFE6' : '#F0B44A');
    return `<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="${color}" opacity="${i%7===0 ? .42 : .28}"/>`;
  }).join('\n');
  const title = esc(entry.title || 'Control-plane risk');
  return `<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="#07080B"/>
    <defs>
      <radialGradient id="core" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(650 315) rotate(90) scale(250 410)">
        <stop stop-color="#F0B44A" stop-opacity="0.32"/><stop offset="0.42" stop-color="#C8372D" stop-opacity="0.14"/><stop offset="1" stop-color="#07080B" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="panel" x1="60" y1="40" x2="1140" y2="590" gradientUnits="userSpaceOnUse">
        <stop stop-color="#1A1D28"/><stop offset="1" stop-color="#090B10"/>
      </linearGradient>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <rect x="40" y="40" width="1120" height="550" rx="34" fill="url(#panel)" stroke="rgba(255,255,255,0.10)"/>
    <rect x="40" y="40" width="1120" height="550" rx="34" fill="url(#core)"/>
    ${lines}
    ${dots}
    <g filter="url(#glow)"><circle cx="650" cy="315" r="58" fill="#F0B44A" opacity="0.28"/><circle cx="650" cy="315" r="24" fill="#F5EFE6" opacity="0.78"/><circle cx="650" cy="315" r="9" fill="#C8372D" opacity="0.92"/></g>
    ${motifs}
    <path d="M92 520 C300 470 440 548 650 505 C830 468 956 492 1105 452" stroke="#F0B44A" stroke-opacity="0.18" stroke-width="2" fill="none"/>
  </svg>`;
}

function renderSvgToPng(svg, out) {
  const svgPath = out.replace(/\.png$/, '.svg');
  fs.writeFileSync(svgPath, svg);
  execSync(`rsvg-convert -w 1200 -h 630 -o "${out}" "${svgPath}"`, { stdio: 'pipe' });
  return svgPath;
}

async function main() {
  const entry = readContentManifest();
  const themes = themeFromContent(entry);
  const prompt = promptFile ? fs.readFileSync(promptFile, 'utf8').trim() : buildPrompt(entry, themes);
  const out = path.join(outDir, `${date}.png`);
  const promptOut = path.join(promptDir, `${date}.txt`);
  fs.writeFileSync(promptOut, prompt + '\n', 'utf8');

  if (process.env.OPENAI_API_KEY) {
    try {
      const provider = await generateWithOpenAI(prompt, out);
      console.log(JSON.stringify({ date, provider, output: out, prompt: promptOut, themes }, null, 2));
      return;
    } catch (err) {
      if (!process.env.CYBERPULSE_ALLOW_PROCEDURAL_COVER) {
        throw new Error(`OpenAI image generation failed and procedural fallback is disabled for publish-quality covers: ${err.message}`);
      }
      console.error(`OpenAI image generation failed; CYBERPULSE_ALLOW_PROCEDURAL_COVER is set, falling back to procedural SVG: ${err.message}`);
    }
  } else if (!process.env.CYBERPULSE_ALLOW_PROCEDURAL_COVER) {
    throw new Error(`No publish-quality image provider configured. Set OPENAI_API_KEY (recommended) or set CYBERPULSE_ALLOW_PROCEDURAL_COVER=1 only for temporary drafts. Prompt saved to ${promptOut}`);
  }

  const svg = generateFallbackSvg(entry, themes);
  const svgPath = renderSvgToPng(svg, out);
  console.log(JSON.stringify({ date, provider: 'procedural-svg-draft', output: out, svg: svgPath, prompt: promptOut, themes }, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
