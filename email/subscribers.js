#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// CyberPulse · Subscriber list management (JSON flat-file)
//
// States: pending → confirmed → unsubscribed (→ confirmed via re-subscribe)
// Each subscriber gets a unique token for confirmation and unsubscribe links.
//
// CLI:
//   node email/subscribers.js add   user@example.com   # → pending (sends confirm email)
//   node email/subscribers.js confirm <token>           # → confirmed
//   node email/subscribers.js remove user@example.com   # → unsubscribed
//   node email/subscribers.js remove-by-token <token>   # → unsubscribed (from email link)
//   node email/subscribers.js list
//   node email/subscribers.js count
//   node email/subscribers.js export                    # confirmed emails only
//   node email/subscribers.js import file.txt           # bulk import (as confirmed)
// ─────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Add a subscriber as pending (double opt-in step 1).
// If already confirmed, returns already_subscribed.
// If previously unsubscribed, resets to pending with a fresh token.
// If already pending, refreshes the token (allows resend of confirmation).
function add(email) {
  email = normalise(email);
  if (!isValidEmail(email)) return { ok: false, error: 'Invalid email address' };
  const subs = load();
  const existing = subs.find(s => s.email === email);
  if (existing) {
    if (existing.status === 'confirmed') return { ok: true, action: 'already_subscribed', token: existing.token };
    // Re-subscribe or refresh pending: generate new token
    existing.status = 'pending';
    existing.token = generateToken();
    existing.pending_at = new Date().toISOString();
    save(subs);
    return { ok: true, action: existing.unsubscribed_at ? 'resubscribe_pending' : 'pending_refreshed', token: existing.token };
  }
  const token = generateToken();
  subs.push({
    email,
    status: 'pending',
    token,
    subscribed_at: new Date().toISOString(),
    pending_at: new Date().toISOString()
  });
  save(subs);
  return { ok: true, action: 'pending', token };
}

// Confirm a pending subscriber via their token (double opt-in step 2).
function confirm(token) {
  if (!token || typeof token !== 'string') return { ok: false, error: 'Token is required' };
  const subs = load();
  const sub = subs.find(s => s.token === token);
  if (!sub) return { ok: false, error: 'Invalid or expired token' };
  if (sub.status === 'confirmed') return { ok: true, action: 'already_confirmed', email: sub.email };
  sub.status = 'confirmed';
  sub.confirmed_at = new Date().toISOString();
  save(subs);
  return { ok: true, action: 'confirmed', email: sub.email };
}

// Unsubscribe by email (admin/CLI use).
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

// Unsubscribe via token (from email unsubscribe link).
function removeByToken(token) {
  if (!token || typeof token !== 'string') return { ok: false, error: 'Token is required' };
  const subs = load();
  const sub = subs.find(s => s.token === token);
  if (!sub) return { ok: false, error: 'Invalid token' };
  if (sub.status === 'unsubscribed') return { ok: true, action: 'already_unsubscribed', email: sub.email };
  sub.status = 'unsubscribed';
  sub.unsubscribed_at = new Date().toISOString();
  save(subs);
  return { ok: true, action: 'unsubscribed', email: sub.email };
}

// Look up a subscriber by token (for unsubscribe page display).
function findByToken(token) {
  if (!token) return null;
  const subs = load();
  return subs.find(s => s.token === token) || null;
}

function listActive() {
  return load().filter(s => s.status === 'confirmed');
}

function listAll() {
  return load();
}

function activeEmails() {
  return listActive().map(s => s.email);
}

// Returns confirmed subscribers with their tokens (for per-recipient unsubscribe links).
function activeSubscribers() {
  return listActive().map(s => ({ email: s.email, token: s.token }));
}

function importFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const emails = content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  let added = 0, skipped = 0, invalid = 0;
  for (const email of emails) {
    const e = normalise(email);
    if (!isValidEmail(e)) { invalid++; continue; }
    const subs = load();
    const existing = subs.find(s => s.email === e);
    if (existing && existing.status === 'confirmed') { skipped++; continue; }
    // Bulk import goes straight to confirmed (admin action).
    if (existing) {
      existing.status = 'confirmed';
      existing.confirmed_at = new Date().toISOString();
      save(subs);
    } else {
      const token = generateToken();
      subs.push({
        email: e,
        status: 'confirmed',
        token,
        subscribed_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString()
      });
      save(subs);
    }
    added++;
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
      console.log(r.ok ? `${r.action}: ${arg} (token: ${r.token})` : `Error: ${r.error}`);
      break;
    }
    case 'confirm': {
      if (!arg) { console.error('Usage: subscribers.js confirm <token>'); process.exit(1); }
      const r = confirm(arg);
      console.log(r.ok ? `${r.action}: ${r.email}` : `Error: ${r.error}`);
      break;
    }
    case 'remove': {
      if (!arg) { console.error('Usage: subscribers.js remove <email>'); process.exit(1); }
      const r = remove(arg);
      console.log(`${r.action}: ${arg}`);
      break;
    }
    case 'remove-by-token': {
      if (!arg) { console.error('Usage: subscribers.js remove-by-token <token>'); process.exit(1); }
      const r = removeByToken(arg);
      console.log(r.ok ? `${r.action}: ${r.email}` : `Error: ${r.error}`);
      break;
    }
    case 'list': {
      const subs = listAll();
      if (subs.length === 0) { console.log('No subscribers yet.'); break; }
      for (const s of subs) console.log(`${s.email}\t${s.status}\t${s.subscribed_at || ''}`);
      break;
    }
    case 'count': {
      const all = listAll();
      const confirmed = all.filter(s => s.status === 'confirmed').length;
      const pending = all.filter(s => s.status === 'pending').length;
      const unsub = all.filter(s => s.status === 'unsubscribed').length;
      console.log(`${confirmed} confirmed / ${pending} pending / ${unsub} unsubscribed / ${all.length} total`);
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
      console.log('Usage: subscribers.js <add|confirm|remove|remove-by-token|list|count|export|import> [arg]');
      process.exit(1);
  }
}

module.exports = { add, confirm, remove, removeByToken, findByToken, listActive, listAll, activeEmails, activeSubscribers, importFromFile };
