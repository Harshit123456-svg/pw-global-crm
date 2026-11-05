const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const dbPath = path.join(__dirname, 'crm.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for high performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'counsellor', -- 'admin' or 'counsellor'
      phone TEXT,                             -- WhatsApp phone number (e.g. 919876543210)
      invite_token TEXT UNIQUE,               -- Unique link token for 1-click counsellor join/login
      status TEXT NOT NULL DEFAULT 'active',  -- 'active' or 'inactive'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sheets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      spreadsheet_id TEXT NOT NULL,
      sheet_name TEXT NOT NULL DEFAULT 'Sheet1',
      service_account_email TEXT,
      service_account_key TEXT,
      assignment_mode TEXT NOT NULL DEFAULT 'round_robin', -- 'round_robin', 'specific_user', 'unassigned'
      default_assigned_user_id INTEGER,
      column_mapping TEXT,
      webhook_secret TEXT,
      sync_interval_minutes INTEGER DEFAULT 15,
      last_synced_at DATETIME,
      last_sync_status TEXT DEFAULT 'pending',
      last_sync_error TEXT,
      total_leads_count INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (default_assigned_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sheet_id INTEGER,
      sheet_row_index INTEGER,
      external_id TEXT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT NOT NULL,
      alt_phone TEXT,                         -- Alternative Phone Number
      source TEXT DEFAULT 'Google Sheet',     -- Source
      school TEXT,                            -- School / Institution
      student_email TEXT,                     -- Student E-mail ID
      parent_email TEXT,                      -- Parent E-Mail ID
      course_interest TEXT,
      stage TEXT NOT NULL DEFAULT 'New Lead', -- Current Status / Stages from dropdown
      priority TEXT DEFAULT 'Normal',
      is_important INTEGER DEFAULT 0,
      assigned_user_id INTEGER,
      follow_up_date DATETIME,
      follow_up_notes TEXT,
      demo_date DATETIME,                     -- PB / Demo session date
      demo_topic TEXT,
      demo_link TEXT,
      demo_attendance TEXT DEFAULT 'Scheduled',
      last_contacted_at DATETIME,
      notes TEXT,
      sheet_sync_status TEXT DEFAULT 'synced',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sheet_id) REFERENCES sheets(id) ON DELETE SET NULL,
      FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS lead_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      user_id INTEGER,
      activity_type TEXT NOT NULL,
      from_stage TEXT,
      to_stage TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS whatsapp_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Run migrations if columns missing
  migrateSchema();
  seedInitialData();
}

function migrateSchema() {
  const tableInfo = db.prepare("PRAGMA table_info('leads')").all();
  const colNames = tableInfo.map(c => c.name);

  if (!colNames.includes('alt_phone')) {
    db.prepare("ALTER TABLE leads ADD COLUMN alt_phone TEXT").run();
  }
  if (!colNames.includes('school')) {
    db.prepare("ALTER TABLE leads ADD COLUMN school TEXT").run();
  }
  if (!colNames.includes('student_email')) {
    db.prepare("ALTER TABLE leads ADD COLUMN student_email TEXT").run();
  }
  if (!colNames.includes('parent_email')) {
    db.prepare("ALTER TABLE leads ADD COLUMN parent_email TEXT").run();
  }

  const userTableInfo = db.prepare("PRAGMA table_info('users')").all();
  const userColNames = userTableInfo.map(c => c.name);
  if (!userColNames.includes('invite_token')) {
    db.prepare("ALTER TABLE users ADD COLUMN invite_token TEXT").run();
  }
}

function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

function seedInitialData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) {
    // Ensure all existing users have an invite_token
    const usersWithoutToken = db.prepare('SELECT id FROM users WHERE invite_token IS NULL').all();
    for (const u of usersWithoutToken) {
      db.prepare('UPDATE users SET invite_token = ? WHERE id = ?').run(generateToken(), u.id);
    }
    return;
  }

  console.log('⚡ Seeding initial CRM database with team members and leads...');

  const passwordHashAdmin = bcrypt.hashSync('admin123', 10);
  const passwordHashStaff = bcrypt.hashSync('counsellor123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password, role, phone, invite_token, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const adminId = insertUser.run('Admin Manager', 'admin@crm.com', passwordHashAdmin, 'admin', '919876543210', generateToken(), 'active').lastInsertRowid;
  const counsellor1Id = insertUser.run('Rahul Sharma', 'rahul@crm.com', passwordHashStaff, 'counsellor', '919876543211', 'rahul-access-token-9812', 'active').lastInsertRowid;
  const counsellor2Id = insertUser.run('Priya Patel', 'priya@crm.com', passwordHashStaff, 'counsellor', '919876543212', 'priya-access-token-4721', 'active').lastInsertRowid;
  const counsellor3Id = insertUser.run('Amit Verma', 'amit@crm.com', passwordHashStaff, 'counsellor', '919876543213', 'amit-access-token-3891', 'active').lastInsertRowid;

  // Insert Sample Sheets
  const insertSheet = db.prepare(`
    INSERT INTO sheets (name, spreadsheet_id, sheet_name, assignment_mode, column_mapping, sync_interval_minutes, total_leads_count, last_synced_at, last_sync_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), 'success')
  `);

  const sheet1Id = insertSheet.run(
    'PW Global - JEE & NEET Inquiries 2026',
    '1A2B3C4D5E6F7G8H9I0J_JEE2026',
    'Responses',
    'round_robin',
    JSON.stringify({
      name: 'A',
      phone: 'B',
      alt_phone: 'C',
      email: 'D',
      student_email: 'E',
      parent_email: 'F',
      school: 'G',
      source: 'H',
      stage: 'I',
      notes: 'J'
    }),
    15,
    10
  ).lastInsertRowid;

  const sheet2Id = insertSheet.run(
    'PW Global - International & Gulf Schools',
    '9Z8Y7X6W5V4U3T2S1R0Q_GULF2026',
    'Inquiries',
    'round_robin',
    JSON.stringify({
      name: 'A',
      phone: 'B',
      alt_phone: 'C',
      email: 'D',
      student_email: 'E',
      parent_email: 'F',
      school: 'G',
      source: 'H',
      stage: 'I',
      notes: 'J'
    }),
    30,
    6
  ).lastInsertRowid;

  // Insert Clean WhatsApp Templates without 4-byte surrogate emojis that cause ? on Windows
  const insertTemplate = db.prepare(`
    INSERT INTO whatsapp_templates (name, type, content, is_default)
    VALUES (?, ?, ?, ?)
  `);

  insertTemplate.run(
    'PB Session Confirmed',
    'pb_booked',
    '*PW GLOBAL - Profile Building & Demo Session Confirmed*\n\nHello {{name}}!\nYour 1-on-1 Profile Building (PB) & Demo Session has been confirmed on {{demo_date}} at {{demo_time}}.\n\n*Meeting Link:* {{demo_link}}\n*Topic:* {{demo_topic}}\n\nYour Academic Counsellor *{{counsellor_name}}* will review your profile, curriculum at *{{school}}*, and academic goals. Please join 5 minutes early!\n\nBest regards,\nPW Global Team',
    1
  );

  insertTemplate.run(
    'DNP / WhatsApp Info Sent',
    'dnp_wa',
    'Hello {{name}}, this is {{counsellor_name}} from the PW Global Academic Team.\n\nI tried reaching you on your number {{phone}} regarding your admission and profile building inquiry for {{course}}, but was unable to connect.\n\nPlease let me know a convenient time to speak, or reply directly to this message.\n\nBest regards,\n{{counsellor_name}} - PW Global',
    1
  );

  insertTemplate.run(
    'Call Back Later Confirmation',
    'callback',
    'Hello {{name}}, as discussed on our call, I have scheduled our follow-up conversation for {{follow_up_time}} ({{follow_up_date}}).\n\nLooking forward to speaking with you and your family.\n\nBest regards,\n{{counsellor_name}} - PW Global',
    1
  );

  insertTemplate.run(
    'Counsellor Reminder (Self WhatsApp)',
    'counsellor_reminder',
    '*PW GLOBAL CRM - Follow-Up Reminder*\n----------------------------------------\n*Student:* {{name}}\n*Phone:* {{phone}} (Alt: {{alt_phone}})\n*School:* {{school}}\n*Stage:* {{stage}}\n*Scheduled Callback:* {{follow_up_time}} ({{follow_up_date}})\n*Notes:* {{follow_up_notes}}',
    1
  );

  // Helper for ISO date offsets
  const getOffsetIso = (days, hours = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(d.getHours() + hours);
    return d.toISOString();
  };

  // Insert Realistic Sample Leads matching the exact stages from screenshot
  const insertLead = db.prepare(`
    INSERT INTO leads (
      sheet_id, sheet_row_index, external_id, name, email, phone, alt_phone,
      source, school, student_email, parent_email, course_interest, stage, priority,
      is_important, assigned_user_id, follow_up_date, follow_up_notes, demo_date,
      demo_topic, demo_link, demo_attendance, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  const insertActivity = db.prepare(`
    INSERT INTO lead_activities (lead_id, user_id, activity_type, from_stage, to_stage, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  // Lead 1: PB Session Booked (Scenario match!)
  const l1 = insertLead.run(
    sheet1Id, 2, 'LEAD_001', 'Aarav Sharma', 'aarav.sharma@gmail.com', '+919876500001', '+919876500099',
    'Google Sheet Campaign', 'Delhi Public School (DPS R.K. Puram)', 'aarav.student@dps.edu', 'sharma.parent@gmail.com',
    'JEE Advanced 2-Year', 'PB Session Booked', 'High', 1, counsellor1Id,
    getOffsetIso(1, 2), 'Confirm attendance 2 hours prior',
    getOffsetIso(1, 3), 'Profile Building & Physics Assessment', 'https://meet.google.com/xyz-pw-demo', 'Scheduled',
    'Parent agreed on call for 1-on-1 Profile Building session tomorrow 3 PM. Father requested syllabus breakdown.', '-2 days'
  ).lastInsertRowid;
  insertActivity.run(l1, counsellor1Id, 'created', null, 'New Lead', 'Lead imported from Google Sheet', '-2 days');
  insertActivity.run(l1, counsellor1Id, 'stage_change', 'New Lead', 'Prospect', 'Called father. Highly interested in profile building.', '-1 day');
  insertActivity.run(l1, counsellor1Id, 'demo_booked', 'Prospect', 'PB Session Booked', 'Booked Profile Building Session for tomorrow 3 PM.', '-4 hours');

  // Lead 2: Call Back later
  const l2 = insertLead.run(
    sheet1Id, 3, 'LEAD_002', 'Ananya Gupta', 'ananya.g@gmail.com', '+919876500002', '+919876500088',
    'Website Inquiry', 'The Heritage School', 'ananya.gupta@student.org', 'gupta.family@gmail.com',
    'NEET 2-Year Foundation', 'Call Back later', 'Urgent', 1, counsellor1Id,
    getOffsetIso(0, 2), 'Call back today at 4 PM after coaching classes',
    null, null, null, 'Scheduled',
    'Student picked up call. Requested callback in evening when father is home from office.', '-1 day'
  ).lastInsertRowid;
  insertActivity.run(l2, counsellor1Id, 'stage_change', 'New Lead', 'Call Back later', 'Student asked to call back in evening at 4 PM', '-1 day');

  // Lead 3: DNP/ WA sent
  const l3 = insertLead.run(
    sheet1Id, 4, 'LEAD_003', 'Rohan Mehta', 'rohan.m@gmail.com', '+919876500003', '',
    'Google Form Submission', 'Modern School Barakhamba', 'rohan.mehta@modern.ac.in', 'mehta.p@gmail.com',
    'JEE Crash Course', 'DNP/ WA sent', 'Normal', 0, counsellor1Id,
    getOffsetIso(1, 0), 'Follow up after WhatsApp message sent',
    null, null, null, 'Scheduled',
    'Ringing but did not pick. Sent WhatsApp greeting and curriculum brochure.', '-3 hours'
  ).lastInsertRowid;
  insertActivity.run(l3, counsellor1Id, 'stage_change', 'New Lead', 'DNP/ WA sent', 'Did not pick call. Sent brochure on WhatsApp.', '-3 hours');

  // Lead 4: PB Form Sent
  const l4 = insertLead.run(
    sheet2Id, 2, 'LEAD_004', 'Isha Deshmukh', 'isha.d@gmail.com', '+919876500004', '+919876500077',
    'International Inquiries', 'GEMS Modern Academy Dubai', 'isha.deshmukh@gems.ae', 'deshmukh.uae@gmail.com',
    'Global Career & SAT/JEE', 'PB Form Sent', 'High', 1, counsellor2Id,
    getOffsetIso(0, 3), 'Check if form submitted by parent today',
    null, null, null, 'Scheduled',
    'Explained profile building roadmap. Sent Profile Building evaluation form on parent email.', '-2 days'
  ).lastInsertRowid;
  insertActivity.run(l4, counsellor2Id, 'stage_change', 'Prospect', 'PB Form Sent', 'Sent Profile Building registration form via email.', '-1 day');

  // Lead 5: Enrolled 🎉
  const l5 = insertLead.run(
    sheet2Id, 3, 'LEAD_005', 'Kabir Verma', 'kabir.v@gmail.com', '+919876500005', '',
    'Google Sheet Campaign', 'St. Xavier High School', 'kabir.v@student.in', 'verma.consult@gmail.com',
    'JEE Advanced Classroom', 'Enrolled', 'Normal', 0, counsellor1Id,
    null, null,
    getOffsetIso(-3, 0), 'Physics Demo & Evaluation', 'https://meet.google.com/def-pw-neet', 'Attended',
    'Payment confirmed via online portal. Batch assigned: PW-Global-Alpha.', '-4 days'
  ).lastInsertRowid;
  insertActivity.run(l5, counsellor1Id, 'stage_change', 'PB Session Booked', 'Enrolled', 'Full enrollment payment completed!', '-1 day');

  // Lead 6: Requested WA
  const l6 = insertLead.run(
    sheet1Id, 5, 'LEAD_006', 'Diya Sen', 'diya.sen@gmail.com', '+919876500006', '+919876500066',
    'Google Form Submission', 'National Public School Bangalore', 'diya.sen@nps.ac.in', 'sen.parents@gmail.com',
    'NEET 1-Year FastTrack', 'Requested WA', 'Normal', 0, counsellor2Id,
    getOffsetIso(1, 5), 'Follow up on WhatsApp chat',
    null, null, null, 'Scheduled',
    'Student in school, requested details over WhatsApp message.', '-1 day'
  ).lastInsertRowid;

  // Lead 7: Profile Buidling (Ongoing discussion)
  const l7 = insertLead.run(
    sheet1Id, 6, 'LEAD_007', 'Tanmay Joshi', 'tanmay.j@gmail.com', '+919876500007', '',
    'Google Sheet Campaign', 'Amity International School', 'tanmay.j@amity.edu', 'joshi.home@gmail.com',
    'Ivy League & Olympiad Prep', 'Profile Buidling', 'High', 0, counsellor1Id,
    getOffsetIso(2, 0), 'Discussion on extracurricular portfolio',
    null, null, null, 'Scheduled',
    'Interested in profile building for international universities + JEE.', '-3 days'
  ).lastInsertRowid;

  // Lead 8: Not Connecting
  const l8 = insertLead.run(
    sheet2Id, 4, 'LEAD_008', 'Siddharth Nair', 'sid.nair@gmail.com', '+919876500008', '',
    'Google Sheet Campaign', 'Indian High School Dubai', 'sid.nair@ihs.ae', 'nair.dxb@gmail.com',
    'CBSE + JEE Integrated', 'Not Connecting', 'Low', 0, counsellor3Id,
    getOffsetIso(0, 1), 'Retry calling at 6 PM',
    null, null, null, 'Scheduled',
    'Network unreachable. Tried twice.', '-1 day'
  ).lastInsertRowid;

  console.log('✅ CRM database seeded with realistic leads, exact stages, and counsellor invite tokens!');
}

initDb();

module.exports = db;
