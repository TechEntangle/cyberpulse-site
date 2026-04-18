-- CyberPulse · D1 subscriber schema
-- Migration 0001: Create subscribers table
--
-- Mirrors the JSON flat-file schema from email/subscribers.js
-- States: pending → confirmed → unsubscribed

CREATE TABLE IF NOT EXISTS subscribers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  status        TEXT    NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'confirmed', 'unsubscribed')),
  token         TEXT    NOT NULL UNIQUE,
  subscribed_at TEXT    NOT NULL,  -- ISO-8601
  pending_at    TEXT,
  confirmed_at  TEXT,
  unsubscribed_at TEXT
);

-- Fast lookups by token (confirmation + unsubscribe links)
CREATE INDEX IF NOT EXISTS idx_subscribers_token ON subscribers(token);

-- Fast lookup by status (newsletter send → confirmed only)
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status);
