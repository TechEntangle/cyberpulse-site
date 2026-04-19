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

function escHtml(str='') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escAttr(str='') {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function encodeTag(tag) {
  return encodeURIComponent(tag).replace(/%20/g, '+');
}

const articleTags = entry.tags.map(tag => `  <meta property="article:tag" content="${escAttr(tag)}" />`).join('\n');
const tagRow = entry.tags.map(tag => `            <a class="tag" href="/archive/?tag=${encodeTag(tag)}">${escHtml(tag)}</a>`).join('\n');
const heroMeta = `            <div class="meta-card">\n              <strong>Confidence</strong>\n              <span>${escHtml(entry.confidence)}</span>\n            </div>\n            <div class="meta-card">\n              <strong>Published</strong>\n              <span>${escHtml(entry.publishedLabel)}</span>\n            </div>\n            <div class="meta-card">\n              <strong>Primary signal</strong>\n              <span>${escHtml(entry.primarySignal)}</span>\n            </div>\n            <div class="meta-card">\n              <strong>Why it matters</strong>\n              <span>${escHtml(entry.whyItMatters)}</span>\n            </div>`;

let body = '';
body += `          <p class="lead">${escHtml(entry.sections[0].blocks[0].paragraphs[0] ? entry.dek : entry.dek)}</p>\n`;
body += `          <p>${escHtml(entry.sections[0].blocks[0].paragraphs[0].startsWith('CISA') ? 'Today’s most useful cyber signal is not flashy, but it is deeply important. CISA has added Apache ActiveMQ vulnerability CVE-2026-34197 to its Known Exploited Vulnerabilities catalog after evidence of active exploitation. On the surface, this looks like another enterprise middleware problem. But the bigger message is more strategic: the half-life of exposure is shrinking. Old weaknesses, widely deployed systems, and public-facing infrastructure are becoming easier to find, easier to validate, and easier to operationalize, which means defenders are losing calendar time even when the underlying bug is not brand new.' : '')}</p>\n`;
body += `          <p>In practice, that changes the executive conversation. This is no longer only about whether a flaw is critical on paper. It is about whether the cost of turning that flaw into an intrusion has dropped low enough that attackers can industrialize it. Once that happens, an overlooked asset in the wrong corner of the environment stops being technical debt and starts being an active business liability.</p>\n`;
for (const section of entry.sections) {
  body += `          <h2 id="${escAttr(section.id)}">${escHtml(section.title)}</h2>\n`;
  for (const block of section.blocks) {
    if (block.kind === 'signal') {
      body += `          <div class="signal">\n            <h3>${escHtml(block.title)}</h3>\n`;
      for (const p of block.paragraphs) body += `            <p>${escHtml(p)}</p>\n`;
      body += `          </div>\n`;
    } else if (block.kind === 'paragraphs') {
      for (const p of block.paragraphs) body += `          <p>${escHtml(p)}</p>\n`;
    } else if (block.kind === 'takeaways') {
      body += `          <div class="takeaways">\n`;
      for (const item of block.items) {
        body += `            <div class="action-box">\n              <h4>${escHtml(item.title)}</h4>\n              <ul>\n`;
        for (const bullet of item.bullets) body += `                <li>${escHtml(bullet)}</li>\n`;
        body += `              </ul>\n            </div>\n`;
      }
      body += `          </div>\n`;
    }
  }
}

const sourceBox = `          <div class="source-box">\n            <div class="meta-kicker">Sources</div>\n            <ol>\n${entry.sources.map(s => `              <li><a href="${escAttr(s.url)}">${escHtml(s.title)}</a></li>`).join('\n')}\n            </ol>\n          </div>`;
const tocItems = entry.sections.map(s => `            <li><a href="#${escAttr(s.id)}">${escHtml(s.title)}</a></li>`).join('\n');
const glanceBullets = entry.atAGlance.bullets.map(b => `            <li>${escHtml(b)}</li>`).join('\n');

let out = template;
out = out.replace(/{{DATE}}/g, entry.date);
out = out.replace(/{{TITLE}}/g, escAttr(entry.title));
out = out.replace(/{{META_DESCRIPTION}}/g, escAttr(entry.metaDescription));
out = out.replace(/{{OG_DESCRIPTION}}/g, escAttr(entry.ogDescription));
out = out.replace(/{{ARTICLE_TAGS}}/g, articleTags);
out = out.replace(/{{ARTICLE_EYEBROW}}/g, `CyberPulse &middot; Edition No. ${entry.edition} &middot; ${entry.date}`);
out = out.replace(/{{TITLE_DISPLAY}}/g, escHtml(entry.title));
out = out.replace(/{{DEK}}/g, escHtml(entry.dek));
out = out.replace(/{{TAG_ROW}}/g, tagRow);
out = out.replace(/{{COVER_SRC}}/g, entry.coverImage);
out = out.replace(/{{COVER_ALT}}/g, escAttr(`CyberPulse editorial cover image for ${entry.title}`));
out = out.replace(/{{HERO_META}}/g, heroMeta);
out = out.replace(/{{BODY_CONTENT}}/g, body.trim());
out = out.replace(/{{SOURCE_BOX}}/g, sourceBox);
out = out.replace(/{{FOOTER_EDITION}}/g, String(entry.edition));
out = out.replace(/{{TOC_ITEMS}}/g, tocItems);
out = out.replace(/{{AT_A_GLANCE_TEXT}}/g, escHtml(entry.atAGlance.text));
out = out.replace(/{{AT_A_GLANCE_BULLETS}}/g, glanceBullets);
out = out.replace(/{{READ_TIME}}/g, escHtml(entry.readTime));
out = out.replace(/{{DISPLAY_DATE}}/g, escHtml(entry.publishedLabel));
out = out.replace(/{{SHARE_URL}}/g, `https://tusharvartak.com/posts/${entry.date}.html`);
out = out.replace(/{{SHARE_TITLE}}/g, encodeURIComponent(entry.title));

fs.writeFileSync(path.join(ROOT, 'posts', `${entry.date}.html`), out);
console.log(path.join(ROOT, 'posts', `${entry.date}.html`));
