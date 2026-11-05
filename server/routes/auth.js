const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/login (Standard email/password login)
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: 'This account has been deactivated. Please contact your admin.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    invite_token: user.invite_token,
    status: user.status
  };

  res.json({ token, user: safeUser });
});

// GET /api/auth/join/:token (Unique 1-Click Counsellor Access Link)
router.get('/join/:token', (req, res) => {
  const inviteToken = req.params.token;
  if (!inviteToken) {
    return res.status(400).json({ error: 'Access token is required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE invite_token = ?').get(inviteToken.trim());
  if (!user) {
    return res.status(404).json({ error: 'Invalid or expired unique access link.' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: 'This counsellor account is inactive. Please contact your administrator.' });
  }

  // Generate session JWT token
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    invite_token: user.invite_token,
    status: user.status
  };

  res.json({
    token,
    user: safeUser,
    message: `Welcome ${user.name}! You are now logged into your personal workstation.`
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/profile
router.put('/profile', requireAuth, (req, res) => {
  const { name, phone, password } = req.body;
  const userId = req.user.id;

  if (password && password.trim().length >= 6) {
    const passwordHash = bcrypt.hashSync(password.trim(), 10);
    db.prepare(`
      UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), password = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(name, phone, passwordHash, userId);
  } else {
    db.prepare(`
      UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), updated_at = datetime('now')
      WHERE id = ?
    `).run(name, phone, userId);
  }

  const updatedUser = db.prepare('SELECT id, name, email, role, phone, invite_token, status FROM users WHERE id = ?').get(userId);
  res.json({ user: updatedUser, message: 'Profile updated successfully.' });
});

// GET /api/auth/demo-accounts
router.get('/demo-accounts', (req, res) => {
  const accounts = db.prepare("SELECT id, name, email, role, phone, invite_token FROM users WHERE status = 'active' ORDER BY role ASC, id ASC").all();
  res.json({ accounts });
});

module.exports = router;
