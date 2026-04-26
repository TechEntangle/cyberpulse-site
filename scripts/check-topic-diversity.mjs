#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const date = process.argv[2];
if (!date) {
  console.error('Usage: node scripts/check-topic-diversity.mjs YYYY-MM-DD');
  process.exit(1);
}

const ROOT = path.resolve(process.cwd());
const contentDir = path.join(ROOT, 'content');
const targetPath = path.join(contentDir, `${date}.json`);
if (!fs.existsSync(targetPath)) {
  console.error(`Missing manifest: ${targetPath}`);
  process.exit(1);
}

const target = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
const others = fs.readdirSync(contentDir)
  .filter(f => f.endsWith('.json') && f !== `${date}.json`)
  .sort()
  .slice(-3)
  .map(f => JSON.parse(fs.readFileSync(path.join(contentDir, f), 'utf8')));

function tokenize(value = '') {
  return new Set(String(value).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3));
}

function overlapRatio(a, b) {
  const aa = tokenize(a);
  const bb = tokenize(b);
  if (!aa.size || !bb.size) return 0;
  let shared = 0;
  for (const word of aa) if (bb.has(word)) shared++;
  return shared / Math.min(aa.size, bb.size);
}

const targetText = `${target.title} ${target.primarySignal} ${(target.tags || []).join(' ')}`;
for (const prior of others) {
  const priorText = `${prior.title} ${prior.primarySignal} ${(prior.tags || []).join(' ')}`;
  const ratio = overlapRatio(targetText, priorText);
  if (ratio >= 0.6) {
    console.error(`Topic overlap too high with ${prior.date} (${ratio.toFixed(2)})`);
    process.exit(1);
  }
}

console.log('Topic diversity check passed');
