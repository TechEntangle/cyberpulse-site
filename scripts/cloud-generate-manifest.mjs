#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const date = process.argv[2];
if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error('Usage: node scripts/cloud-generate-manifest.mjs YYYY-MM-DD');
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY');
  process.exit(1);
}

const ROOT = path.resolve(process.cwd());
const contentDir = path.join(ROOT, 'content');
const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.json')).sort();
const recentFiles = files.slice(-3);
const recentEntries = recentFiles.map(f => JSON.parse(fs.readFileSync(path.join(contentDir, f), 'utf8')));
const latest = recentEntries[recentEntries.length - 1] || { edition: 0 };
const edition = Number(latest.edition || 0) + 1;

function sanitizeManifest(manifest) {
  const clean = structuredClone(manifest);
  clean.tags = Array.isArray(clean.tags) ? clean.tags.map(t => String(t).trim()).filter(Boolean).slice(0, 4) : [];
  while (clean.tags.length < 3) clean.tags.push('Cyber Risk');
  clean.atAGlance.bullets = Array.isArray(clean.atAGlance?.bullets)
    ? clean.atAGlance.bullets.map(b => String(b).trim()).filter(Boolean).slice(0, 3)
    : [];
  while (clean.atAGlance.bullets.length < 3) {
    clean.atAGlance.bullets.push('Enterprise leaders should pressure-test identity, cloud, and payment controls now.');
  }
  clean.sources = Array.isArray(clean.sources) ? clean.sources.slice(0, 4) : [];
  return clean;
}

function buildSchema() {
  return {
    name: 'cyberpulse_manifest',
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string' },
        dek: { type: 'string' },
        metaDescription: { type: 'string' },
        ogDescription: { type: 'string' },
        readTime: { type: 'string' },
        confidence: { type: 'string' },
        primarySignal: { type: 'string' },
        whyItMatters: { type: 'string' },
        tags: { type: 'array', minItems: 3, maxItems: 4, items: { type: 'string' } },
        atAGlance: {
          type: 'object',
          additionalProperties: false,
          properties: {
            text: { type: 'string' },
            bullets: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } }
          },
          required: ['text', 'bullets']
        },
        sections: {
          type: 'array',
          minItems: 5,
          maxItems: 5,
          items: {
            anyOf: [
              {
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: { type: 'string', const: 'the-story-that-matters' },
                  title: { type: 'string' },
                  blocks: {
                    type: 'array', minItems: 2, maxItems: 2,
                    items: {
                      type: 'object', additionalProperties: false,
                      properties: {
                        kind: { type: 'string', const: 'signal' },
                        title: { type: 'string' },
                        paragraphs: { type: 'array', minItems: 2, maxItems: 2, items: { type: 'string' } }
                      },
                      required: ['kind', 'title', 'paragraphs']
                    }
                  }
                },
                required: ['id', 'title', 'blocks']
              },
              {
                type: 'object', additionalProperties: false,
                properties: {
                  id: { type: 'string', const: 'beyond-one-cve' },
                  title: { type: 'string' },
                  blocks: {
                    type: 'array', minItems: 1, maxItems: 1,
                    items: {
                      type: 'object', additionalProperties: false,
                      properties: {
                        kind: { type: 'string', const: 'paragraphs' },
                        paragraphs: { type: 'array', minItems: 2, maxItems: 2, items: { type: 'string' } }
                      },
                      required: ['kind', 'paragraphs']
                    }
                  }
                },
                required: ['id', 'title', 'blocks']
              },
              {
                type: 'object', additionalProperties: false,
                properties: {
                  id: { type: 'string', const: 'enterprise-risk' },
                  title: { type: 'string' },
                  blocks: {
                    type: 'array', minItems: 1, maxItems: 1,
                    items: {
                      type: 'object', additionalProperties: false,
                      properties: {
                        kind: { type: 'string', const: 'paragraphs' },
                        paragraphs: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } }
                      },
                      required: ['kind', 'paragraphs']
                    }
                  }
                },
                required: ['id', 'title', 'blocks']
              },
              {
                type: 'object', additionalProperties: false,
                properties: {
                  id: { type: 'string', const: 'takeaways' },
                  title: { type: 'string' },
                  blocks: {
                    type: 'array', minItems: 1, maxItems: 1,
                    items: {
                      type: 'object', additionalProperties: false,
                      properties: {
                        kind: { type: 'string', const: 'takeaways' },
                        items: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'object' } }
                      },
                      required: ['kind', 'items']
                    }
                  }
                },
                required: ['id', 'title', 'blocks']
              },
              {
                type: 'object', additionalProperties: false,
                properties: {
                  id: { type: 'string', const: 'blind-spot' },
                  title: { type: 'string' },
                  blocks: {
                    type: 'array', minItems: 1, maxItems: 1,
                    items: {
                      type: 'object', additionalProperties: false,
                      properties: {
                        kind: { type: 'string', const: 'paragraphs' },
                        paragraphs: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } }
                      },
                      required: ['kind', 'paragraphs']
                    }
                  }
                },
                required: ['id', 'title', 'blocks']
              }
            ]
          }
        },
        sources: {
          type: 'array',
          minItems: 2,
          maxItems: 4,
          items: {
            type: 'object', additionalProperties: false,
            properties: { title: { type: 'string' }, url: { type: 'string' } },
            required: ['title', 'url']
          }
        }
      },
      required: ['title','dek','metaDescription','ogDescription','readTime','confidence','primarySignal','whyItMatters','tags','atAGlance','sections','sources']
    }
  };
}

const recentContext = recentEntries.map((entry, index) =>
  `${index + 1}. ${entry.date} | ${entry.title}\n   Tags: ${(entry.tags || []).join(', ')}\n   Primary signal: ${entry.primarySignal}\n   Why it matters: ${entry.whyItMatters}`
).join('\n\n');

const systemPrompt = `You create a polished CyberPulse daily manifest for an executive cyber briefing site.
Return JSON only. Be specific, board-level, concise, and high-quality.
Use exactly this section structure in order:
1) the-story-that-matters with two signal blocks, each 2 paragraphs
2) beyond-one-cve with paragraph block, 2 paragraphs
3) enterprise-risk with paragraph block, 3 paragraphs
4) takeaways with one takeaways block containing 4 items:
   - Board takeaway in 20 seconds (2 bullets)
   - What should CISOs do? (3 bullets)
   - What should boards demand? (3 bullets)
   - What should risk committees rethink? (3 bullets)
5) blind-spot with paragraph block, 3 paragraphs
Use short clean tags, 1 to 3 words each.
Each at-a-glance bullet must be a single clean sentence.
Only use current, credible sources and avoid paywalled citations when possible.`;

const userPrompt = `Create the CyberPulse manifest for ${date}.
Edition number: ${edition}.
Match the style and depth of recent editions in the repo, focusing on board-level implications rather than technical blow-by-blow.
Recent briefing context, avoid repeating these angles unless there is a truly major new development:\n${recentContext}
Hard requirement: do not duplicate the lead topic of the last three manifests. Choose a meaningfully different lead theme, title, and primary signal.
Prefer a fresh angle such as identity, cloud, AI misuse, supply chain, executive fraud, resilience, governance breakdown, or crypto/financial sector concentration risk, if supported.
Do not include date, edition, coverImage, ogImage, or publishedLabel fields. Only return the editorial fields required by the schema.`;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const schema = buildSchema();
const response = await client.responses.create({
  model: 'gpt-5',
  input: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ],
  text: {
    format: {
      type: 'json_schema',
      name: schema.name,
      schema: schema.schema,
      strict: true
    }
  }
});

const parsed = sanitizeManifest(JSON.parse(response.output_text));
const dateObj = new Date(`${date}T12:00:00Z`);
const publishedLabel = dateObj.toLocaleDateString('en-US', {
  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'
});

const manifest = {
  date,
  edition,
  publishedLabel,
  coverImage: `/assets/covers/${date}.png`,
  ogImage: `/assets/og/${date}.png`,
  ...parsed
};

const outPath = path.join(contentDir, `${date}.json`);
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(outPath);
