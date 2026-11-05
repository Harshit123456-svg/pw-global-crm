const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const googleSheetsService = require('../services/googleSheetsService');

// All recognized stages matching user's exact specification & screenshot
const CRM_STAGES = [
  'New Lead',
  'DNP/ WA sent',
  'Dropped',
  'Enrolled',
  'Future Prospect',
  'Not Connecting',
  'Requested WA',
  'Prospect',
  'Call Back later',
  'Profile Buidling',
  'Requested Email',
  'DNP',
  'PB Form Sent',
  'Future Prospect PB',
  'Hung up after intro',
  'PB Session Booked'
];

// GET /api/leads/pipeline-counts
router.get('/pipeline-counts', requireAuth, (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const userId = req.user.id;

  let baseWhere = '1=1';
  let params = [];

  // Counsellors see counts for their own pipeline only; Admin sees ALL team leads
  if (!isAdmin) {
    baseWhere += ' AND (assigned_user_id = ? OR assigned_user_id IS NULL)';
    params.push(userId);
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE ${baseWhere}`).get(...params).count;
  const important = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE ${baseWhere} AND is_important = 1`).get(...params).count;

  // Due today follow-ups
  const dueToday = db.prepare(`
    SELECT COUNT(*) as count FROM leads 
    WHERE ${baseWhere} AND follow_up_date IS NOT NULL 
    AND date(follow_up_date) = date('now', 'localtime')
    AND stage NOT IN ('Enrolled', 'Dropped')
  `).get(...params).count;

  // Overdue follow-ups
  const overdue = db.prepare(`
    SELECT COUNT(*) as count FROM leads 
    WHERE ${baseWhere} AND follow_up_date IS NOT NULL 
    AND datetime(follow_up_date) < datetime('now', 'localtime')
    AND date(follow_up_date) != date('now', 'localtime')
    AND stage NOT IN ('Enrolled', 'Dropped')
  `).get(...params).count;

  // PB Sessions Booked (matching PB Session Booked or Demo Booked)
  const pbSessionsBooked = db.prepare(`
    SELECT COUNT(*) as count FROM leads 
    WHERE ${baseWhere} AND (stage = 'PB Session Booked' OR stage = 'Demo Booked')
  `).get(...params).count;

  // Enrolled
  const enrolled = db.prepare(`
    SELECT COUNT(*) as count FROM leads 
    WHERE ${baseWhere} AND stage = 'Enrolled'
  `).get(...params).count;

  // Count per each individual stage
  const stageCounts = db.prepare(`
    SELECT stage, COUNT(*) as count 
    FROM leads 
    WHERE ${baseWhere} 
    GROUP BY stage
  `).all(...params);

  const stagesMap = {};
  CRM_STAGES.forEach(st => {
    stagesMap[st] = 0;
  });

  stageCounts.forEach(s => {
    stagesMap[s.stage] = s.count;
  });

  res.json({
    total,
    important,
    dueToday,
    overdue,
    pbSessionsBooked,
    enrolled,
    byStage: stagesMap
  });
});

// GET /api/leads (List leads with filters - Admin sees ALL team leads by default)
router.get('/', requireAuth, (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const userId = req.user.id;

  const {
    stage,
    sheet_id,
    counsellor_id,
    is_important,
    priority,
    follow_up_filter,
    search,
    limit = 500,
    offset = 0
  } = req.query;

  let query = `
    SELECT l.*, 
           u.name as counsellor_name, u.phone as counsellor_phone, u.email as counsellor_email,
           s.name as sheet_name_title
    FROM leads l
    LEFT JOIN users u ON l.assigned_user_id = u.id
    LEFT JOIN sheets s ON l.sheet_id = s.id
    WHERE 1=1
  `;
  const params = [];

  // Role constraint:
  // - Counsellor sees ONLY their assigned leads (or unassigned if any)
  // - Admin sees ALL leads from ALL counsellors unless explicitly filtering by counsellor_id
  if (!isAdmin) {
    query += ' AND (l.assigned_user_id = ? OR l.assigned_user_id IS NULL)';
    params.push(userId);
  } else if (counsellor_id) {
    if (counsellor_id === 'unassigned') {
      query += ' AND l.assigned_user_id IS NULL';
    } else {
      query += ' AND l.assigned_user_id = ?';
      params.push(counsellor_id);
    }
  }

  if (stage) {
    if (stage === 'PB Session Booked') {
      query += " AND (l.stage = 'PB Session Booked' OR l.stage = 'Demo Booked')";
    } else {
      query += ' AND l.stage = ?';
      params.push(stage);
    }
  }

  if (sheet_id) {
    query += ' AND l.sheet_id = ?';
    params.push(sheet_id);
  }

  if (is_important === '1' || is_important === 'true') {
    query += ' AND l.is_important = 1';
  }

  if (priority) {
    query += ' AND l.priority = ?';
    params.push(priority);
  }

  if (follow_up_filter === 'today') {
    query += " AND date(l.follow_up_date) = date('now', 'localtime')";
  } else if (follow_up_filter === 'overdue') {
    query += " AND datetime(l.follow_up_date) < datetime('now', 'localtime') AND date(l.follow_up_date) != date('now', 'localtime')";
  } else if (follow_up_filter === 'upcoming') {
    query += " AND date(l.follow_up_date) > date('now', 'localtime')";
  }

  if (search) {
    const term = `%${search.trim()}%`;
    query += ` AND (
      l.name LIKE ? OR l.phone LIKE ? OR l.alt_phone LIKE ? OR l.email LIKE ? OR 
      l.student_email LIKE ? OR l.parent_email LIKE ? OR l.school LIKE ? OR 
      l.course_interest LIKE ? OR l.notes LIKE ? OR u.name LIKE ?
    )`;
    params.push(term, term, term, term, term, term, term, term, term, term);
  }

  query += ' ORDER BY l.is_important DESC, l.updated_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const leads = db.prepare(query).all(...params);
  res.json({ leads, count: leads.length });
});

// GET /api/leads/:id
router.get('/:id', requireAuth, (req, res) => {
  const leadId = req.params.id;
  const lead = db.prepare(`
    SELECT l.*, 
           u.name as counsellor_name, u.phone as counsellor_phone, u.email as counsellor_email,
           s.name as sheet_name_title, s.spreadsheet_id
    FROM leads l
    LEFT JOIN users u ON l.assigned_user_id = u.id
    LEFT JOIN sheets s ON l.sheet_id = s.id
    WHERE l.id = ?
  `).get(leadId);

  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  // Counsellors can only view assigned or unassigned leads
  if (req.user.role !== 'admin' && lead.assigned_user_id && lead.assigned_user_id !== req.user.id) {
    return res.status(403).json({ error: 'You do not have permission to view this lead' });
  }

  const activities = db.prepare(`
    SELECT a.*, u.name as user_name, u.role as user_role
    FROM lead_activities a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.lead_id = ?
    ORDER BY a.created_at DESC
  `).all(leadId);

  res.json({ lead, activities });
});

// POST /api/leads (Create Lead)
router.post('/', requireAuth, (req, res) => {
  const {
    name,
    email,
    phone,
    alt_phone,
    source = 'Manual Entry',
    school,
    student_email,
    parent_email,
    course_interest,
    stage = 'New Lead',
    priority = 'Normal',
    is_important = 0,
    notes,
    assigned_user_id
  } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and Phone number are required' });
  }

  // Only admin can assign to another user; counsellors automatically own their created lead
  const targetAssignedUser = req.user.role === 'admin' ? (assigned_user_id || req.user.id) : req.user.id;

  const result = db.prepare(`
    INSERT INTO leads (
      name, email, phone, alt_phone, source, school, student_email, parent_email,
      course_interest, stage, priority, is_important, assigned_user_id, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name.trim(),
    email ? email.trim() : null,
    phone.trim(),
    alt_phone ? alt_phone.trim() : null,
    source.trim(),
    school ? school.trim() : null,
    student_email ? student_email.trim() : null,
    parent_email ? parent_email.trim() : null,
    course_interest ? course_interest.trim() : null,
    stage,
    priority,
    is_important ? 1 : 0,
    targetAssignedUser,
    notes ? notes.trim() : null
  );

  const leadId = result.lastInsertRowid;

  db.prepare(`
    INSERT INTO lead_activities (lead_id, user_id, activity_type, to_stage, notes)
    VALUES (?, ?, 'created', ?, 'Lead created manually by ' || ?)
  `).run(leadId, req.user.id, stage, req.user.name);

  const newLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
  res.status(201).json({ lead: newLead, message: 'Lead created successfully' });
});

// PUT /api/leads/:id (Update lead details - Counsellors CANNOT change owner or edit past notes)
router.put('/:id', requireAuth, async (req, res) => {
  const leadId = req.params.id;
  const isAdmin = req.user.role === 'admin';

  const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
  if (!existing) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  // Counsellors can only update leads assigned to them
  if (!isAdmin && existing.assigned_user_id && existing.assigned_user_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden. You can only update your own assigned leads.' });
  }

  const {
    name,
    email,
    phone,
    alt_phone,
    source,
    school,
    student_email,
    parent_email,
    course_interest,
    priority,
    is_important,
    assigned_user_id // Only Admin can change this
  } = req.body;

  // Enforce: Counsellors CANNOT change the owner of leads
  const targetOwner = isAdmin && assigned_user_id !== undefined ? assigned_user_id : existing.assigned_user_id;

  // Log reassignment if Admin changed owner
  if (isAdmin && assigned_user_id !== undefined && assigned_user_id !== existing.assigned_user_id) {
    const targetUser = assigned_user_id ? db.prepare('SELECT name FROM users WHERE id = ?').get(assigned_user_id) : null;
    const targetName = targetUser ? targetUser.name : 'Unassigned';
    db.prepare(`
      INSERT INTO lead_activities (lead_id, user_id, activity_type, notes)
      VALUES (?, ?, 'reassigned', 'Lead owner changed to ' || ?)
    `).run(leadId, req.user.id, targetName);
  }

  // Notice: notes is NOT updated here! Notes are strictly append-only via /api/leads/:id/notes
  db.prepare(`
    UPDATE leads 
    SET name = COALESCE(?, name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        alt_phone = COALESCE(?, alt_phone),
        source = COALESCE(?, source),
        school = COALESCE(?, school),
        student_email = COALESCE(?, student_email),
        parent_email = COALESCE(?, parent_email),
        course_interest = COALESCE(?, course_interest),
        priority = COALESCE(?, priority),
        is_important = COALESCE(?, is_important),
        assigned_user_id = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name, email, phone, alt_phone, source, school, student_email, parent_email,
    course_interest, priority, is_important, targetOwner, leadId
  );

  // Sync to sheet
  try {
    await googleSheetsService.writebackToGoogleSheet(leadId);
  } catch (err) {
    console.error('Writeback error:', err.message);
  }

  const updatedLead = db.prepare(`
    SELECT l.*, u.name as counsellor_name, s.name as sheet_name_title
    FROM leads l
    LEFT JOIN users u ON l.assigned_user_id = u.id
    LEFT JOIN sheets s ON l.sheet_id = s.id
    WHERE l.id = ?
  `).get(leadId);

  res.json({ lead: updatedLead, message: 'Lead updated successfully' });
});

// PUT /api/leads/:id/stage (Update Stage & Trigger Google Sheets Writeback)
router.put('/:id/stage', requireAuth, async (req, res) => {
  const leadId = req.params.id;
  const { stage, notes } = req.body;

  if (!stage) {
    return res.status(400).json({ error: 'Stage is required' });
  }

  const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
  if (!existing) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  // Counsellors can only update their own leads
  if (req.user.role !== 'admin' && existing.assigned_user_id && existing.assigned_user_id !== req.user.id) {
    return res.status(403).json({ error: 'You do not have permission to update this lead' });
  }

  const fromStage = existing.stage;
  // Notes are strictly append-only
  const timestamp = new Date().toLocaleString();
  const stageNote = `[${timestamp} - ${req.user.name}]: Stage changed to "${stage}"` + (notes ? ` - ${notes}` : '');
  const updatedNotes = existing.notes ? `${stageNote}\n\n${existing.notes}` : stageNote;

  db.prepare(`
    UPDATE leads 
    SET stage = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(stage, updatedNotes, leadId);

  // Record activity
  db.prepare(`
    INSERT INTO lead_activities (lead_id, user_id, activity_type, from_stage, to_stage, notes)
    VALUES (?, ?, 'stage_change', ?, ?, ?)
  `).run(leadId, req.user.id, fromStage, stage, notes || `Stage updated from "${fromStage}" to "${stage}"`);

  // Write back to Google Sheet
  try {
    await googleSheetsService.writebackToGoogleSheet(leadId);
  } catch (err) {
    console.error('Writeback error on stage change:', err.message);
  }

  const updatedLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
  res.json({ lead: updatedLead, message: `Stage updated to ${stage}` });
});

// PUT /api/leads/:id/notes (Append note & call log - Strictly APPEND-ONLY, old notes can NEVER be edited or deleted!)
router.put('/:id/notes', requireAuth, async (req, res) => {
  const leadId = req.params.id;
  const { note, isCallLog = false } = req.body;

  if (!note || !note.trim()) {
    return res.status(400).json({ error: 'Note text cannot be empty' });
  }

  const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
  if (!existing) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  // Counsellors can only add notes to their own leads
  if (req.user.role !== 'admin' && existing.assigned_user_id && existing.assigned_user_id !== req.user.id) {
    return res.status(403).json({ error: 'You do not have permission to update notes on this lead' });
  }

  // Strictly append new note to the top of existing notes. Historical notes are IMMUTABLE.
  const timestamp = new Date().toLocaleString();
  const noteEntry = `[${timestamp} - ${req.user.name}]: ${note.trim()}`;
  const combinedNotes = existing.notes ? `${noteEntry}\n\n${existing.notes}` : noteEntry;

  db.prepare(`
    UPDATE leads 
    SET notes = ?, last_contacted_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).run(combinedNotes, leadId);

  db.prepare(`
    INSERT INTO lead_activities (lead_id, user_id, activity_type, notes)
    VALUES (?, ?, ?, ?)
  `).run(leadId, req.user.id, isCallLog ? 'call_logged' : 'note_added', note.trim());

  // Also sync note to Google Sheet
  try {
    await googleSheetsService.writebackToGoogleSheet(leadId);
  } catch (err) {
    console.error('Writeback error on note update:', err.message);
  }

  const updatedLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
  res.json({ lead: updatedLead, message: 'Note recorded successfully' });
});

// PUT /api/leads/:id/book-demo (Book PB / Demo Session -> updates stage to 'PB Session Booked')
router.put('/:id/book-demo', requireAuth, async (req, res) => {
  const leadId = req.params.id;
  const { demo_date, demo_topic, demo_link, notes, stage = 'PB Session Booked' } = req.body;

  if (!demo_date) {
    return res.status(400).json({ error: 'Session date and time are required' });
  }

  const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
  if (!existing) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  if (req.user.role !== 'admin' && existing.assigned_user_id && existing.assigned_user_id !== req.user.id) {
    return res.status(403).json({ error: 'You do not have permission to book a session on this lead' });
  }

  const fromStage = existing.stage;
  const targetStage = stage || 'PB Session Booked';
  const timestamp = new Date().toLocaleString();
  const sessionNote = `[${timestamp} - ${req.user.name}]: PB Session Booked for ${new Date(demo_date).toLocaleString()} (${demo_topic || 'Profile Building Session'})` + (notes ? ` - ${notes}` : '');
  const combinedNotes = existing.notes ? `${sessionNote}\n\n${existing.notes}` : sessionNote;

  db.prepare(`
    UPDATE leads 
    SET demo_date = ?, demo_topic = ?, demo_link = ?, demo_attendance = 'Scheduled',
        stage = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(demo_date, demo_topic || 'Profile Building & Academic Evaluation', demo_link || '', targetStage, combinedNotes, leadId);

  db.prepare(`
    INSERT INTO lead_activities (lead_id, user_id, activity_type, from_stage, to_stage, notes)
    VALUES (?, ?, 'demo_booked', ?, ?, ?)
  `).run(leadId, req.user.id, fromStage, targetStage, sessionNote);

  // Write back to Google Sheet
  try {
    await googleSheetsService.writebackToGoogleSheet(leadId);
  } catch (err) {
    console.error('Writeback error on demo booked:', err.message);
  }

  const updatedLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
  res.json({ lead: updatedLead, message: 'PB Session booked successfully!' });
});

// PUT /api/leads/:id/follow-up (Set follow up timing)
router.put('/:id/follow-up', requireAuth, (req, res) => {
  const leadId = req.params.id;
  const { follow_up_date, follow_up_notes } = req.body;

  if (!follow_up_date) {
    return res.status(400).json({ error: 'Follow up date and time are required' });
  }

  const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
  if (!existing) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  if (req.user.role !== 'admin' && existing.assigned_user_id && existing.assigned_user_id !== req.user.id) {
    return res.status(403).json({ error: 'You do not have permission to schedule follow-ups on this lead' });
  }

  db.prepare(`
    UPDATE leads 
    SET follow_up_date = ?, follow_up_notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(follow_up_date, follow_up_notes || '', leadId);

  db.prepare(`
    INSERT INTO lead_activities (lead_id, user_id, activity_type, notes)
    VALUES (?, ?, 'follow_up_scheduled', ?)
  `).run(leadId, req.user.id, `Follow-up scheduled for: ${new Date(follow_up_date).toLocaleString()}` + (follow_up_notes ? ` - ${follow_up_notes}` : ''));

  const updatedLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
  res.json({ lead: updatedLead, message: 'Follow-up scheduled successfully' });
});

// PUT /api/leads/:id/star (Toggle important)
router.put('/:id/star', requireAuth, (req, res) => {
  const leadId = req.params.id;
  const lead = db.prepare('SELECT id, is_important FROM leads WHERE id = ?').get(leadId);
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  const newStatus = lead.is_important ? 0 : 1;
  db.prepare(`UPDATE leads SET is_important = ?, updated_at = datetime('now') WHERE id = ?`).run(newStatus, leadId);

  res.json({ id: leadId, is_important: newStatus });
});

// PUT /api/leads/:id/assign (ADMIN ONLY - Counsellors have NO access to change lead owner!)
router.put('/:id/assign', requireAdmin, (req, res) => {
  const leadId = req.params.id;
  const { assigned_user_id } = req.body;

  const targetUser = assigned_user_id ? db.prepare('SELECT id, name FROM users WHERE id = ?').get(assigned_user_id) : null;
  const userName = targetUser ? targetUser.name : 'Unassigned';

  db.prepare(`UPDATE leads SET assigned_user_id = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(assigned_user_id || null, leadId);

  db.prepare(`
    INSERT INTO lead_activities (lead_id, user_id, activity_type, notes)
    VALUES (?, ?, 'reassigned', 'Lead owner assigned to ' || ?)
  `).run(leadId, req.user.id, userName);

  const updatedLead = db.prepare(`
    SELECT l.*, u.name as counsellor_name, s.name as sheet_name_title
    FROM leads l
    LEFT JOIN users u ON l.assigned_user_id = u.id
    LEFT JOIN sheets s ON l.sheet_id = s.id
    WHERE l.id = ?
  `).get(leadId);

  res.json({ lead: updatedLead, message: `Lead assigned to ${userName}` });
});

// POST /api/leads/bulk-assign (ADMIN ONLY - Assign multiple leads to any counsellor)
router.post('/bulk-assign', requireAdmin, (req, res) => {
  const { lead_ids, assigned_user_id } = req.body;

  if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
    return res.status(400).json({ error: 'lead_ids array is required' });
  }

  const targetUser = assigned_user_id ? db.prepare('SELECT id, name FROM users WHERE id = ?').get(assigned_user_id) : null;
  const userName = targetUser ? targetUser.name : 'Unassigned';

  const placeholders = lead_ids.map(() => '?').join(',');
  db.prepare(`UPDATE leads SET assigned_user_id = ?, updated_at = datetime('now') WHERE id IN (${placeholders})`)
    .run(assigned_user_id || null, ...lead_ids);

  lead_ids.forEach(lid => {
    db.prepare(`
      INSERT INTO lead_activities (lead_id, user_id, activity_type, notes)
      VALUES (?, ?, 'reassigned', 'Bulk assigned to ' || ?)
    `).run(lid, req.user.id, userName);
  });

  res.json({ message: `Successfully assigned ${lead_ids.length} leads to ${userName}` });
});

// POST /api/leads/bulk-import (ADMIN ONLY - High-speed atomic import of leads from CSV / Table)
router.post('/bulk-import', requireAdmin, (req, res) => {
  const { leads, assignment_mode = 'round_robin', assigned_user_id = null, source_name = 'Bulk Upload' } = req.body;

  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: 'leads array is required and must not be empty' });
  }

  const activeCounsellors = db.prepare("SELECT id, name FROM users WHERE role = 'counsellor' AND status = 'active' ORDER BY id ASC").all();
  let counsellorIdx = 0;

  const resolveAssignee = () => {
    if (assignment_mode === 'specific_user' && assigned_user_id) {
      return assigned_user_id;
    }
    if (assignment_mode === 'round_robin' && activeCounsellors.length > 0) {
      const id = activeCounsellors[counsellorIdx % activeCounsellors.length].id;
      counsellorIdx++;
      return id;
    }
    return null;
  };

  let importedCount = 0;
  let updatedCount = 0;

  const importTx = db.transaction(() => {
    for (const lead of leads) {
      const name = (lead.name || lead['Student Name'] || lead['Name'] || '').trim();
      const phone = (lead.phone || lead['Phone'] || lead['Phone Number'] || lead['Mobile'] || '').trim();
      if (!name && !phone) continue;

      const alt_phone = (lead.alt_phone || lead['Alternative Number'] || lead['Alt Phone'] || '').trim();
      const email = (lead.email || lead['Email'] || lead['E-mail'] || '').trim();
      const student_email = (lead.student_email || lead['Student Email'] || lead['Student E-mail ID'] || '').trim();
      const parent_email = (lead.parent_email || lead['Parent Email'] || lead['Parent E-mail ID'] || '').trim();
      const school = (lead.school || lead['School'] || '').trim();
      const source = (lead.source || lead['Source'] || source_name).trim();
      const stage = (lead.stage || lead['Current Status'] || lead['Stage'] || 'New Lead').trim();
      const course = (lead.course_interest || lead['Course'] || lead['Interest'] || 'General Inquiry').trim();
      const notes = (lead.notes || lead['Notes'] || 'Imported via Bulk Upload').trim();

      // Check existing by phone
      const existing = phone ? db.prepare('SELECT id FROM leads WHERE phone = ?').get(phone) : null;

      if (existing) {
        db.prepare(`
          UPDATE leads 
          SET name = COALESCE(NULLIF(?, ''), name),
              alt_phone = COALESCE(NULLIF(?, ''), alt_phone),
              email = COALESCE(NULLIF(?, ''), email),
              student_email = COALESCE(NULLIF(?, ''), student_email),
              parent_email = COALESCE(NULLIF(?, ''), parent_email),
              school = COALESCE(NULLIF(?, ''), school),
              course_interest = COALESCE(NULLIF(?, ''), course_interest),
              updated_at = datetime('now')
          WHERE id = ?
        `).run(name, alt_phone, email, student_email, parent_email, school, course, existing.id);
        updatedCount++;
      } else {
        const ownerId = resolveAssignee();
        const newId = db.prepare(`
          INSERT INTO leads (
            name, phone, alt_phone, email, student_email, parent_email,
            school, source, course_interest, stage, priority, assigned_user_id, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Normal', ?, ?)
        `).run(
          name || 'Anonymous', phone, alt_phone, email, student_email, parent_email,
          school, source, course, stage, ownerId, notes
        ).lastInsertRowid;

        db.prepare(`
          INSERT INTO lead_activities (lead_id, user_id, activity_type, to_stage, notes)
          VALUES (?, ?, 'created', ?, 'Imported via Bulk Lead Upload')
        `).run(newId, ownerId, stage);

        importedCount++;
      }
    }
  });

  importTx();

  res.json({
    success: true,
    imported: importedCount,
    updated: updatedCount,
    total: importedCount + updatedCount,
    message: `High-speed import completed: ${importedCount} created, ${updatedCount} updated.`
  });
});

// DELETE /api/leads/:id (ADMIN ONLY)
router.delete('/:id', requireAdmin, (req, res) => {
  const leadId = req.params.id;
  db.prepare('DELETE FROM leads WHERE id = ?').run(leadId);
  res.json({ message: 'Lead deleted successfully' });
});

module.exports = router;
