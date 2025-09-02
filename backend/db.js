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

CREATE INDEX IF NOT EXISTS idx_profiles_location ON consultant_profiles(location);

CREATE TABLE IF NOT EXISTS intro_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consultant_id INTEGER NOT NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending', -- pending | accepted | declined
  workspace_id INTEGER,          -- set when accepted
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (consultant_id) REFERENCES users(id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

-- Workspaces link a consultant with a seller (by email/name for MVP)
CREATE TABLE IF NOT EXISTS workspaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consultant_id INTEGER NOT NULL,
  seller_name TEXT NOT NULL,
  seller_email TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- active | archived
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (consultant_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_workspaces_consultant ON workspaces(consultant_id);

CREATE TABLE IF NOT EXISTS workspace_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',  -- todo | in_progress | done
  assigned_to TEXT,            -- 'consultant' or 'seller' (MVP)
  due_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON workspace_tasks(workspace_id);

CREATE TABLE IF NOT EXISTS workspace_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL,
  author TEXT NOT NULL,         -- 'consultant' or 'seller' (MVP)
  body TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_workspace ON workspace_messages(workspace_id);
`);

module.exports = db;

