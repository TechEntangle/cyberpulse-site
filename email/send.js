#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// CyberPulse · Newsletter send via Resend API
//
// Sends the branded email template to all active subscribers
// (or to a single address for testing).
//
// Usage:
//   # Send to all subscribers
//   RESEND_API_KEY=re_xxx node email/send.js --date 2026-04-18 \
//     --title "The Executive Is the New Perimeter" \
//     --desc "Why SharePoint exploitation and executive-targeted social engineering..."
//
//   # Send to a single address (test)
//   RESEND_API_KEY=re_xxx node email/send.js --date 2026-04-18 \
//     --title "Title" --desc "Desc" --to user@example.com
//
//   # Dry run (show what would be sent, no API calls)
//   node email/send.js --date 2026-04-18 --title "Title" --desc "Desc" --dry-run
//
// Environment:
//   RESEND_API_KEY   Required (unless --dry-run)
//
// Options:
//   --date       YYYY-MM-DD (required)
//   --title      Article title (required)
//   --desc       Short description (required)
//   --edition    Edition number (optional)
//   --to         Single recipient for test send (skips subscriber list)
//   --dry-run    Preview without sending
//   --delay      Milliseconds between sends (default: 200)
// ─────────────────────────────────────────────────────────────────
const buildEmail = require('./template');
const { activeEmails } = require('./subscribers');

const args = process.argv.slice(2);
const get = (flag) => { const i = args.indexOf(flag); return i > -1 ? args[i + 1] : ''; };
const has = (flag) => args.includes(flag);

const date = get('--date');
const title = get('--title');
const desc = get('--desc');
const edition = get('--edition') || '';
const singleTo = get('--to');
const dryRun = has('--dry-run');
const delay = parseInt(get('--delay') || '200', 10);

if (!date || !title || !desc) {
  console.error('Required: --date, --title, --desc');
  console.error('Usage: node email/send.js --date YYYY-MM-DD --title "..." --desc "..."');
  process.exit(1);
}

const info  = (msg) => console.log(`\x1b[34m▸\x1b[0m ${msg}`);
const ok    = (msg) => console.log(`\x1b[32m✓\x1b[0m ${msg}`);
const warn  = (msg) => console.log(`\x1b[33m⚠\x1b[0m ${msg}`);
const fail  = (msg) => { console.error(`\x1b[31m✗\x1b[0m ${msg}`); process.exit(1); };

async function sendOne(to, html, text, subject) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'CyberPulse <cyberpulse@tusharvartak.com>',
      to: [to],
      subject,
      html,
      text
    })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || JSON.stringify(json));
  return json;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const { html, text } = buildEmail({ title, desc, date, edition });
  const subject = `CyberPulse \u2022 ${title}`;

  // Determine recipients
  let recipients;
  if (singleTo) {
    recipients = [singleTo];
    info(`Test send to: ${singleTo}`);
  } else {
    recipients = activeEmails();
    if (recipients.length === 0) {
      warn('No active subscribers. Add with: node email/subscribers.js add <email>');
      process.exit(0);
    }
    info(`Sending to ${recipients.length} subscriber${recipients.length > 1 ? 's' : ''}`);
  }

  if (dryRun) {
    info('DRY RUN — no emails will be sent');
    info(`Subject: ${subject}`);
    info(`Recipients: ${recipients.join(', ')}`);
    info(`HTML length: ${html.length} chars`);
    info(`Text length: ${text.length} chars`);
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    fail('RESEND_API_KEY environment variable is required');
  }

  let sent = 0, failed = 0;
  for (const to of recipients) {
    try {
      await sendOne(to, html, text, subject);
      ok(`Sent → ${to}`);
      sent++;
    } catch (err) {
      warn(`Failed → ${to}: ${err.message}`);
      failed++;
    }
    if (recipients.length > 1 && to !== recipients[recipients.length - 1]) {
      await sleep(delay);
    }
  }

  console.log('');
  ok(`Done: ${sent} sent, ${failed} failed out of ${recipients.length}`);
}

main().catch(err => { fail(err.message); });
