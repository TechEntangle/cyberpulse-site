#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const date = process.argv[2];
if (!date) {
  console.error('Usage: node scripts/build-from-content.js YYYY-MM-DD');
  process.exit(1);
}
const contentPath = path.join(ROOT, 'content', `${date}.json`);
if (!fs.existsSync(contentPath)) {
  console.error(`Missing content manifest: ${contentPath}`);
  process.exit(1);
}
const entry = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
const template = fs.readFileSync(path.join(ROOT, 'templates', 'post.html'), 'utf8');

function escHtml(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escAttr(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function encodeTag(tag) {
  return encodeURIComponent(tag).replace(/%20/g, '+');
}
function normalizeList(list, expectedLength = 0) {
  const arr = Array.isArray(list) ? list : [];
  if (expectedLength <= 0) return arr;
  return Array.from({ length: expectedLength }, (_, i) => arr[i] || '');
}

const articleTags = entry.tags.map(tag => `  <meta property="article:tag" content="${escAttr(tag)}" />`).join('\n');
const tagRow = entry.tags.map(tag => `            <a class="tag" href="/archive/?tag=${encodeTag(tag)}">${escHtml(tag)}</a>`).join('\n');

const leadParagraph = entry.leadParagraph || entry.sections?.[0]?.blocks?.[0]?.paragraphs?.[0] || entry.dek || '';
const bodyParts = [];
const takeawaysSection = entry.sections.find(section => section.id === 'takeaways');
const blindSpotSection = entry.sections.find(section => section.id === 'blind-spot');
const contentSections = entry.sections.filter(section => !['takeaways', 'blind-spot'].includes(section.id));

for (const section of contentSections) {
  bodyParts.push(`          <h2 id="${escAttr(section.id)}">${escHtml(section.title)}</h2>`);
  for (const block of section.blocks || []) {
    if (block.kind === 'signal') {
      bodyParts.push(`          <div class="signal">`);
      bodyParts.push(`            <h3>${escHtml(block.title)}</h3>`);
      for (const p of block.paragraphs || []) bodyParts.push(`            <p>${escHtml(p)}</p>`);
      bodyParts.push(`          </div>`);
    } else if (block.kind === 'paragraphs') {
      for (const p of block.paragraphs || []) bodyParts.push(`          <p>${escHtml(p)}</p>`);
    }
  }
}

const takeawayItems = takeawaysSection?.blocks?.find(block => block.kind === 'takeaways')?.items || [];
const boardTakeaway = normalizeList(takeawayItems[0]?.bullets, 2);
const cisoActions = normalizeList(takeawayItems[1]?.bullets, 3);
const boardDemands = normalizeList(takeawayItems[2]?.bullets, 3);
const riskRethink = normalizeList(takeawayItems[3]?.bullets, 3);
const blindSpotParagraphs = (blindSpotSection?.blocks || [])
  .filter(block => block.kind === 'paragraphs')
  .flatMap(block => block.paragraphs || [])
  .map(p => `          <p>${escHtml(p)}</p>`)
  .join('\n');
const sourceList = entry.sources.map(s => `              <li><a href="${escAttr(s.url)}">${escHtml(s.title)}</a></li>`).join('\n');
const tocItems = entry.sections.map(s => `            <li><a href="#${escAttr(s.id)}">${escHtml(s.title)}</a></li>`).join('\n');
const glanceBullets = entry.atAGlance.bullets.map(b => `            <li>${escHtml(b)}</li>`).join('\n');

let out = template;
out = out.replace(/{{DATE}}/g, entry.date);
out = out.replace(/{{TITLE}}/g, escAttr(entry.title));
out = out.replace(/{{META_DESCRIPTION}}/g, escAttr(entry.metaDescription));
out = out.replace(/{{OG_DESCRIPTION}}/g, escAttr(entry.ogDescription));
out = out.replace(/{{ARTICLE_TAGS}}/g, articleTags);
out = out.replace(/{{EDITION_NUMBER}}/g, String(entry.edition));
out = out.replace(/{{DISPLAY_DATE}}/g, escHtml(entry.publishedLabel));
out = out.replace(/{{READ_TIME}}/g, escHtml(entry.readTime || '6 min read'));
out = out.replace(/{{DEK}}/g, escHtml(entry.dek));
out = out.replace(/{{TAG_SPANS}}/g, tagRow);
out = out.replace(/{{CONFIDENCE}}/g, escHtml(entry.confidence));
out = out.replace(/{{FULL_DATE}}/g, escHtml(entry.publishedLabel));
out = out.replace(/{{PRIMARY_SIGNAL}}/g, escHtml(entry.primarySignal));
out = out.replace(/{{WHY_IT_MATTERS}}/g, escHtml(entry.whyItMatters));
out = out.replace(/{{LEAD_PARAGRAPH}}/g, escHtml(leadParagraph));
out = out.replace(/{{BODY_PARAGRAPHS}}/g, bodyParts.join('\n'));
out = out.replace(/{{BOARD_TAKEAWAY_1}}/g, escHtml(boardTakeaway[0]));
out = out.replace(/{{BOARD_TAKEAWAY_2}}/g, escHtml(boardTakeaway[1]));
out = out.replace(/{{CISO_ACTION_1}}/g, escHtml(cisoActions[0]));
out = out.replace(/{{CISO_ACTION_2}}/g, escHtml(cisoActions[1]));
out = out.replace(/{{CISO_ACTION_3}}/g, escHtml(cisoActions[2]));
out = out.replace(/{{BOARD_DEMAND_1}}/g, escHtml(boardDemands[0]));
out = out.replace(/{{BOARD_DEMAND_2}}/g, escHtml(boardDemands[1]));
out = out.replace(/{{BOARD_DEMAND_3}}/g, escHtml(boardDemands[2]));
out = out.replace(/{{RISK_RETHINK_1}}/g, escHtml(riskRethink[0]));
out = out.replace(/{{RISK_RETHINK_2}}/g, escHtml(riskRethink[1]));
out = out.replace(/{{RISK_RETHINK_3}}/g, escHtml(riskRethink[2]));
out = out.replace(/{{BLIND_SPOT_PARAGRAPHS}}/g, blindSpotParagraphs);
out = out.replace(/{{SOURCE_LIST}}/g, sourceList);
out = out.replace(/{{TOC_LIST}}/g, tocItems);
out = out.replace(/{{AT_A_GLANCE}}/g, escHtml(entry.atAGlance.text));
out = out.replace(/{{GLANCE_BULLETS}}/g, glanceBullets);
out = out.replace(/{{ENCODED_URL}}/g, escAttr(`https://tusharvartak.com/posts/${entry.date}.html`));
out = out.replace(/{{ENCODED_TITLE}}/g, encodeURIComponent(entry.title));

fs.writeFileSync(path.join(ROOT, 'posts', `${entry.date}.html`), out);
console.log(path.join(ROOT, 'posts', `${entry.date}.html`));
