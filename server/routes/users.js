const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

// GET /api/users/counsellors (dropdown helper for assignments)
router.get('/counsellors', requireAuth, (req, res) => {
  const counsellors = db.prepare(`
    SELECT id, name, email, phone, role, invite_token 
    FROM users 
    WHERE role = 'counsellor' AND status = 'active'
    ORDER BY name ASC
  `).all();
  res.json({ counsellors });
});

// GET /api/users (Admin team dashboard with performance & invite tokens)
router.get('/', requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.phone, u.invite_token, u.status, u.created_at,
           (SELECT COUNT(*) FROM leads WHERE assigned_user_id = u.id) as total_leads,
           (SELECT COUNT(*) FROM leads WHERE assigned_user_id = u.id AND (stage = 'PB Session Booked' OR stage = 'Demo Booked')) as demos_booked,
           (SELECT COUNT(*) FROM leads WHERE assigned_user_id = u.id AND stage = 'Enrolled') as enrolled,
           (SELECT COUNT(*) FROM leads WHERE assigned_user_id = u.id AND follow_up_date IS NOT NULL AND date(follow_up_date) = date('now', 'localtime')) as due_today_followups,
           (SELECT COUNT(*) FROM lead_activities WHERE user_id = u.id AND activity_type = 'call_logged') as calls_logged
    FROM users u
    ORDER BY u.role ASC, u.name ASC
  `).all();

  res.json({ users });
});

// POST /api/users (Admin create new counsellor / team member with unique invite token)
router.post('/', requireAdmin, (req, res) => {
  const { name, email, password, role = 'counsellor', phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, Email, and Password are required.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (existing) {
    return res.status(400).json({ error: 'A team member with this email already exists.' });
  }

  const passwordHash = bcrypt.hashSync(password.trim(), 10);
  const inviteToken = generateToken();

  const result = db.prepare(`
    INSERT INTO users (name, email, password, role, phone, invite_token, status)
    VALUES (?, ?, ?, ?, ?, ?, 'active')
  `).run(name.trim(), email.trim(), passwordHash, role, phone ? phone.trim() : null, inviteToken);

  const newUser = db.prepare('SELECT id, name, email, role, phone, invite_token, status FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ user: newUser, message: `Team member ${newUser.name} created successfully!` });
});

// POST /api/users/:id/regenerate-link (Regenerate unique invite token)
router.post('/:id/regenerate-link', requireAdmin, (req, res) => {
  const userId = req.params.id;
  const user = db.prepare('SELECT id, name FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const newToken = generateToken();
  db.prepare(`UPDATE users SET invite_token = ?, updated_at = datetime('now') WHERE id = ?`).run(newToken, userId);

  res.json({ invite_token: newToken, message: `New unique access link generated for ${user.name}` });
});

// PUT /api/users/:id (Admin update user)
router.put('/:id', requireAdmin, (req, res) => {
  const userId = req.params.id;
  const { name, email, password, role, phone, status } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (password && password.trim().length >= 6) {
    const passwordHash = bcrypt.hashSync(password.trim(), 10);
    db.prepare(`
      UPDATE users 
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          password = ?,
          role = COALESCE(?, role),
          phone = COALESCE(?, phone),
          status = COALESCE(?, status),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(name, email, passwordHash, role, phone, status, userId);
  } else {
    db.prepare(`
      UPDATE users 
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          role = COALESCE(?, role),
          phone = COALESCE(?, phone),
          status = COALESCE(?, status),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(name, email, role, phone, status, userId);
  }

  const updatedUser = db.prepare('SELECT id, name, email, role, phone, invite_token, status FROM users WHERE id = ?').get(userId);
  res.json({ user: updatedUser, message: 'Team member updated successfully.' });
});

// DELETE /api/users/:id (Admin deactivate user)
router.delete('/:id', requireAdmin, (req, res) => {
  const userId = req.params.id;
  if (parseInt(userId) === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own admin account.' });
  }

  db.prepare("UPDATE users SET status = 'inactive', updated_at = datetime('now') WHERE id = ?").run(userId);
  res.json({ message: 'User account deactivated.' });
});

module.exports = router;
