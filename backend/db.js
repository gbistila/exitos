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
// RBAC helpers
const getWorkspaceById = db.prepare(`SELECT * FROM workspaces WHERE id = ?`);
function ensureWorkspaceAccess(req, res, next) {
  const wid = Number(req.params.id);
  const ws = getWorkspaceById.get(wid);
  if (!ws) return res.status(404).json({ error: 'Workspace not found' });

  const u = req.user;
  const isConsultant = u.role === 'consultant' && ws.consultant_id === u.sub;
  const isSeller = u.role === 'seller' && ws.seller_user_id === u.sub;
  const isAdmin = u.role === 'admin';

  if (!(isConsultant || isSeller || isAdmin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  req.workspace = ws;
  next();
}

// Create workspace on accept (update existing endpoint logic)
const createWorkspaceStmt = db.prepare(`
  INSERT INTO workspaces (consultant_id, seller_name, seller_email, seller_user_id, status)
  VALUES (?, ?, ?, NULL, 'active')
`);
const getIntroRequestById = db.prepare(`SELECT * FROM intro_requests WHERE id = ? AND consultant_id = ?`);
const linkRequestToWorkspace = db.prepare(`UPDATE intro_requests SET status = ?, workspace_id = ? WHERE id = ? AND consultant_id = ?`);

app.post('/api/consultants/requests/:id/respond', authRequired, (req, res) => {
  if (req.user.role !== 'consultant') return res.status(403).json({ error: 'Forbidden' });
  const { status } = req.body;
  if (!['accepted','declined'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const intro = getIntroRequestById.get(Number(req.params.id), req.user.sub);
  if (!intro) return res.status(404).json({ error: 'Request not found' });

  let workspace_id = intro.workspace_id;
  if (status === 'accepted' && !workspace_id) {
    const info = createWorkspaceStmt.run(req.user.sub, intro.sender_name, intro.sender_email);
    workspace_id = info.lastInsertRowid;
  }
  linkRequestToWorkspace.run(status, workspace_id || null, intro.id, req.user.sub);
  res.json({ ok: true, workspace_id });
});

// Unified "my workspaces" (for both consultants and sellers)
const listWorkspacesByConsultant = db.prepare(`SELECT * FROM workspaces WHERE consultant_id = ? ORDER BY created_at DESC`);
const listWorkspacesBySeller = db.prepare(`SELECT * FROM workspaces WHERE seller_user_id = ? ORDER BY created_at DESC`);

app.get('/api/workspaces', authRequired, (req, res) => {
  const u = req.user;
  let items = [];
  if (u.role === 'consultant') items = listWorkspacesByConsultant.all(u.sub);
  else if (u.role === 'seller') items = listWorkspacesBySeller.all(u.sub);
  else if (u.role === 'admin') items = db.prepare(`SELECT * FROM workspaces ORDER BY created_at DESC`).all();
  else return res.status(403).json({ error: 'Forbidden' });

  res.json({ items });
});

// Seller "claim by email" endpoint: link any pending workspaces to the logged-in seller if emails match
const claimByEmailStmt = db.prepare(`
  UPDATE workspaces SET seller_user_id = ?
  WHERE seller_user_id IS NULL AND seller_email = ?
`);

app.post('/api/workspaces/claim-by-email', authRequired, (req, res) => {
  if (req.user.role !== 'seller') return res.status(403).json({ error: 'Forbidden' });
  const info = claimByEmailStmt.run(req.user.sub, req.user.email);
  res.json({ ok: true, claimed: info.changes });
});

// Workspace details (RBAC-protected)
app.get('/api/workspaces/:id', authRequired, ensureWorkspaceAccess, (req, res) => {
  res.json({ workspace: req.workspace });
});

// Tasks and messages with RBAC
const listTasksStmt = db.prepare(`SELECT * FROM workspace_tasks WHERE workspace_id = ? ORDER BY created_at DESC`);
const createTaskStmt = db.prepare(`
  INSERT INTO workspace_tasks (workspace_id, title, description, status, assigned_to, due_date)
  VALUES (@workspace_id, @title, @description, 'todo', @assigned_to, @due_date)
`);
const updateTaskStatusStmt = db.prepare(`UPDATE workspace_tasks SET status = ? WHERE id = ? AND workspace_id = ?`);

app.get('/api/workspaces/:id/tasks', authRequired, ensureWorkspaceAccess, (req, res) => {
  res.json({ items: listTasksStmt.all(req.workspace.id) });
});

// Only consultants (and admins) can create tasks in MVP
app.post('/api/workspaces/:id/tasks', authRequired, ensureWorkspaceAccess, (req, res) => {
  const canCreate = req.user.role === 'consultant' || req.user.role === 'admin';
  if (!canCreate) return res.status(403).json({ error: 'Only consultants can create tasks' });

  const { title, description, assigned_to = 'seller', due_date = null } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const payload = {
    workspace_id: req.workspace.id,
    title: String(title).slice(0, 200),
    description: description ? String(description).slice(0, 4000) : null,
    assigned_to: ['consultant','seller'].includes(assigned_to) ? assigned_to : 'seller',
    due_date
  };
  const info = createTaskStmt.run(payload);
  res.status(201).json({ id: info.lastInsertRowid });
});

// Update task status:
// - Consultant can update any
// - Seller can only update tasks assigned to 'seller'
const getTaskById = db.prepare(`SELECT * FROM workspace_tasks WHERE id = ? AND workspace_id = ?`);
app.patch('/api/workspaces/:id/tasks/:taskId', authRequired, ensureWorkspaceAccess, (req, res) => {
  const allowed = ['todo','in_progress','done'];
  const { status } = req.body;
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const t = getTaskById.get(Number(req.params.taskId), req.workspace.id);
  if (!t) return res.status(404).json({ error: 'Task not found' });

  const isConsultant = req.user.role === 'consultant' || req.user.role === 'admin';
  const isSellerAllowed = req.user.role === 'seller' && t.assigned_to === 'seller';
  if (!(isConsultant || isSellerAllowed)) return res.status(403).json({ error: 'Forbidden' });

  updateTaskStatusStmt.run(status, t.id, req.workspace.id);
  res.json({ ok: true });
});

// Messages: both roles can post; author recorded from role
const listMessagesStmt = db.prepare(`SELECT * FROM workspace_messages WHERE workspace_id = ? ORDER BY created_at ASC`);
const createMessageStmt = db.prepare(`INSERT INTO workspace_messages (workspace_id, author, body) VALUES (?, ?, ?)`);

app.get('/api/workspaces/:id/messages', authRequired, ensureWorkspaceAccess, (req, res) => {
  res.json({ items: listMessagesStmt.all(req.workspace.id) });
});

app.post('/api/workspaces/:id/messages', authRequired, ensureWorkspaceAccess, (req, res) => {
  const { body } = req.body;
  if (!body) return res.status(400).json({ error: 'Message required' });
  const author = req.user.role === 'seller' ? 'seller' : 'consultant';
  createMessageStmt.run(req.workspace.id, author, String(body).slice(0, 4000));
  res.status(201).json({ ok: true });
});
