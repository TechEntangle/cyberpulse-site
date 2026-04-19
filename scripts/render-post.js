#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const [,, date, sourceHtmlPath] = process.argv;
if (!date || !sourceHtmlPath) {
  console.error('Usage: node scripts/render-post.js YYYY-MM-DD path/to/source.html');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const templatePath = path.join(ROOT, 'templates', 'post.html');
const srcPath = path.resolve(sourceHtmlPath);
const outPath = path.join(ROOT, 'posts', `${date}.html`);

const template = fs.readFileSync(templatePath, 'utf8');
const source = fs.readFileSync(srcPath, 'utf8');

function pick(re, fallback = '') {
  const m = source.match(re);
  return m ? m[1].trim() : fallback;
}
function escAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function slugify(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const title = pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i, pick(/<title>(.*?)<\/title>/i, `CyberPulse ${date}`)).replace(/<[^>]+>/g, '').replace(/^CyberPulse\s*[|—-]\s*/i, '').trim();
const dek = pick(/<p class="dek">([\s\S]*?)<\/p>/i, '').replace(/<[^>]+>/g, '').trim();
const metaDescription = pick(/<meta\s+name="description"\s+content="([^"]+)"/i, dek);
const ogDescription = pick(/<meta\s+property="og:description"\s+content="([^"]+)"/i, dek || metaDescription);

const dateObj = new Date(`${date}T06:00:00Z`);
const displayDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

const tags = [...source.matchAll(/<a class="tag" href="\/archive\/\?tag=([^"]+)">([\s\S]*?)<\/a>/g)].map(m => ({ href: decodeURIComponent(m[1]), label: m[2].replace(/<[^>]+>/g, '').trim() }));
const articleTags = tags.map(t => `  <meta property="article:tag" content="${escAttr(t.label)}" />`).join('\n');
const tagRow = tags.map(t => `            <a class="tag" href="/archive/?tag=${encodeURIComponent(t.label).replace(/%20/g, '+')}">${escHtml(t.label)}</a>`).join('\n');

const coverMatch = source.match(/<img class="article-cover" src="([^"]+)" alt="([^"]*)"/i);
const coverSrc = coverMatch ? coverMatch[1] : `/assets/covers/${date}.png`;
const coverAlt = coverMatch ? coverMatch[2] : `CyberPulse editorial cover image for ${title}`;

const metaCards = [...source.matchAll(/<div class="meta-card">([\s\S]*?)<\/div>\s*<\/div>?/g)];
let heroMeta = pick(/<div class="hero-meta">([\s\S]*?)<\/div>\s*<\/div>/i, '');
if (!heroMeta) {
  const m = source.match(/<div class="hero-meta">([\s\S]*?)<\/div>\s*<p class="lead">/i);
  heroMeta = m ? m[1] : '';
}

const leadParas = [];
const leadMatch = source.match(/<p class="lead">([\s\S]*?)<\/p>([\s\S]*?)<h2/i);
let introHtml = '';
if (leadMatch) {
  introHtml = `<p class="lead">${leadMatch[1].trim()}</p>`;
  const extra = leadMatch[2].match(/<p>([\s\S]*?)<\/p>/g) || [];
  introHtml += '\n          ' + extra.join('\n          ');
}

const h2Matches = [...source.matchAll(/<h2>([\s\S]*?)<\/h2>/g)];
const toc = h2Matches.map(m => {
  const text = m[1].replace(/<[^>]+>/g, '').trim();
  return { text, id: slugify(text) };
});

let body = source.match(/<p class="lead">[\s\S]*?<section class="sources/i);
body = body ? body[0] : source;
body = body.replace(/<p class="lead">[\s\S]*?<\/p>/, introHtml.split('\n')[0]);
body = body.replace(/<section class="sources[\s\S]*$/i, '');
body = body.replace(/<h2>([\s\S]*?)<\/h2>/g, (_, t) => `<h2 id="${slugify(t.replace(/<[^>]+>/g, '').trim())}">${t}</h2>`);
body = body.replace(/<div class="action">/g, '<div class="action-box">');
body = body.replace(/<h4>/g, '<h4>').replace(/<\/div>\s*<div class="action-box">/g, '</div>\n            <div class="action-box">');
body = body.replace(/<section class="fade">\s*<div class="action-box">/g, '<h2 id="takeaways">Takeaways</h2>\n          <div class="takeaways">\n            <div class="action-box">');
body = body.replace(/<\/div>\s*<\/section>/g, '</div>');
body = body.replace(/<div class="signal">/g, '<div class="signal">');
body = body.replace(/ class="fade"/g, '');
body = body.replace(/<section>/g, '').replace(/<\/section>/g, '');
body = body.replace(/<section class="fade">/g, '');
body = body.replace(/<div class="action-box">([\s\S]*?)<\/div>\s*<div class="action-box">([\s\S]*?)<\/div>\s*<div class="action-box">([\s\S]*?)<\/div>/, '<div class="takeaways"><div class="action-box">$1</div><div class="action-box">$2</div><div class="action-box">$3</div>');
if (!body.includes('class="takeaways"') && body.includes('class="action-box"')) {
  body = body.replace(/(<div class="action-box">[\s\S]*)/, '<h2 id="takeaways">Takeaways</h2>\n          <div class="takeaways">$1');
  body += '\n          </div>';
}

const sourcesInner = pick(/<section class="sources[\s\S]*?<ol>([\s\S]*?)<\/ol>[\s\S]*?<\/section>/i, '');
const sourceBox = `<div class="source-box">\n            <div class="meta-kicker">Sources</div>\n            <ol>${sourcesInner}</ol>\n          </div>`;

const glanceBullets = tags.slice(0, 3).map(t => `<li>${escHtml(t.label)} is a key theme in this edition.</li>`).join('');
const tocHtml = toc.map(item => `<li><a href="#${item.id}">${escHtml(item.text)}</a></li>`).join('');
const editionNo = Number(date.slice(-2)) - 17;

let out = template;
out = out.replace(/{{DATE}}/g, date);
out = out.replace(/{{TITLE}}/g, escAttr(title));
out = out.replace(/{{META_DESCRIPTION}}/g, escAttr(metaDescription || ogDescription));
out = out.replace(/{{OG_DESCRIPTION}}/g, escAttr(ogDescription || metaDescription));
out = out.replace(/{{ARTICLE_TAGS}}/g, articleTags);
out = out.replace(/{{ARTICLE_EYEBROW}}/g, `CyberPulse &middot; Edition No. ${editionNo} &middot; ${dateObj.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric', timeZone:'UTC' }).toUpperCase()}`);
out = out.replace(/{{TITLE_DISPLAY}}/g, escHtml(title));
out = out.replace(/{{DEK}}/g, escHtml(dek));
out = out.replace(/{{TAG_ROW}}/g, tagRow);
out = out.replace(/{{COVER_SRC}}/g, coverSrc);
out = out.replace(/{{COVER_ALT}}/g, escAttr(coverAlt));
out = out.replace(/{{HERO_META}}/g, heroMeta.trim());
out = out.replace(/{{BODY_CONTENT}}/g, body.trim());
out = out.replace(/{{SOURCE_BOX}}/g, sourceBox);
out = out.replace(/{{FOOTER_EDITION}}/g, String(editionNo));
out = out.replace(/{{TOC_ITEMS}}/g, tocHtml);
out = out.replace(/{{AT_A_GLANCE_TEXT}}/g, escHtml(ogDescription || metaDescription));
out = out.replace(/{{AT_A_GLANCE_BULLETS}}/g, glanceBullets);
out = out.replace(/{{READ_TIME}}/g, '6 min read');
out = out.replace(/{{DISPLAY_DATE}}/g, escHtml(displayDate));
out = out.replace(/{{SHARE_URL}}/g, `https://tusharvartak.com/posts/${date}.html`);
out = out.replace(/{{SHARE_TITLE}}/g, encodeURIComponent(title));

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, out);
console.log(outPath);
