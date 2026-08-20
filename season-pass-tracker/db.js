const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'season-passes.db');
const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS pass_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    season TEXT NOT NULL,
    group_name TEXT NOT NULL,
    contact_first_name TEXT,
    contact_last_name TEXT,
    email TEXT,
    phone TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL REFERENCES pass_groups(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT,
    date_of_birth TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL REFERENCES pass_groups(id) ON DELETE CASCADE,
    checked_in_at TEXT NOT NULL DEFAULT (datetime('now')),
    note TEXT
  );

  CREATE TABLE IF NOT EXISTS checkin_members (
    checkin_id INTEGER NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    PRIMARY KEY (checkin_id, member_id)
  );

  CREATE INDEX IF NOT EXISTS idx_members_group ON members(group_id);
  CREATE INDEX IF NOT EXISTS idx_checkins_group ON checkins(group_id);
  CREATE INDEX IF NOT EXISTS idx_checkin_members_member ON checkin_members(member_id);
  CREATE INDEX IF NOT EXISTS idx_groups_season ON pass_groups(season);
`);

module.exports = db;
