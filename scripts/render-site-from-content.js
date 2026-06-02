#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const contentDir = path.join(ROOT, 'content');
const files = fs.existsSync(contentDir) ? fs.readdirSync(contentDir).filter(f => f.endsWith('.json')).sort().reverse() : [];
if (!files.length) {
  console.error('No content manifests found');
  process.exit(1);
}
const entries = files.map(f => JSON.parse(fs.readFileSync(path.join(contentDir, f), 'utf8')));
const latest = entries[0];

function esc(str='') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function attr(str='') {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function encodeTag(tag) {
  return encodeURIComponent(tag).replace(/%20/g, '+');
}

const indexPath = path.join(ROOT, 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');
indexHtml = indexHtml.replace(/<span class="stat-value">\d+<\/span> editions published/, `<span class="stat-value">${entries.length}</span> editions published`);
indexHtml = indexHtml.replace(/Edition No\. \d+ &mdash; [^<]+/, `Edition No. ${latest.edition} &mdash; ${latest.publishedLabel.replace(/^[A-Za-z]+,\s*/, '')}`);
indexHtml = indexHtml.replace(/<a class="btn primary" href="\.\/posts\/[0-9\-]+\.html" data-analytics="cta-read-today">/, `<a class="btn primary" href="./posts/${latest.date}.html" data-analytics="cta-read-today">`);
indexHtml = indexHtml.replace(/<a href="\.\/posts\/[0-9\-]+\.html" data-analytics="hero-panel-click">/, `<a href="./posts/${latest.date}.html" data-analytics="hero-panel-click">`);
const latestCover = latest.coverImage || `/assets/covers/${latest.date}.png`;
const latestCoverRelative = latestCover.startsWith('/') ? `.${latestCover}` : latestCover;
indexHtml = indexHtml.replace(/<img class="hero-cover" src="\.\/assets\/covers\/[0-9\-]+(?:-[A-Za-z0-9]+)?\.png" alt="[^"]+" loading="lazy">/, `<img class="hero-cover" src="${attr(latestCoverRelative)}" alt="CyberPulse cover art for ${attr(latest.publishedLabel.replace(/^[A-Za-z]+,\s*/, ''))}" loading="lazy">`);
indexHtml = indexHtml.replace(/<h2 class="signal-title">[\s\S]*?<\/h2>/, `<h2 class="signal-title">${esc(latest.title)}</h2>`);
indexHtml = indexHtml.replace(/<p class="signal-desc">[\s\S]*?<\/p>/, `<p class="signal-desc">${esc(latest.ogDescription)}</p>`);
const latestTags = latest.tags.map(tag => `            <a class="panel-tag" href="/archive/?tag=${encodeTag(tag)}">${esc(tag)}</a>`).join('\n');
indexHtml = indexHtml.replace(/<div class="panel-tags">[\s\S]*?<\/div>/, `<div class="panel-tags">\n${latestTags}\n          </div>`);
const archiveItems = entries.map(entry => `        <a class="archive-item" href="./posts/${entry.date}.html" data-analytics="archive-click" data-tags="${attr(entry.tags.join(','))}">\n          <div>\n            <div class="archive-date">${esc(entry.publishedLabel.replace(/^[A-Za-z]+,\s*/, ''))} &middot; Edition No. ${entry.edition}</div>\n            <div class="archive-title">${esc(entry.title)}</div>\n            <div class="archive-desc">${esc(entry.ogDescription)}</div>\n          </div>\n          <div class="archive-arrow">&rarr;</div>\n        </a>`).join('\n');
indexHtml = indexHtml.replace(/<div class="archive">[\s\S]*?<\/section>/, `<div class="archive">\n${archiveItems}\n      </div>\n    </section>`);
fs.writeFileSync(indexPath, indexHtml);

const archivePath = path.join(ROOT, 'archive', 'index.html');
let archiveHtml = fs.readFileSync(archivePath, 'utf8');
archiveHtml = archiveHtml.replace(/<strong id="editionTotal">\d+<\/strong>/, `<strong id="editionTotal">${entries.length}</strong>`);
const uniqueTags = [...new Set(entries.flatMap(e => e.tags))];
const filterButtons = ['All', ...uniqueTags].map((tag, i) => i === 0 ? `      <button class="tag-filter active" data-tag="all">All</button>` : `      <button class="tag-filter" data-tag="${attr(tag)}">${esc(tag)}</button>`).join('\n');
archiveHtml = archiveHtml.replace(/<div class="tag-filters" id="tagFilters" role="group" aria-label="Filter by topic">[\s\S]*?<\/div>/, `<div class="tag-filters" id="tagFilters" role="group" aria-label="Filter by topic">\n${filterButtons}\n    </div>`);
const archiveList = entries.map(entry => `      <a class="item" href="/posts/${entry.date}.html" data-tags="${attr(entry.tags.join(','))}" data-title="${attr(entry.title)}" data-desc="${attr(entry.ogDescription)}" data-analytics="archive-click">\n        <div>\n          <div class="item-date">${esc(entry.publishedLabel.replace(/^[A-Za-z]+,\s*/, ''))} &middot; Edition No. ${entry.edition}</div>\n          <div class="item-title">${esc(entry.title)}</div>\n          <div class="item-desc">${esc(entry.ogDescription)}</div>\n          <div class="item-tags">\n${entry.tags.map(t => `            <span class="item-tag">${esc(t)}</span>`).join('\n')}\n          </div>\n        </div>\n        <div class="item-arrow">&rarr;</div>\n      </a>`).join('\n');
archiveHtml = archiveHtml.replace(/<div class="archive-list" id="archiveList">[\s\S]*?<\/div>\n\n    <div class="no-results"/, `<div class="archive-list" id="archiveList">\n${archiveList}\n    </div>\n\n    <div class="no-results"`);
fs.writeFileSync(archivePath, archiveHtml);

const feedPath = path.join(ROOT, 'feed.xml');
const latestPubDate = new Date(`${latest.date}T06:00:00Z`).toUTCString().replace('GMT', '+0000');
const feedItems = entries.map(entry => {
  const pubDate = new Date(`${entry.date}T06:00:00Z`).toUTCString().replace('GMT', '+0000');
  return `    <item>\n      <title>${esc(entry.title)}</title>\n      <link>https://tusharvartak.com/posts/${entry.date}.html</link>\n      <guid isPermaLink="true">https://tusharvartak.com/posts/${entry.date}.html</guid>\n      <pubDate>${pubDate}</pubDate>\n      <dc:creator>Tushar Vartak</dc:creator>\n      <description>${esc(entry.ogDescription)}</description>\n      <enclosure url="https://tusharvartak.com${entry.coverImage}" type="image/png" length="0"/>\n    </item>`;
}).join('\n');
const feedXml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">\n  <channel>\n    <title>CyberPulse</title>\n    <link>https://tusharvartak.com</link>\n    <description>Executive cyber intelligence briefings on cyber risk, AI threats, infrastructure exposure, and board-level decision-making.</description>\n    <language>en-us</language>\n    <lastBuildDate>${latestPubDate}</lastBuildDate>\n    <atom:link href="https://tusharvartak.com/feed.xml" rel="self" type="application/rss+xml"/>\n    <image>\n      <url>https://tusharvartak.com/assets/og/default.png</url>\n      <title>CyberPulse</title>\n      <link>https://tusharvartak.com</link>\n    </image>\n${feedItems}\n  </channel>\n</rss>\n`;
fs.writeFileSync(feedPath, feedXml);

console.log('Rendered homepage, archive, and feed from content manifests');
