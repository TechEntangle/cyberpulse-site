#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const date = process.argv[2];
if (!date) {
  console.error('Usage: node scripts/validate-publish.js YYYY-MM-DD');
  process.exit(1);
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function assetPath(rel) {
  return String(rel).split('?')[0].replace(/^\//, '');
}
function exists(rel) {
  return fs.existsSync(path.join(ROOT, assetPath(rel)));
}
function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failures++;
}
function ok(msg) {
  console.log(`OK: ${msg}`);
}
let failures = 0;

const postPath = `posts/${date}.html`;
let expectedCoverPath = `assets/covers/${date}.png`;
let expectedOgPath = `assets/og/${date}.png`;
const contentPath = path.join(ROOT, 'content', `${date}.json`);
if (fs.existsSync(contentPath)) {
  const entry = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
  expectedCoverPath = assetPath(entry.coverImage || `/assets/covers/${date}.png`);
  expectedOgPath = assetPath(entry.ogImage || `/assets/og/${date}.png`);
}
const coverPath = expectedCoverPath;
const ogPath = expectedOgPath;
if (!exists(postPath)) fail(`missing ${postPath}`); else ok(`found ${postPath}`);
if (!exists(coverPath)) fail(`missing ${coverPath}`); else ok(`found ${coverPath}`);
if (!exists(ogPath)) fail(`missing ${ogPath}`); else ok(`found ${ogPath}`);

const indexHtml = read('index.html');
const archiveHtml = read('archive/index.html');
const feedXml = read('feed.xml');
const postHtml = read(postPath);

const titleMatch = postHtml.match(/<h1>(.*?)<\/h1>/s);
const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : null;
if (!title) fail('could not extract title from post'); else ok(`post title extracted: ${title}`);

const heroImgMatch = postHtml.match(/<img class="article-cover" src="([^"]+)"/);
if (!heroImgMatch) fail('article hero image tag missing');
else if (assetPath(heroImgMatch[1]) !== coverPath) fail(`article hero uses wrong asset: ${heroImgMatch[1]}`);
else ok('article hero uses cover asset');
if (!postHtml.includes(`https://tusharvartak.com/${coverPath}`) && !postHtml.includes(`https://tusharvartak.com/${ogPath}`)) fail('post social image metadata missing'); else ok('post social image metadata present');

const unresolved = postHtml.match(/\{\{[^}]+\}\}|Replace with|Narrative paragraph|Signal headline|TagName/);
if (unresolved) fail(`post contains unresolved template text: ${unresolved[0]}`); else ok('post contains no unresolved template placeholders');

if (!indexHtml.includes(`href="./posts/${date}.html" data-analytics="hero-panel-click"`)) fail('homepage hero link does not target latest post'); else ok('homepage hero link targets latest post');
if (!indexHtml.includes(`src="./${coverPath}`)) fail('homepage hero image does not target latest cover'); else ok('homepage hero image targets latest cover');
if (title && !indexHtml.includes(title)) fail('homepage missing latest title'); else ok('homepage includes latest title');

if (!archiveHtml.includes(`/posts/${date}.html`)) fail('archive missing latest post'); else ok('archive includes latest post');
if (title && !archiveHtml.includes(title)) fail('archive missing latest title'); else ok('archive includes latest title');
if (!feedXml.includes(`https://tusharvartak.com/posts/${date}.html`)) fail('feed missing latest post'); else ok('feed includes latest post');
if (!feedXml.includes(`https://tusharvartak.com/${coverPath}`)) fail('feed missing latest cover enclosure'); else ok('feed includes latest cover enclosure');

process.exit(failures ? 1 : 0);
