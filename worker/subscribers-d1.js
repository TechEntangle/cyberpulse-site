// ─────────────────────────────────────────────────────────────────
// CyberPulse · D1-backed subscriber storage
//
// Drop-in replacement for email/subscribers.js that reads/writes
// Cloudflare D1 instead of a local JSON file.
//
// Every function takes a `db` parameter (the D1 binding) so there
// is no global state — safe for Workers' request-scoped execution.
// ─────────────────────────────────────────────────────────────────

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function normalise(email) {
  return String(email).trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Add a subscriber as pending (double opt-in step 1).
async function add(db, email) {
  email = normalise(email);
  if (!isValidEmail(email)) return { ok: false, error: 'Invalid email address' };

  const existing = await db.prepare(
    'SELECT id, email, status, token, unsubscribed_at FROM subscribers WHERE email = ?'
  ).bind(email).first();

  const now = new Date().toISOString();

  if (existing) {
    if (existing.status === 'confirmed') {
      return { ok: true, action: 'already_subscribed', token: existing.token };
    }
    // Re-subscribe or refresh pending: generate new token
    const token = generateToken();
    const action = existing.unsubscribed_at ? 'resubscribe_pending' : 'pending_refreshed';
    await db.prepare(
      'UPDATE subscribers SET status = ?, token = ?, pending_at = ? WHERE id = ?'
    ).bind('pending', token, now, existing.id).run();
    return { ok: true, action, token };
  }

  const token = generateToken();
  await db.prepare(
    'INSERT INTO subscribers (email, status, token, subscribed_at, pending_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(email, 'pending', token, now, now).run();
  return { ok: true, action: 'pending', token };
}

// Confirm a pending subscriber via their token (double opt-in step 2).
async function confirm(db, token) {
  if (!token || typeof token !== 'string') return { ok: false, error: 'Token is required' };

  const sub = await db.prepare(
    'SELECT id, email, status FROM subscribers WHERE token = ?'
  ).bind(token).first();

  if (!sub) return { ok: false, error: 'Invalid or expired token' };
  if (sub.status === 'confirmed') return { ok: true, action: 'already_confirmed', email: sub.email };

  const now = new Date().toISOString();
  await db.prepare(
    'UPDATE subscribers SET status = ?, confirmed_at = ? WHERE id = ?'
  ).bind('confirmed', now, sub.id).run();
  return { ok: true, action: 'confirmed', email: sub.email };
}

// Unsubscribe via token (from email unsubscribe link).
async function removeByToken(db, token) {
  if (!token || typeof token !== 'string') return { ok: false, error: 'Token is required' };

  const sub = await db.prepare(
    'SELECT id, email, status FROM subscribers WHERE token = ?'
  ).bind(token).first();

  if (!sub) return { ok: false, error: 'Invalid token' };
  if (sub.status === 'unsubscribed') return { ok: true, action: 'already_unsubscribed', email: sub.email };

  const now = new Date().toISOString();
  await db.prepare(
    'UPDATE subscribers SET status = ?, unsubscribed_at = ? WHERE id = ?'
  ).bind('unsubscribed', now, sub.id).run();
  return { ok: true, action: 'unsubscribed', email: sub.email };
}

// Look up a subscriber by token (for unsubscribe page display).
async function findByToken(db, token) {
  if (!token) return null;
  return await db.prepare(
    'SELECT email, status, token, subscribed_at, confirmed_at, unsubscribed_at FROM subscribers WHERE token = ?'
  ).bind(token).first() || null;
}

// All confirmed subscribers with tokens (for per-recipient unsubscribe links in newsletters).
async function activeSubscribers(db) {
  const { results } = await db.prepare(
    'SELECT email, token FROM subscribers WHERE status = ?'
  ).bind('confirmed').all();
  return results;
}

export { add, confirm, removeByToken, findByToken, activeSubscribers };
