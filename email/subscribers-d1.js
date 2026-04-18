// ─────────────────────────────────────────────────────────────────
// CyberPulse · D1 subscriber reader for local/CLI newsletter sends
//
// Queries the production Cloudflare D1 database via `wrangler d1 execute`
// to fetch confirmed subscribers with their unsubscribe tokens.
//
// This replaces the local subscribers.json for production sends so
// the newsletter always goes to the same live subscriber list that
// the deployed subscribe flow writes to.
//
// Requires: wrangler CLI authenticated (`wrangler login`)
// ─────────────────────────────────────────────────────────────────
const { execFileSync } = require('child_process');

const DB_NAME = 'cyberpulse_subscribers';

/**
 * Fetch confirmed subscribers from production D1.
 * Returns [{ email, token }, ...] — same shape as the old
 * subscribers.js activeSubscribers() for drop-in compatibility.
 */
async function activeSubscribers() {
  const sql = "SELECT email, token FROM subscribers WHERE status = 'confirmed'";

  try {
    const raw = execFileSync('wrangler', [
      'd1', 'execute', DB_NAME,
      '--remote',
      '--json',
      '--command', sql
    ], {
      encoding: 'utf8',
      timeout: 30_000,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // wrangler d1 execute --json returns an array of result objects
    const parsed = JSON.parse(raw);

    // The result shape is [{ results: [...], success: true, ... }]
    const results = parsed[0] && parsed[0].results;
    if (!Array.isArray(results)) {
      throw new Error('Unexpected D1 response shape');
    }

    return results.map(r => ({ email: r.email, token: r.token }));
  } catch (err) {
    if (err.stdout) {
      // wrangler might put errors in stdout when --json is used
      throw new Error(`wrangler d1 execute failed: ${err.stderr || err.stdout || err.message}`);
    }
    throw new Error(`Failed to query D1 subscribers: ${err.message}`);
  }
}

module.exports = { activeSubscribers };
