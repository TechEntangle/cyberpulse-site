#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const date = process.argv[2];
if (!date) {
  console.error('Usage: node scripts/verify-live.js YYYY-MM-DD');
  process.exit(1);
}
const contentPath = path.join(ROOT, 'content', `${date}.json`);
if (!fs.existsSync(contentPath)) {
  console.error(`Missing content manifest: ${contentPath}`);
  process.exit(1);
}
const entry = JSON.parse(fs.readFileSync(contentPath, 'utf8'));

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    }).on('error', reject);
  });
}
function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failures++;
}
function ok(msg) {
  console.log(`OK: ${msg}`);
}
let failures = 0;

(async () => {
  const postUrl = `https://tusharvartak.com/posts/${date}.html`;
  const coverUrl = `https://tusharvartak.com${entry.coverImage}`;
  const homeUrl = 'https://tusharvartak.com/';

  const [post, cover, home] = await Promise.all([fetch(postUrl), fetch(coverUrl), fetch(homeUrl)]);

  if (post.status !== 200) fail(`post returned ${post.status}`); else ok('live post reachable');
  if (cover.status !== 200) fail(`cover returned ${cover.status}`); else ok('live cover reachable');
  if (home.status !== 200) fail(`homepage returned ${home.status}`); else ok('homepage reachable');

  if (!post.body.includes(entry.coverImage)) fail('live post does not reference expected cover image'); else ok('live post references expected cover');
  if (!post.body.includes(entry.title)) fail('live post missing expected title'); else ok('live post has expected title');
  if (!home.body.includes(`./posts/${date}.html`) && !home.body.includes(`/posts/${date}.html`)) fail('homepage missing latest post link'); else ok('homepage includes latest post link');
  if (!home.body.includes(`assets/covers/${date}.png`)) fail('homepage missing latest cover'); else ok('homepage includes latest cover');

  process.exit(failures ? 1 : 0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
