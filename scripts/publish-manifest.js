#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const date = process.argv[2];
if (!date) {
  console.error('Usage: node scripts/publish-manifest.js YYYY-MM-DD');
  process.exit(1);
}
const contentPath = path.join(ROOT, 'content', `${date}.json`);
if (!fs.existsSync(contentPath)) {
  console.error(`Missing content manifest: ${contentPath}`);
  process.exit(1);
}
const entry = JSON.parse(fs.readFileSync(contentPath, 'utf8'));

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', env: process.env, ...opts });
  if (res.status !== 0) process.exit(res.status || 1);
}

if (!fs.existsSync(path.join(ROOT, 'assets', 'covers', `${date}.png`))) {
  const promptPath = path.join(ROOT, `cover-prompt-${date}.txt`);
  if (!fs.existsSync(promptPath)) {
    const prompt = `Premium editorial hero image for a cybersecurity intelligence briefing. Theme: ${entry.title}. ${entry.ogDescription} Dark premium palette, sophisticated magazine-cover quality, no text, no logos, no watermark.`;
    fs.writeFileSync(promptPath, prompt);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY required to generate missing cover');
    process.exit(1);
  }
  run('node', [path.join(ROOT, 'scripts', 'generate-cover.js'), date, promptPath]);
}

run('node', [path.join(ROOT, 'scripts', 'generate-og.js'), date, entry.title, entry.ogDescription]);
run('node', [path.join(ROOT, 'scripts', 'build-from-content.js'), date]);
run('node', [path.join(ROOT, 'scripts', 'render-site-from-content.js')]);
run('node', [path.join(ROOT, 'scripts', 'validate-publish.js'), date]);

run('git', ['add', `content/${date}.json`, `posts/${date}.html`, `assets/covers/${date}.png`, `assets/og/${date}.png`, `assets/og/${date}.svg`, 'index.html', 'archive/index.html', 'feed.xml', 'scripts/build-from-content.js', 'scripts/render-site-from-content.js', 'scripts/validate-publish.js', 'scripts/verify-live.js', 'scripts/publish-manifest.js']);
run('git', ['commit', '-m', `Publish ${date}: ${entry.title}`], { stdio: 'inherit' });
run('git', ['push']);

console.log(`Published manifest-driven edition ${date}`);
