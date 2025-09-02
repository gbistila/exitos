// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();

// Config
const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'change_me';

// CORS for cross-site cookies
const isProd = /^https:/.test(FRONTEND_ORIGIN);
app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true,
  methods: ['GET','POST','PATCH','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());

// Cookie options
const cookieOpts = {
  httpOnly: true,
  sameSite: isProd ? 'none' : 'lax',
  secure: isProd,
  path: '/'
};

// ---------- Auth: helpers and routes ----------

const createUserStmt = db.prepare(`
  INSERT INTO users (name, email, password_hash, role) VALUES (@name, @email, @password_hash, @role)
`);
const getUserByEmailStmt = db.prepare(`SELECT * FROM users WHERE email = ?`);
const getUserByIdStmt = db.prepare(`SELECT id, name, email, role, created_at FROM users WHERE id = ?`);

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

function authRequired(req, res, next) {
  try {
    const token = req.cookies.token || (req.headers.authorization || '').replace(/^Bearer /, '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { sub: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  const r = role === 'seller' ? 'seller' : 'consultant';
  const exists = getUserByEmailStmt.get(email);
  if (exists) return res.status(409).json({ error: 'Email already in use' });

  const password_hash = bcrypt.hashSync(password, 10);
  const info = createUserStmt.run({ name, email, password_hash, role: r });
  const user = getUserByIdStmt.get(info.lastInsertRowid);
  const token = signToken({ ...user, email, role: r });
  res.cookie('token', token, cookieOpts);
  res.status(201).json({ user });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const user = getUserByEmailStmt.get(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken(user);
  const safeUser = getUserByIdStmt.get(user.id);
  res.cookie('token', token, cookieOpts).json({ user: safeUser });
});

app.get('/api/auth/me', authRequired, (req, res) => {
  const user = getUserByIdStmt.get(req.user.sub);
  res.json({ user });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token', { ...cookieOpts, maxAge: 0 });
  res.json({ ok: true });
});

// ---------- Intro requests ----------

const createIntroRequestStmt = db.prepare(`
  INSERT INTO intro_requests (consultant_id, sender_name, sender_email, message)
  VALUES (?, ?, ?, ?)
`);
const listRequestsForConsultantStmt = db.prepare(`
  SELECT * FROM intro_requests WHERE consultant_id = ? ORDER BY created_at DESC
`);
const getIntroRequestByIdStmt = db.prepare(`
  SELECT * FROM intro_requests WHERE id = ? AND consultant_id = ?
`);
const linkRequestToWorkspaceStmt = db.prepare(`
  UPDATE intro_requests SET status = ?, workspace_id = ? WHERE id = ? AND consultant_id = ?
`);

app.post('/api/consultants/:id/request-intro', (req, res) => {
  const consultantId = Number(req.params.id);
  const { sender_name, sender_email, message } = req.body || {};
  if (!consultantId || !sender_name || !sender_email) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  createIntroRequestStmt.run(consultantId, sender_name, sender_email, message || '');
  res.status(201).json({ ok: true });
});

app.get('/api/consultants/requests', authRequired, (req, res) => {
  if (req.user.role !== 'consultant') return res.status(403).json({ error: 'Forbidden' });
  const rows = listRequestsForConsultantStmt.all(req.user.sub);
  res.json({ requests: rows });
});

// ---------- Workspaces + RBAC ----------

const createWorkspaceStmt = db.prepare(`
  INSERT INTO workspaces (consultant_id, seller_name, seller_email, seller_user_id, status)
  VALUES (?, ?, ?, NULL, 'active')
`);
const listWorkspacesByConsultantStmt = db.prepare(`SELECT * FROM workspaces WHERE consultant_id = ? ORDER BY created_at DESC`);
const listWorkspacesBySellerStmt = db.prepare(`SELECT * FROM workspaces WHERE seller_user_id = ? ORDER BY created_at DESC`);
const getWorkspaceByIdStmt = db.prepare(`SELECT * FROM workspaces WHERE id = ?`);
const claimByEmailStmt = db.prepare(`
  UPDATE workspaces SET seller_user_id = ?
  WHERE seller_user_id IS NULL AND seller_email = ?
`);

function ensureWorkspaceAccess(req, res, next) {
  const wid = Number(req.params.id);
  const ws = getWorkspaceByIdStmt.get(wid);
  if (!ws) return res.status(404).json({ error: 'Workspace not found' });

  const u = req.user;
  const isConsultant = u.role === 'consultant' && ws.consultant_id === u.sub;
  const isSeller = u.role === 'seller' && ws.seller_user_id === u.sub;
  const isAdmin = u.role === 'admin';
  if (!(isConsultant || isSeller || isAdmin)) return res.status(403).json({ error: 'Forbidden' });

  req.workspace = ws;
  next();
}

app.post('/api/consultants/requests/:id/respond', authRequired, (req, res) => {
  if (req.user.role !== 'consultant') return res.status(403).json({ error: 'Forbidden' });
  const { status } = req.body || {};
  if (!['accepted', 'declined'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const reqId = Number(req.params.id);
  const intro = getIntroRequestByIdStmt.get(reqId, req.user.sub);
  if (!intro) return res.status(404).json({ error: 'Request not found' });

  let workspace_id = intro.workspace_id;
  if (status === 'accepted' && !workspace_id) {
    const info = createWorkspaceStmt.run(req.user.sub, intro.sender_name, intro.sender_email);
    workspace_id = info.lastInsertRowid;
  }
  linkRequestToWorkspaceStmt.run(status, workspace_id || null, reqId, req.user.sub);
  res.json({ ok: true, workspace_id });
});

app.get('/api/workspaces', authRequired, (req, res) => {
  const u = req.user;
  let items = [];
  if (u.role === 'consultant') items = listWorkspacesByConsultantStmt.all(u.sub);
  else if (u.role === 'seller') items = listWorkspacesBySellerStmt.all(u.sub);
  else if (u.role === 'admin') items = db.prepare(`SELECT * FROM workspaces ORDER BY created_at DESC`).all();
  else return res.status(403).json({ error: 'Forbidden' });
  res.json({ items });
});

app.get('/api/workspaces/:id', authRequired, ensureWorkspaceAccess, (req, res) => {
  res.json({ workspace: req.workspace });
});

app.post('/api/workspaces/claim-by-email', authRequired, (req, res) => {
  if (req.user.role !== 'seller') return res.status(403).json({ error: 'Forbidden' });
  const info = claimByEmailStmt.run(req.user.sub, req.user.email);
  res.json({ ok: true, claimed: info.changes });
});

// ---------- Tasks ----------

const listTasksStmt = db.prepare(`SELECT * FROM workspace_tasks WHERE workspace_id = ? ORDER BY created_at DESC`);
const createTaskStmt = db.prepare(`
  INSERT INTO workspace_tasks (workspace_id, title, description, status, assigned_to, due_date)
  VALUES (@workspace_id, @title, @description, 'todo', @assigned_to, @due_date)
`);
const getTaskByIdStmt = db.prepare(`SELECT * FROM workspace_tasks WHERE id = ? AND workspace_id = ?`);
const updateTaskStatusStmt = db.prepare(`UPDATE workspace_tasks SET status = ? WHERE id = ? AND workspace_id = ?`);

app.get('/api/workspaces/:id/tasks', authRequired, ensureWorkspaceAccess, (req, res) => {
  res.json({ items: listTasksStmt.all(req.workspace.id) });
});

app.post('/api/workspaces/:id/tasks', authRequired, ensureWorkspaceAccess, (req, res) => {
  const canCreate = req.user.role === 'consultant' || req.user.role === 'admin';
  if (!canCreate) return res.status(403).json({ error: 'Only consultants can create tasks' });

  const { title, description, assigned_to = 'seller', due_date = null } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Title required' });

  const payload = {
    workspace_id: req.workspace.id,
    title: String(title).slice(0, 200),
    description: description ? String(description).slice(0, 4000) : null,
    assigned_to: ['consultant', 'seller'].includes(assigned_to) ? assigned_to : 'seller',
    due_date
  };
  const info = createTaskStmt.run(payload);
  res.status(201).json({ id: info.lastInsertRowid });
});

app.patch('/api/workspaces/:id/tasks/:taskId', authRequired, ensureWorkspaceAccess, (req, res) => {
  const { status } = req.body || {};
  if (!['todo', 'in_progress', 'done'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const t = getTaskByIdStmt.get(Number(req.params.taskId), req.workspace.id);
  if (!t) return res.status(404).json({ error: 'Task not found' });

  const isConsultant = req.user.role === 'consultant' || req.user.role === 'admin';
  const isSellerAllowed = req.user.role === 'seller' && t.assigned_to === 'seller';
  if (!(isConsultant || isSellerAllowed)) return res.status(403).json({ error: 'Forbidden' });

  updateTaskStatusStmt.run(status, t.id, req.workspace.id);
  res.json({ ok: true });
});

// ---------- Messages ----------

const listMessagesStmt = db.prepare(`SELECT * FROM workspace_messages WHERE workspace_id = ? ORDER BY created_at ASC`);
const createMessageStmt = db.prepare(`INSERT INTO workspace_messages (workspace_id, author, body) VALUES (?, ?, ?)`);

app.get('/api/workspaces/:id/messages', authRequired, ensureWorkspaceAccess, (req, res) => {
  res.json({ items: listMessagesStmt.all(req.workspace.id) });
});

app.post('/api/workspaces/:id/messages', authRequired, ensureWorkspaceAccess, (req, res) => {
  const { body } = req.body || {};
  if (!body) return res.status(400).json({ error: 'Message required' });
  const author = req.user.role === 'seller' ? 'seller' : 'consultant';
  createMessageStmt.run(req.workspace.id, author, String(body).slice(0, 4000));
  res.status(201).json({ ok: true });
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`Auth server running on http://localhost:${PORT}`);
});
