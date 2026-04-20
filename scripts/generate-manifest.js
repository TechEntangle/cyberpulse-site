#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const [,, dateArg] = process.argv;
if (!dateArg || !/^\d{4}-\d{2}-\d{2}$/.test(dateArg)) {
  console.error('Usage: node scripts/generate-manifest.js YYYY-MM-DD');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const contentDir = path.join(ROOT, 'content');
const prevFiles = fs.readdirSync(contentDir).filter(f => f.endsWith('.json')).sort();
const prevPath = path.join(contentDir, prevFiles[prevFiles.length - 1]);
const prev = JSON.parse(fs.readFileSync(prevPath, 'utf8'));
const outPath = path.join(contentDir, `${dateArg}.json`);

if (fs.existsSync(outPath)) {
  console.log(outPath);
  process.exit(0);
}

const dateObj = new Date(`${dateArg}T12:00:00Z`);
const publishedLabel = dateObj.toLocaleDateString('en-US', {
  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'
});

const edition = Number(prev.edition || 0) + 1;
const skeleton = {
  date: dateArg,
  edition,
  title: `CyberPulse Edition ${edition}`,
  dek: 'Draft manifest generated automatically. Replace with the day’s final editorial framing before publish.',
  metaDescription: 'Draft CyberPulse executive briefing. Editorial content still needs review.',
  ogDescription: 'Draft CyberPulse executive briefing awaiting final editorial content.',
  readTime: '6 min read',
  confidence: 'Draft, pending source review.',
  publishedLabel,
  primarySignal: 'Draft, pending source review.',
  whyItMatters: 'Draft, pending source review.',
  tags: ['Draft'],
  coverImage: `/assets/covers/${dateArg}.png`,
  ogImage: `/assets/og/${dateArg}.png`,
  atAGlance: {
    text: 'Draft manifest generated automatically. Replace after news synthesis.',
    bullets: [
      'Replace with final bullet 1.',
      'Replace with final bullet 2.',
      'Replace with final bullet 3.'
    ]
  },
  sections: [
    {
      id: 'the-story-that-matters',
      title: 'The story that matters',
      blocks: [
        {
          kind: 'signal',
          title: 'Replace with signal headline',
          paragraphs: [
            'Replace with the lead signal paragraph.',
            'Replace with the second signal paragraph.'
          ]
        },
        {
          kind: 'signal',
          title: 'Replace with second signal headline',
          paragraphs: [
            'Replace with the third paragraph.',
            'Replace with the fourth paragraph.'
          ]
        }
      ]
    },
    {
      id: 'beyond-one-cve',
      title: 'Why this matters beyond one story',
      blocks: [
        {
          kind: 'paragraphs',
          paragraphs: [
            'Replace with broader strategic context paragraph one.',
            'Replace with broader strategic context paragraph two.'
          ]
        }
      ]
    },
    {
      id: 'enterprise-risk',
      title: 'What this means for enterprise risk',
      blocks: [
        {
          kind: 'paragraphs',
          paragraphs: [
            'Replace with enterprise risk implication one.',
            'Replace with enterprise risk implication two.',
            'Replace with enterprise risk implication three.'
          ]
        }
      ]
    },
    {
      id: 'takeaways',
      title: 'Takeaways',
      blocks: [
        {
          kind: 'takeaways',
          items: [
            {
              title: 'Board takeaway in 20 seconds',
              bullets: [
                'Replace with takeaway one.',
                'Replace with takeaway two.'
              ]
            },
            {
              title: 'What should CISOs do?',
              bullets: [
                'Replace with action one.',
                'Replace with action two.',
                'Replace with action three.'
              ]
            },
            {
              title: 'What should boards demand?',
              bullets: [
                'Replace with board demand one.',
                'Replace with board demand two.',
                'Replace with board demand three.'
              ]
            },
            {
              title: 'What should risk committees rethink?',
              bullets: [
                'Replace with rethink one.',
                'Replace with rethink two.',
                'Replace with rethink three.'
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'blind-spot',
      title: 'The board blind spot',
      blocks: [
        {
          kind: 'paragraphs',
          paragraphs: [
            'Replace with blind-spot paragraph one.',
            'Replace with blind-spot paragraph two.',
            'Replace with blind-spot paragraph three.'
          ]
        }
      ]
    }
  ],
  sources: [
    {
      title: 'Replace with source title',
      url: 'https://example.com/source'
    }
  ]
};

fs.writeFileSync(outPath, JSON.stringify(skeleton, null, 2) + '\n');
console.log(outPath);
