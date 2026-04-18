#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const [,, date, promptFile] = process.argv;
if (!date) {
  console.error('Usage: node scripts/generate-cover.js YYYY-MM-DD [prompt-file]');
  process.exit(1);
}
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is required');
  process.exit(1);
}
const defaultPrompt = `Premium editorial hero image for a cybersecurity intelligence briefing. Theme: executive cyber risk, digital infrastructure, AI-accelerated threats, modern boardroom, dark premium palette, amber and red accents, magazine-cover quality, no text, no logos, no watermark.`;
const prompt = promptFile ? fs.readFileSync(promptFile, 'utf8').trim() : defaultPrompt;

async function main() {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      size: '1792x1024',
      quality: 'hd',
      n: 1,
      response_format: 'b64_json'
    })
  });
  const json = await res.json();
  if (!res.ok) {
    console.error(JSON.stringify(json, null, 2));
    process.exit(1);
  }
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) {
    console.error('No image returned');
    process.exit(1);
  }
  const outDir = path.join(process.cwd(), 'assets', 'covers');
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `${date}.png`);
  fs.writeFileSync(out, Buffer.from(b64, 'base64'));
  console.log(out);
}
main().catch(err => { console.error(err); process.exit(1); });
