const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'finance.db');

if (DB_PATH !== ':memory:') {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

const db = new Database(DB_PATH);

// WAL mode is only meaningful for file-backed databases (not :memory:, used in tests)
if (DB_PATH !== ':memory:') {
  db.pragma('journal_mode = WAL');
}
db.pragma('foreign_keys = ON');
// better-sqlite3 defaults busy_timeout to 0: a second writer (e.g. the nightly
// recurring-transactions job racing a live request, or multiple app instances
// sharing this file) fails immediately with SQLITE_BUSY instead of waiting.
// WAL mode already allows concurrent readers; this makes brief writer
// contention retry for up to 5s before giving up, instead of erroring instantly.
db.pragma('busy_timeout = 5000');

function runMigrations() {
  const migrationPath = path.join(__dirname, 'migrations', '001_init.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  db.exec(sql);
}

runMigrations();

module.exports = db;
