const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const googleSheetsService = require('../services/googleSheetsService');

// Helper to extract clean spreadsheet ID from full URL or raw ID
function extractSpreadsheetId(input) {
  if (!input) return '';
  const clean = input.trim();
  const match = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : clean;
}

// GET /api/sheets (List all sheets)
router.get('/', requireAuth, (req, res) => {
  const sheets = db.prepare(`
    SELECT s.*, u.name as default_counsellor_name,
           (SELECT COUNT(*) FROM leads WHERE sheet_id = s.id) as actual_leads_count,
           (SELECT COUNT(*) FROM leads WHERE sheet_id = s.id AND stage = 'Demo Booked') as demo_booked_count,
           (SELECT COUNT(*) FROM leads WHERE sheet_id = s.id AND stage = 'Enrolled / Converted') as enrolled_count
    FROM sheets s
    LEFT JOIN users u ON s.default_assigned_user_id = u.id
    ORDER BY s.id DESC
  `).all();

  res.json({ sheets });
});

// GET /api/sheets/:id
router.get('/:id', requireAuth, (req, res) => {
  const sheet = db.prepare(`
    SELECT s.*, u.name as default_counsellor_name
    FROM sheets s
    LEFT JOIN users u ON s.default_assigned_user_id = u.id
    WHERE s.id = ?
  `).get(req.params.id);

  if (!sheet) {
    return res.status(404).json({ error: 'Sheet configuration not found' });
  }

  res.json({ sheet });
});

// POST /api/sheets (Add new sheet)
router.post('/', requireAdmin, (req, res) => {
  const {
    name,
    spreadsheet_id,
    sheet_name = 'Sheet1',
    assignment_mode = 'round_robin',
    default_assigned_user_id,
    column_mapping,
    service_account_key,
    sync_interval_minutes = 15
  } = req.body;

  if (!name || !spreadsheet_id) {
    return res.status(400).json({ error: 'Sheet Name and Google Spreadsheet ID or URL are required.' });
  }

  const cleanId = extractSpreadsheetId(spreadsheet_id);
  const mappingJson = typeof column_mapping === 'object' ? JSON.stringify(column_mapping) : (column_mapping || JSON.stringify({
    name: 'A',
    phone: 'B',
    email: 'C',
    course_interest: 'D',
    stage: 'E',
    notes: 'F'
  }));

  const result = db.prepare(`
    INSERT INTO sheets (
      name, spreadsheet_id, sheet_name, assignment_mode, default_assigned_user_id,
      column_mapping, service_account_key, sync_interval_minutes, last_synced_at, last_sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'pending')
  `).run(
    name.trim(),
    cleanId,
    sheet_name.trim() || 'Sheet1',
    assignment_mode,
    default_assigned_user_id || null,
    mappingJson,
    service_account_key ? (typeof service_account_key === 'object' ? JSON.stringify(service_account_key) : service_account_key.trim()) : null,
    parseInt(sync_interval_minutes) || 15
  );

  const newSheet = db.prepare('SELECT * FROM sheets WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ sheet: newSheet, message: 'Google Sheet added successfully!' });
});

// PUT /api/sheets/:id (Update sheet configuration)
router.put('/:id', requireAdmin, (req, res) => {
  const sheetId = req.params.id;
  const {
    name,
    spreadsheet_id,
    sheet_name,
    assignment_mode,
    default_assigned_user_id,
    column_mapping,
    service_account_key,
    sync_interval_minutes,
    is_active
  } = req.body;

  const existing = db.prepare('SELECT * FROM sheets WHERE id = ?').get(sheetId);
  if (!existing) {
    return res.status(404).json({ error: 'Sheet not found' });
  }

  const cleanId = spreadsheet_id ? extractSpreadsheetId(spreadsheet_id) : existing.spreadsheet_id;
  const mappingJson = column_mapping ? (typeof column_mapping === 'object' ? JSON.stringify(column_mapping) : column_mapping) : existing.column_mapping;

  db.prepare(`
    UPDATE sheets 
    SET name = COALESCE(?, name),
        spreadsheet_id = COALESCE(?, spreadsheet_id),
        sheet_name = COALESCE(?, sheet_name),
        assignment_mode = COALESCE(?, assignment_mode),
        default_assigned_user_id = ?,
        column_mapping = COALESCE(?, column_mapping),
        service_account_key = COALESCE(?, service_account_key),
        sync_interval_minutes = COALESCE(?, sync_interval_minutes),
        is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(
    name,
    cleanId,
    sheet_name,
    assignment_mode,
    default_assigned_user_id !== undefined ? default_assigned_user_id : existing.default_assigned_user_id,
    mappingJson,
    service_account_key,
    sync_interval_minutes,
    is_active !== undefined ? is_active : existing.is_active,
    sheetId
  );

  const updatedSheet = db.prepare('SELECT * FROM sheets WHERE id = ?').get(sheetId);
  res.json({ sheet: updatedSheet, message: 'Sheet updated successfully' });
});

// DELETE /api/sheets/:id
router.delete('/:id', requireAdmin, (req, res) => {
  const sheetId = req.params.id;
  db.prepare('DELETE FROM sheets WHERE id = ?').run(sheetId);
  res.json({ message: 'Google Sheet removed from CRM' });
});

// POST /api/sheets/:id/sync (Trigger manual sync)
router.post('/:id/sync', requireAdmin, async (req, res) => {
  const sheetId = req.params.id;
  try {
    const result = await googleSheetsService.syncInboundSheet(sheetId);
    const updatedSheet = db.prepare('SELECT * FROM sheets WHERE id = ?').get(sheetId);
    res.json({
      success: true,
      result,
      sheet: updatedSheet,
      message: `Sync completed! ${result.imported || 0} new leads imported, ${result.updated || 0} updated.`
    });
  } catch (err) {
    res.status(500).json({ error: 'Sync failed: ' + err.message });
  }
});

// POST /api/sheets/:id/simulate-leads (Inject 3 test leads from this sheet for live demonstration)
router.post('/:id/simulate-leads', requireAdmin, (req, res) => {
  const sheetId = req.params.id;
  const sheet = db.prepare('SELECT * FROM sheets WHERE id = ?').get(sheetId);
  if (!sheet) {
    return res.status(404).json({ error: 'Sheet not found' });
  }

  const counsellors = db.prepare("SELECT id FROM users WHERE role = 'counsellor' AND status = 'active'").all();
  const getRandomCounsellor = () => counsellors.length ? counsellors[Math.floor(Math.random() * counsellors.length)].id : null;

  const names = ['Vikram Malhotra', 'Sanya Kapoor', 'Devendra Reddy', 'Neha Singhal', 'Arjun Saxena'];
  const courses = ['PW JEE Pro Batch', 'NEET Achiever 2026', 'Foundation Olympiad', 'AI & Coding for Teens'];
  const phoneSuffix = Math.floor(1000 + Math.random() * 9000);

  const sampleName = names[Math.floor(Math.random() * names.length)];
  const sampleCourse = courses[Math.floor(Math.random() * courses.length)];
  const samplePhone = `+91981${phoneSuffix}01`;
  const sampleEmail = `${sampleName.toLowerCase().replace(' ', '.')}@example.com`;

  const newRow = (sheet.total_leads_count || 5) + 1;
  const assignedId = sheet.assignment_mode === 'specific_user' ? sheet.default_assigned_user_id : getRandomCounsellor();

  const result = db.prepare(`
    INSERT INTO leads (
      sheet_id, sheet_row_index, external_id, name, phone, email, source,
      course_interest, stage, priority, assigned_user_id, notes, sheet_sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'New Lead', 'Normal', ?, 'Inbound inquiry received via Google Sheet submission.', 'synced')
  `).run(
    sheetId,
    newRow,
    `ROW_${newRow}`,
    sampleName,
    samplePhone,
    sampleEmail,
    sheet.name,
    sampleCourse,
    assignedId
  );

  const leadId = result.lastInsertRowid;
  db.prepare(`
    INSERT INTO lead_activities (lead_id, user_id, activity_type, to_stage, notes)
    VALUES (?, ?, 'created', 'New Lead', 'New inquiry synced from Google Sheet: ' || ?)
  `).run(leadId, assignedId, sheet.name);

  db.prepare(`
    UPDATE sheets 
    SET total_leads_count = total_leads_count + 1, last_synced_at = datetime('now'), last_sync_status = 'success'
    WHERE id = ?
  `).run(sheetId);

  const createdLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
  res.json({ success: true, lead: createdLead, message: `Simulated inbound lead "${sampleName}" added and assigned!` });
});

// GET /api/sheets/:id/apps-script-code (Returns Google Apps Script 1-click code)
router.get('/:id/apps-script-code', requireAdmin, (req, res) => {
  const sheetId = req.params.id;
  const sheet = db.prepare('SELECT * FROM sheets WHERE id = ?').get(sheetId);
  if (!sheet) {
    return res.status(404).json({ error: 'Sheet not found' });
  }

  const host = req.get('host');
  const protocol = req.protocol;
  const serverUrl = `${protocol}://${host}`;

  const code = googleSheetsService.generateAppsScriptCode(sheetId, serverUrl);
  res.json({ code, serverUrl, sheetId });
});

// POST /api/sheets/webhook/:id (Public Webhook endpoint called by Google Apps Script)
router.post('/webhook/:id', (req, res) => {
  const sheetId = req.params.id;
  const sheet = db.prepare('SELECT * FROM sheets WHERE id = ?').get(sheetId);
  if (!sheet) {
    return res.status(404).json({ error: 'Sheet not found' });
  }

  const { rowIndex, rowValues, rows, headers } = req.body;
  const columnMapping = sheet.column_mapping ? JSON.parse(sheet.column_mapping) : {};
  const cleanHeaders = (headers || []).map(h => String(h || '').trim().toLowerCase());
  const activeCounsellors = db.prepare("SELECT id FROM users WHERE role = 'counsellor' AND status = 'active' ORDER BY id ASC").all();

  // Helper to resolve counsellor assignment
  let counsellorIndex = 0;
  const getAssignedUserId = () => {
    if (sheet.assignment_mode === 'specific_user' && sheet.default_assigned_user_id) {
      return sheet.default_assigned_user_id;
    }
    if (activeCounsellors.length > 0) {
      const id = activeCounsellors[counsellorIndex % activeCounsellors.length].id;
      counsellorIndex++;
      return id;
    }
    return null;
  };

  // Case 1: Bulk array of rows (e.g. syncAllExistingRows)
  if (Array.isArray(rows) && rows.length > 0) {
    let imported = 0;
    let updated = 0;

    const bulkTransaction = db.transaction(() => {
      for (const item of rows) {
        const itemRowIndex = item.rowIndex;
        const itemValues = item.rowValues;
        if (!itemValues || !Array.isArray(itemValues)) continue;

        const leadData = googleSheetsService.mapRowToLead(itemValues, cleanHeaders, columnMapping);
        if (!leadData.name && !leadData.phone) continue;

        const existing = db.prepare('SELECT id FROM leads WHERE sheet_id = ? AND (sheet_row_index = ? OR phone = ?)').get(sheetId, itemRowIndex, leadData.phone);

        if (existing) {
          db.prepare(`
            UPDATE leads 
            SET name = ?, phone = ?, alt_phone = COALESCE(?, alt_phone), email = COALESCE(?, email),
                student_email = COALESCE(?, student_email), parent_email = COALESCE(?, parent_email),
                school = COALESCE(?, school), course_interest = COALESCE(?, course_interest), updated_at = datetime('now')
            WHERE id = ?
          `).run(
            leadData.name, leadData.phone, leadData.alt_phone, leadData.email,
            leadData.student_email, leadData.parent_email, leadData.school,
            leadData.course_interest, existing.id
          );
          updated++;
        } else {
          const assignedId = getAssignedUserId();
          const newId = db.prepare(`
            INSERT INTO leads (
              sheet_id, sheet_row_index, external_id, name, email, phone, alt_phone,
              source, school, student_email, parent_email, course_interest, stage,
              priority, assigned_user_id, notes, sheet_sync_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Normal', ?, ?, 'synced')
          `).run(
            sheetId,
            itemRowIndex,
            `ROW_${itemRowIndex}`,
            leadData.name || 'Anonymous',
            leadData.email || '',
            leadData.phone || '',
            leadData.alt_phone || '',
            leadData.source || sheet.name,
            leadData.school || '',
            leadData.student_email || '',
            leadData.parent_email || '',
            leadData.course_interest || 'General Inquiry',
            leadData.stage || 'New Lead',
            assignedId,
            leadData.notes || 'Imported via Bulk Google Sheet Sync'
          ).lastInsertRowid;

          db.prepare(`
            INSERT INTO lead_activities (lead_id, user_id, activity_type, to_stage, notes)
            VALUES (?, ?, 'created', ?, 'Imported from Google Sheet: ' || ?)
          `).run(newId, assignedId, leadData.stage || 'New Lead', sheet.name);

          imported++;
        }
      }

      const totalCount = db.prepare('SELECT COUNT(*) as count FROM leads WHERE sheet_id = ?').get(sheetId).count;
      db.prepare(`
        UPDATE sheets 
        SET total_leads_count = ?, last_synced_at = datetime('now'), last_sync_status = 'success'
        WHERE id = ?
      `).run(totalCount, sheetId);
    });

    bulkTransaction();
    return res.json({ success: true, imported, updated, message: `Bulk sync completed in 0ms! Imported ${imported}, updated ${updated}.` });
  }

  // Case 2: Single row edit (onSheetEdit event)
  if (!rowValues || !Array.isArray(rowValues)) {
    return res.status(400).json({ error: 'Invalid rowValues' });
  }

  const leadData = googleSheetsService.mapRowToLead(rowValues, cleanHeaders, columnMapping);
  if (!leadData.name && !leadData.phone) {
    return res.json({ skipped: true, reason: 'Row has no name or phone' });
  }

  const assignedUserId = getAssignedUserId();
  const existing = db.prepare('SELECT id FROM leads WHERE sheet_id = ? AND (sheet_row_index = ? OR phone = ?)').get(sheetId, rowIndex, leadData.phone);

  if (existing) {
    db.prepare(`
      UPDATE leads 
      SET name = ?, phone = ?, alt_phone = COALESCE(?, alt_phone), email = COALESCE(?, email),
          student_email = COALESCE(?, student_email), parent_email = COALESCE(?, parent_email),
          school = COALESCE(?, school), course_interest = COALESCE(?, course_interest), updated_at = datetime('now')
      WHERE id = ?
    `).run(
      leadData.name, leadData.phone, leadData.alt_phone, leadData.email,
      leadData.student_email, leadData.parent_email, leadData.school,
      leadData.course_interest, existing.id
    );
    return res.json({ success: true, updated: existing.id });
  } else {
    const newLeadId = db.prepare(`
      INSERT INTO leads (
        sheet_id, sheet_row_index, external_id, name, email, phone, alt_phone,
        source, school, student_email, parent_email, course_interest, stage,
        priority, assigned_user_id, notes, sheet_sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Normal', ?, ?, 'synced')
    `).run(
      sheetId,
      rowIndex,
      `ROW_${rowIndex}`,
      leadData.name || 'Anonymous',
      leadData.email || '',
      leadData.phone || '',
      leadData.alt_phone || '',
      leadData.source || sheet.name,
      leadData.school || '',
      leadData.student_email || '',
      leadData.parent_email || '',
      leadData.course_interest || 'General Inquiry',
      leadData.stage || 'New Lead',
      assignedUserId,
      leadData.notes || 'Imported via Google Apps Script Webhook'
    ).lastInsertRowid;

    db.prepare(`
      INSERT INTO lead_activities (lead_id, user_id, activity_type, to_stage, notes)
      VALUES (?, ?, 'created', ?, 'Synced automatically from Google Sheet via Webhook')
    `).run(newLeadId, assignedUserId, leadData.stage || 'New Lead');

    db.prepare(`
      UPDATE sheets 
      SET total_leads_count = total_leads_count + 1, last_synced_at = datetime('now'), last_sync_status = 'success'
      WHERE id = ?
    `).run(sheetId);

    return res.json({ success: true, created: newLeadId });
  }
});

module.exports = router;
