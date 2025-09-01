// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true
}));

// Helpers
function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authRequired(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// DB statements
const getUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const createUser = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');
const getUserById = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?');

// Routes

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Register consultant (for MVP simplicity, open registration)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role = 'consultant' } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

    const existing = getUserByEmail.get(email.toLowerCase());
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const hash = await bcrypt.hash(password, 12);
    const info = createUser.run(name, email.toLowerCase(), hash, role);
    const user = getUserById.get(info.lastInsertRowid);

    const token = signToken(user);
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // set to true when using HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.status(201).json({ user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login consultant
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

    const user = getUserByEmail.get(email.toLowerCase());
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const publicUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    const token = signToken(publicUser);

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // set to true when using HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.json({ user: publicUser });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Current user
app.get('/api/auth/me', authRequired, (req, res) => {
  const user = getUserById.get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ user });
});

// Logout
app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: false });
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Auth server running on http://localhost:${PORT}`);
});
