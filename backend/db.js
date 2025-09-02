// backend/db.js
const Database = require('better-sqlite3');
const db = new Database('exitos.db', { verbose: null });

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('consultant','seller','admin')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consultant_profiles (
  user_id INTEGER PRIMARY KEY,
  headline TEXT,
  bio TEXT,
  avatar_url TEXT,
  industries TEXT,
  specialties TEXT,
  location TEXT,
  available INTEGER,
  hourly_rate INTEGER,
  website TEXT,
  linkedin TEXT,
  github TEXT,
  years_experience INTEGER,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS intro_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consultant_id INTEGER NOT NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending',
  workspace_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (consultant_id) REFERENCES users(id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

CREATE TABLE IF NOT EXISTS workspaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consultant_id INTEGER NOT NULL,
  seller_user_id INTEGER,      -- NULL until claimed
  seller_name TEXT NOT NULL,
  seller_email TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (consultant_id) REFERENCES users(id),
  FOREIGN KEY (seller_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_workspaces_consultant ON workspaces(consultant_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_seller ON workspaces(seller_user_id);

CREATE TABLE IF NOT EXISTS workspace_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',  -- todo | in_progress | done
  assigned_to TEXT,            -- consultant | seller
  due_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workspace_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL,
  author TEXT NOT NULL,         -- consultant | seller
  body TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
`);

module.exports = db;
