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
function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
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
const coverPath = `assets/covers/${date}.png`;
const ogPath = `assets/og/${date}.png`;
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
else if (heroImgMatch[1] !== `/assets/covers/${date}.png`) fail(`article hero uses wrong asset: ${heroImgMatch[1]}`);
else ok('article hero uses cover asset');
if (!postHtml.includes(`https://tusharvartak.com/assets/covers/${date}.png`) && !postHtml.includes(`https://tusharvartak.com/assets/og/${date}.png`)) fail('post social image metadata missing'); else ok('post social image metadata present');

const unresolved = postHtml.match(/\{\{[^}]+\}\}|Replace with|Narrative paragraph|Signal headline|TagName/);
if (unresolved) fail(`post contains unresolved template text: ${unresolved[0]}`); else ok('post contains no unresolved template placeholders');

if (!indexHtml.includes(`href="./posts/${date}.html" data-analytics="hero-panel-click"`)) fail('homepage hero link does not target latest post'); else ok('homepage hero link targets latest post');
if (!indexHtml.includes(`src="./assets/covers/${date}.png"`)) fail('homepage hero image does not target latest cover'); else ok('homepage hero image targets latest cover');
if (title && !indexHtml.includes(title)) fail('homepage missing latest title'); else ok('homepage includes latest title');

if (!archiveHtml.includes(`/posts/${date}.html`)) fail('archive missing latest post'); else ok('archive includes latest post');
if (title && !archiveHtml.includes(title)) fail('archive missing latest title'); else ok('archive includes latest title');
if (!feedXml.includes(`https://tusharvartak.com/posts/${date}.html`)) fail('feed missing latest post'); else ok('feed includes latest post');
if (!feedXml.includes(`https://tusharvartak.com/assets/covers/${date}.png`)) fail('feed missing latest cover enclosure'); else ok('feed includes latest cover enclosure');

process.exit(failures ? 1 : 0);
