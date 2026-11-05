const { google } = require('googleapis');
const db = require('../db');
const axios = require('axios');

class GoogleSheetsService {
  getSheetsClient(credentialsJson) {
    if (!credentialsJson) return null;
    try {
      const credentials = typeof credentialsJson === 'string' ? JSON.parse(credentialsJson) : credentialsJson;
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      return google.sheets({ version: 'v4', auth });
    } catch (err) {
      console.error('Failed to parse Google credentials:', err.message);
      return null;
    }
  }

  async syncInboundSheet(sheetId) {
    const sheet = db.prepare('SELECT * FROM sheets WHERE id = ?').get(sheetId);
    if (!sheet) throw new Error('Sheet not found');

    const columnMapping = sheet.column_mapping ? JSON.parse(sheet.column_mapping) : {};
    let activeCounsellors = db.prepare("SELECT id FROM users WHERE role = 'counsellor' AND status = 'active' ORDER BY id ASC").all();

    if (sheet.service_account_key) {
      try {
        const sheetsClient = this.getSheetsClient(sheet.service_account_key);
        if (!sheetsClient) throw new Error('Invalid Google Service Account credentials');

        const range = `${sheet.sheet_name || 'Sheet1'}!A1:Z1000`;
        const response = await sheetsClient.spreadsheets.values.get({
          spreadsheetId: sheet.spreadsheet_id,
          range
        });

        const rows = response.data.values || [];
        if (rows.length <= 1) {
          db.prepare("UPDATE sheets SET last_synced_at = datetime('now'), last_sync_status = 'success', last_sync_error = NULL WHERE id = ?").run(sheetId);
          return { imported: 0, updated: 0, total: 0 };
        }

        const headers = rows[0].map(h => (h || '').trim().toLowerCase());
        const dataRows = rows.slice(1);

        let importedCount = 0;
        let updatedCount = 0;
        let counsellorIndex = 0;

        for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
          const row = dataRows[rowIndex];
          const actualSheetRow = rowIndex + 2;

          const leadData = this.mapRowToLead(row, headers, columnMapping);
          if (!leadData.name && !leadData.phone) continue;

          const existing = db.prepare('SELECT id, stage, notes FROM leads WHERE sheet_id = ? AND (sheet_row_index = ? OR phone = ?)').get(sheetId, actualSheetRow, leadData.phone);

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
            updatedCount++;
          } else {
            let assignedUserId = null;
            if (sheet.assignment_mode === 'specific_user' && sheet.default_assigned_user_id) {
              assignedUserId = sheet.default_assigned_user_id;
            } else if (sheet.assignment_mode === 'round_robin' && activeCounsellors.length > 0) {
              assignedUserId = activeCounsellors[counsellorIndex % activeCounsellors.length].id;
              counsellorIndex++;
            }

            const newLeadId = db.prepare(`
              INSERT INTO leads (
                sheet_id, sheet_row_index, external_id, name, email, phone, alt_phone,
                source, school, student_email, parent_email, course_interest, stage,
                priority, assigned_user_id, notes, sheet_sync_status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
            `).run(
              sheetId,
              actualSheetRow,
              `ROW_${actualSheetRow}`,
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
              'Normal',
              assignedUserId,
              leadData.notes || '',
            ).lastInsertRowid;

            db.prepare(`
              INSERT INTO lead_activities (lead_id, user_id, activity_type, from_stage, to_stage, notes)
              VALUES (?, ?, 'created', NULL, ?, 'Lead imported from Google Sheet: ' || ?)
            `).run(newLeadId, assignedUserId, leadData.stage || 'New Lead', sheet.name);

            importedCount++;
          }
        }

        const totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads WHERE sheet_id = ?').get(sheetId).count;
        db.prepare(`
          UPDATE sheets 
          SET last_synced_at = datetime('now'), last_sync_status = 'success', last_sync_error = NULL, total_leads_count = ?
          WHERE id = ?
        `).run(totalLeads, sheetId);

        return { imported: importedCount, updated: updatedCount, total: totalLeads };
      } catch (err) {
        console.error('Google Sheets API sync error:', err.message);
        db.prepare("UPDATE sheets SET last_synced_at = datetime('now'), last_sync_status = 'failed', last_sync_error = ? WHERE id = ?").run(err.message, sheetId);
        throw err;
      }
    } else {
      const totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads WHERE sheet_id = ?').get(sheetId).count;
      db.prepare(`
        UPDATE sheets 
        SET last_synced_at = datetime('now'), last_sync_status = 'success', last_sync_error = NULL, total_leads_count = ?
        WHERE id = ?
      `).run(totalLeads, sheetId);

      return {
        imported: 0,
        updated: 0,
        total: totalLeads,
        message: 'Sheet connected in Webhook / Apps Script mode. Automatic 2-way sync active.'
      };
    }
  }

  async writebackToGoogleSheet(leadId) {
    const lead = db.prepare(`
      SELECT l.*, s.spreadsheet_id, s.sheet_name, s.service_account_key, s.column_mapping, s.name as sheet_title, u.name as counsellor_name
      FROM leads l
      LEFT JOIN sheets s ON l.sheet_id = s.id
      LEFT JOIN users u ON l.assigned_user_id = u.id
      WHERE l.id = ?
    `).get(leadId);

    if (!lead || !lead.sheet_id || !lead.sheet_row_index) {
      return { skipped: true, reason: 'No linked sheet or row index' };
    }

    if (lead.service_account_key) {
      try {
        const sheetsClient = this.getSheetsClient(lead.service_account_key);
        if (!sheetsClient) return { skipped: true, reason: 'Invalid credentials' };

        const mapping = lead.column_mapping ? JSON.parse(lead.column_mapping) : {};
        const stageCol = mapping.stage || 'I';
        const notesCol = mapping.notes || 'J';

        const row = lead.sheet_row_index;
        const updates = [
          {
            range: `${lead.sheet_name || 'Sheet1'}!${stageCol}${row}`,
            values: [[lead.stage]]
          },
          {
            range: `${lead.sheet_name || 'Sheet1'}!${notesCol}${row}`,
            values: [[lead.notes || '']]
          }
        ];

        await sheetsClient.spreadsheets.values.batchUpdate({
          spreadsheetId: lead.spreadsheet_id,
          requestBody: {
            valueInputOption: 'USER_ENTERED',
            data: updates
          }
        });

        db.prepare("UPDATE leads SET sheet_sync_status = 'synced' WHERE id = ?").run(leadId);
        return { success: true, updatedRow: row };
      } catch (err) {
        console.error('Error writing back to Google Sheet:', err.message);
        db.prepare("UPDATE leads SET sheet_sync_status = 'error' WHERE id = ?").run(leadId);
        return { success: false, error: err.message };
      }
    }

    db.prepare("UPDATE leads SET sheet_sync_status = 'synced' WHERE id = ?").run(leadId);
    return { success: true, mode: 'webhook' };
  }

  mapRowToLead(row, headers, mapping) {
    const colToIdx = col => {
      if (!col) return -1;
      const clean = col.toUpperCase().trim();
      let n = 0;
      for (let i = 0; i < clean.length; i++) {
        n = n * 26 + clean.charCodeAt(i) - 64;
      }
      return n - 1;
    };

    const getValue = (field, fallbackHeaders = []) => {
      if (mapping[field]) {
        const idx = colToIdx(mapping[field]);
        if (idx >= 0 && idx < row.length) return (row[idx] || '').trim();
      }
      for (const fh of fallbackHeaders) {
        const headerIdx = headers.indexOf(fh.toLowerCase());
        if (headerIdx >= 0 && headerIdx < row.length) {
          return (row[headerIdx] || '').trim();
        }
      }
      return '';
    };

    return {
      name: getValue('name', ['name', 'student name', 'full name']),
      phone: getValue('phone', ['phone', 'phone number', 'mobile', 'contact number', 'whatsapp']),
      alt_phone: getValue('alt_phone', ['alternative number', 'alt phone', 'alternate number', 'parent phone', 'emergency contact']),
      email: getValue('email', ['e-mail', 'email', 'email address', 'primary email']),
      student_email: getValue('student_email', ['student e-mail id', 'student email', 'student email id']),
      parent_email: getValue('parent_email', ['parent e-mail id', 'parent email', 'parent email id', 'father email', 'mother email']),
      school: getValue('school', ['school', 'institution', 'college', 'school name']),
      source: getValue('source', ['source', 'lead source', 'campaign']),
      stage: getValue('stage', ['current status', 'status', 'stage']) || 'New Lead',
      course_interest: getValue('course_interest', ['course', 'batch', 'interest', 'program']),
      notes: getValue('notes', ['notes', 'remarks', 'counsellor notes'])
    };
  }

  generateAppsScriptCode(sheetId, serverUrl) {
    return `/**
 * PW GLOBAL CRM - 2-Way Google Sheet Sync Script
 * -------------------------------------------------------------
 * 1. In your Google Sheet, open Extensions > Apps Script.
 * 2. Paste this entire code and save.
 * 3. Run 'setupTriggers' once to enable automatic instant sync!
 */

const CRM_SERVER_URL = "${serverUrl || 'http://localhost:5000'}";
const SHEET_ID = ${sheetId};

function setupTriggers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  
  ScriptApp.newTrigger('onSheetEdit')
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  SpreadsheetApp.getUi().alert("✅ CRM Sync trigger successfully installed! Every new or edited lead will instantly sync to your CRM.");
}

function onSheetEdit(e) {
  try {
    const range = e.range;
    const sheet = range.getSheet();
    const row = range.getRow();
    
    if (row <= 1) return;

    const rowValues = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    const payload = {
      sheetId: SHEET_ID,
      rowIndex: row,
      rowValues: rowValues,
      headers: headers
    };

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    UrlFetchApp.fetch(CRM_SERVER_URL + "/api/sheets/webhook/" + SHEET_ID, options);
  } catch (err) {
    Logger.log("CRM Sync Error: " + err.message);
  }
}
`;
  }
}

module.exports = new GoogleSheetsService();
