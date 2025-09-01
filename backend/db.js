// backend/db.js
const Database = require('better-sqlite3');

const db = new Database('exitos.db', { verbose: null });

// Initialize tables
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'consultant',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

module.exports = db;
