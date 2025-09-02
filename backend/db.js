// backend/db.js
// SQLite initialization and schema for ExitOS (users, profiles, intro requests, workspaces, tasks, messages)

const Database = require('better-sqlite3');
require('dotenv').config();

const DB_PATH = process.env.SQLITE_PATH || 'exitos.db';
const db = new Database(DB_PATH, { verbose: null });

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
-- Users (RBAC: consultant | seller | admin)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('consultant','seller','admin')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Consultant public profile (1:1 with users)
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

-- Workspaces (consultant <-> seller collaboration)
CREATE TABLE IF NOT EXISTS workspaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consultant_id INTEGER NOT NULL,
  seller_user_id INTEGER,
  seller_name TEXT NOT NULL,
  seller_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (consultant_id) REFERENCES users(id),
  FOREIGN KEY (seller_user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_workspaces_consultant ON workspaces(consultant_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_seller ON workspaces(seller_user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_email ON workspaces(seller_email);

-- Intro requests (public → consultant; linked to workspace when accepted)
CREATE TABLE IF NOT EXISTS intro_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consultant_id INTEGER NOT NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | accepted | declined
  workspace_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (consultant_id) REFERENCES users(id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_intro_consultant ON intro_requests(consultant_id);
CREATE INDEX IF NOT EXISTS idx_intro_status ON intro_requests(status);

-- Workspace tasks
CREATE TABLE IF NOT EXISTS workspace_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',     -- todo | in_progress | done
  assigned_to TEXT,                         -- consultant | seller
  due_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON workspace_tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON workspace_tasks(status);

-- Workspace messages (simple comment thread)
CREATE TABLE IF NOT EXISTS workspace_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL,
  author TEXT NOT NULL,     -- consultant | seller
  body TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_messages_workspace ON workspace_messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON workspace_messages(created_at);
`);

module.exports = db;
