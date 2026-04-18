#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// CyberPulse · Subscriber list management (JSON flat-file)
//
// Stores subscribers in email/subscribers.json with status tracking.
// Designed for Resend batch sends — exports active email list.
//
// CLI:
//   node email/subscribers.js add   user@example.com
//   node email/subscribers.js remove user@example.com
//   node email/subscribers.js list
//   node email/subscribers.js count
//   node email/subscribers.js export            # prints emails one per line
//   node email/subscribers.js import file.txt   # one email per line
// ─────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'subscribers.json');

function load() {
  if (!fs.existsSync(DB_PATH)) return [];
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { return []; }
}

function save(subs) {
  fs.writeFileSync(DB_PATH, JSON.stringify(subs, null, 2) + '\n', 'utf8');
}

function normalise(email) {
  return String(email).trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function add(email) {
  email = normalise(email);
  if (!isValidEmail(email)) return { ok: false, error: 'Invalid email address' };
  const subs = load();
  const existing = subs.find(s => s.email === email);
  if (existing) {
    if (existing.status === 'active') return { ok: true, action: 'already_subscribed' };
    existing.status = 'active';
    existing.resubscribed_at = new Date().toISOString();
    save(subs);
    return { ok: true, action: 'resubscribed' };
  }
  subs.push({ email, status: 'active', subscribed_at: new Date().toISOString() });
  save(subs);
  return { ok: true, action: 'subscribed' };
}

function remove(email) {
  email = normalise(email);
  const subs = load();
  const existing = subs.find(s => s.email === email);
  if (!existing) return { ok: true, action: 'not_found' };
  existing.status = 'unsubscribed';
  existing.unsubscribed_at = new Date().toISOString();
  save(subs);
  return { ok: true, action: 'unsubscribed' };
}

function listActive() {
  return load().filter(s => s.status === 'active');
}

function listAll() {
  return load();
}

function activeEmails() {
  return listActive().map(s => s.email);
}

function importFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const emails = content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  let added = 0, skipped = 0, invalid = 0;
  for (const email of emails) {
    const result = add(email);
    if (!result.ok) invalid++;
    else if (result.action === 'already_subscribed') skipped++;
    else added++;
  }
  return { added, skipped, invalid, total: emails.length };
}

// ── CLI ──────────────────────────────────────────────────────────
if (require.main === module) {
  const [cmd, arg] = process.argv.slice(2);

  switch (cmd) {
    case 'add': {
      if (!arg) { console.error('Usage: subscribers.js add <email>'); process.exit(1); }
      const r = add(arg);
      console.log(r.ok ? `${r.action}: ${arg}` : `Error: ${r.error}`);
      break;
    }
    case 'remove': {
      if (!arg) { console.error('Usage: subscribers.js remove <email>'); process.exit(1); }
      const r = remove(arg);
      console.log(`${r.action}: ${arg}`);
      break;
    }
    case 'list': {
      const subs = listAll();
      if (subs.length === 0) { console.log('No subscribers yet.'); break; }
      for (const s of subs) console.log(`${s.email}\t${s.status}\t${s.subscribed_at || ''}`);
      break;
    }
    case 'count': {
      const active = listActive().length;
      const all = listAll().length;
      console.log(`${active} active / ${all} total`);
      break;
    }
    case 'export': {
      for (const email of activeEmails()) console.log(email);
      break;
    }
    case 'import': {
      if (!arg) { console.error('Usage: subscribers.js import <file>'); process.exit(1); }
      const r = importFromFile(arg);
      console.log(`Imported: ${r.added} new, ${r.skipped} existing, ${r.invalid} invalid (${r.total} total)`);
      break;
    }
    default:
      console.log('Usage: subscribers.js <add|remove|list|count|export|import> [arg]');
      process.exit(1);
  }
}

module.exports = { add, remove, listActive, listAll, activeEmails, importFromFile };
