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
// === Profiles: prepared statements ===
const getProfileByUserId = db.prepare('SELECT * FROM consultant_profiles WHERE user_id = ?');
const insertProfile = db.prepare(`
  INSERT INTO consultant_profiles
  (user_id, headline, bio, avatar_url, industries, specialties, location, available, hourly_rate, website, linkedin, github, years_experience, updated_at)
  VALUES (@user_id, @headline, @bio, @avatar_url, @industries, @specialties, @location, @available, @hourly_rate, @website, @linkedin, @github, @years_experience, CURRENT_TIMESTAMP)
`);
const updateProfile = db.prepare(`
  UPDATE consultant_profiles SET
    headline=@headline,
    bio=@bio,
    avatar_url=@avatar_url,
    industries=@industries,
    specialties=@specialties,
    location=@location,
    available=@available,
    hourly_rate=@hourly_rate,
    website=@website,
    linkedin=@linkedin,
    github=@github,
    years_experience=@years_experience,
    updated_at=CURRENT_TIMESTAMP
  WHERE user_id=@user_id
`);

const baseListSql = `
SELECT
  u.id as user_id, u.name, u.email,
  p.headline, p.bio, p.avatar_url, p.industries, p.specialties,
  p.location, p.available, p.hourly_rate, p.website, p.linkedin, p.github,
  p.years_experience, p.updated_at
FROM users u
LEFT JOIN consultant_profiles p ON p.user_id = u.id
WHERE u.role = 'consultant'
`;

// === Profiles: helpers ===
function sanitizeProfilePayload(body, userId) {
  // Accept simple CSV for industries/specialties or arrays; store as JSON
  const toJsonArray = (v) => {
    if (Array.isArray(v)) return JSON.stringify(v.map(s => String(s).trim()).filter(Boolean));
    if (typeof v === 'string') {
      const arr = v.split(',').map(s => s.trim()).filter(Boolean);
      return JSON.stringify(arr);
    }
    return JSON.stringify([]);
  };

  return {
    user_id: userId,
    headline: body.headline?.toString().slice(0, 120) || null,
    bio: body.bio?.toString().slice(0, 4000) || null,
    avatar_url: body.avatar_url?.toString().slice(0, 500) || null,
    industries: toJsonArray(body.industries),
    specialties: toJsonArray(body.specialties),
    location: body.location?.toString().slice(0, 120) || null,
    available: body.available ? 1 : 0,
    hourly_rate: Number.isFinite(Number(body.hourly_rate)) ? Number(body.hourly_rate) : null,
    website: body.website?.toString().slice(0, 200) || null,
    linkedin: body.linkedin?.toString().slice(0, 200) || null,
    github: body.github?.toString().slice(0, 200) || null,
    years_experience: Number.isFinite(Number(body.years_experience)) ? Number(body.years_experience) : null
  };
}

function publicizeProfile(row) {
  // Convert JSON strings back to arrays, hide sensitive fields if needed later
  const parseJson = (s) => {
    try { return s ? JSON.parse(s) : []; } catch { return []; }
  };
  return {
    user_id: row.user_id,
    name: row.name,
    email: row.email,
    headline: row.headline,
    bio: row.bio,
    avatar_url: row.avatar_url,
    industries: parseJson(row.industries),
    specialties: parseJson(row.specialties),
    location: row.location,
    available: !!row.available,
    hourly_rate: row.hourly_rate,
    website: row.website,
    linkedin: row.linkedin,
    github: row.github,
    years_experience: row.years_experience,
    updated_at: row.updated_at
  };
}

// === Profiles: routes ===

// Upsert current consultant profile
app.post('/api/consultants/profile', authRequired, (req, res) => {
  try {
    const uid = req.user.sub;
    // Only consultants can upsert (adjust as needed)
    if (req.user.role !== 'consultant' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const existing = getProfileByUserId.get(uid);
    const payload = sanitizeProfilePayload(req.body, uid);

    if (existing) {
      updateProfile.run(payload);
    } else {
      insertProfile.run(payload);
    }
    const row = db.prepare(baseListSql + ' AND u.id = ?').get(uid);
    return res.json({ profile: publicizeProfile(row) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Profile upsert failed' });
  }
});

// Get my profile
app.get('/api/consultants/me', authRequired, (req, res) => {
  try {
    const uid = req.user.sub;
    const row = db.prepare(baseListSql + ' AND u.id = ?').get(uid);
    if (!row) return res.status(404).json({ error: 'Profile not found' });
    return res.json({ profile: publicizeProfile(row) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// Public: get profile by consultant user id
app.get('/api/consultants/:id', (req, res) => {
  try {
    const row = db.prepare(baseListSql + ' AND u.id = ?').get(Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'Not found' });
    return res.json({ profile: publicizeProfile(row) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// Public: list consultants with filters and pagination
app.get('/api/consultants', (req, res) => {
  try {
    const { q, industry, location, available, limit = 20, offset = 0 } = req.query;
    const where = [];
    const params = [];

    if (q) {
      where.push('(u.name LIKE ? OR p.bio LIKE ? OR p.headline LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (industry) {
      // JSON string contains check (simple LIKE for MVP)
      where.push('p.industries LIKE ?');
      params.push(`%${industry}%`);
    }
    if (location) {
      where.push('p.location LIKE ?');
      params.push(`%${location}%`);
    }
    if (available === '1' || available === '0') {
      where.push('p.available = ?');
      params.push(Number(available));
    }

    const sql =
      baseListSql +
      (where.length ? ` AND ${where.join(' AND ')}` : '') +
      ' ORDER BY p.updated_at DESC NULLS LAST, u.created_at DESC ' +
      ' LIMIT ? OFFSET ?';

    const rows = db.prepare(sql).all(...params, Number(limit), Number(offset));
    const items = rows.map(publicizeProfile);

    // Simple count (not exact if filters complex, good enough for MVP)
    const countSql =
      'SELECT COUNT(*) as c FROM (' +
      baseListSql +
      (where.length ? ` AND ${where.join(' AND ')}` : '') +
      ')';
    const total = db.prepare(countSql).get(...params).c;

    res.json({ items, total, limit: Number(limit), offset: Number(offset) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'List failed' });
  }
});
const createIntroRequest = db.prepare(`
  INSERT INTO intro_requests (consultant_id, sender_name, sender_email, message)
  VALUES (?, ?, ?, ?)
`);

const getRequestsForConsultant = db.prepare(`
  SELECT * FROM intro_requests WHERE consultant_id = ? ORDER BY created_at DESC
`);

const updateRequestStatus = db.prepare(`
  UPDATE intro_requests SET status = ? WHERE id = ? AND consultant_id = ?
`);

// Create intro request (public)
app.post('/api/consultants/:id/request-intro', async (req, res) => {
  try {
    const { sender_name, sender_email, message } = req.body;
    const consultantId = Number(req.params.id);
    if (!sender_name || !sender_email) return res.status(400).json({ error: 'Missing fields' });

    createIntroRequest.run(consultantId, sender_name, sender_email, message || '');
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Intro request failed' });
  }
});

// Consultant views incoming requests
app.get('/api/consultants/requests', authRequired, (req, res) => {
  if (req.user.role !== 'consultant') return res.status(403).json({ error: 'Forbidden' });
  const rows = getRequestsForConsultant.all(req.user.sub);
  res.json({ requests: rows });
});

// Consultant responds to request
app.post('/api/consultants/requests/:id/respond', authRequired, (req, res) => {
  if (req.user.role !== 'consultant') return res.status(403).json({ error: 'Forbidden' });
  const { status } = req.body;
  const valid = ['accepted', 'declined'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  updateRequestStatus.run(status, Number(req.params.id), req.user.sub);
  res.json({ ok: true });
});
