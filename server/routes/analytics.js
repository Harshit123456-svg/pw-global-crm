const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/analytics/dashboard
router.get('/dashboard', requireAdmin, (req, res) => {
  const totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
  const pbSessionsBooked = db.prepare("SELECT COUNT(*) as count FROM leads WHERE stage = 'PB Session Booked' OR stage = 'Demo Booked'").get().count;
  const enrolled = db.prepare("SELECT COUNT(*) as count FROM leads WHERE stage = 'Enrolled'").get().count;
  const pbFormSent = db.prepare("SELECT COUNT(*) as count FROM leads WHERE stage = 'PB Form Sent'").get().count;
  const prospects = db.prepare("SELECT COUNT(*) as count FROM leads WHERE stage IN ('Prospect', 'Future Prospect', 'Profile Buidling', 'Future Prospect PB')").get().count;
  const callbacks = db.prepare("SELECT COUNT(*) as count FROM leads WHERE stage IN ('Call Back later', 'Requested WA', 'Requested Email')").get().count;
  const dnpCount = db.prepare("SELECT COUNT(*) as count FROM leads WHERE stage IN ('DNP', 'DNP/ WA sent', 'Not Connecting', 'Hung up after intro')").get().count;
  const dropped = db.prepare("SELECT COUNT(*) as count FROM leads WHERE stage = 'Dropped'").get().count;

  const conversionRate = totalLeads > 0 ? ((enrolled / totalLeads) * 100).toFixed(1) : '0.0';

  // Progression Funnel
  const funnel = [
    { stage: 'Total Inbound', count: totalLeads, step: 1 },
    { stage: 'Prospects & Calls', count: (prospects + callbacks + pbFormSent + pbSessionsBooked + enrolled), step: 2 },
    { stage: 'PB Form Sent', count: (pbFormSent + pbSessionsBooked + enrolled), step: 3 },
    { stage: 'PB Session Booked', count: (pbSessionsBooked + enrolled), step: 4 },
    { stage: 'Enrolled 🎉', count: enrolled, step: 5 }
  ];

  // Counsellor Performance
  const counsellorPerformance = db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.invite_token,
           COUNT(l.id) as assigned_leads,
           SUM(CASE WHEN l.stage = 'PB Session Booked' OR l.stage = 'Demo Booked' THEN 1 ELSE 0 END) as demos_booked,
           SUM(CASE WHEN l.stage = 'Enrolled' THEN 1 ELSE 0 END) as conversions,
           (SELECT COUNT(*) FROM lead_activities la WHERE la.user_id = u.id AND la.activity_type = 'call_logged') as calls_made,
           (SELECT COUNT(*) FROM lead_activities la WHERE la.user_id = u.id AND la.activity_type = 'note_added') as notes_added
    FROM users u
    LEFT JOIN leads l ON l.assigned_user_id = u.id
    WHERE u.role = 'counsellor' AND u.status = 'active'
    GROUP BY u.id
    ORDER BY conversions DESC, demos_booked DESC
  `).all();

  // Multi-Sheets Breakdown
  const sheetsBreakdown = db.prepare(`
    SELECT s.id, s.name, s.spreadsheet_id,
           COUNT(l.id) as total_leads,
           SUM(CASE WHEN l.stage = 'PB Session Booked' OR l.stage = 'Demo Booked' THEN 1 ELSE 0 END) as demos_booked,
           SUM(CASE WHEN l.stage = 'Enrolled' THEN 1 ELSE 0 END) as enrolled
    FROM sheets s
    LEFT JOIN leads l ON l.sheet_id = s.id
    GROUP BY s.id
  `).all();

  // Recent Counsellor Activities (Audit trail of what counsellors are doing)
  const recentActivities = db.prepare(`
    SELECT la.*, u.name as user_name, u.role as user_role,
           l.name as lead_name, l.phone as lead_phone, l.school, l.course_interest, l.stage as current_stage
    FROM lead_activities la
    LEFT JOIN users u ON la.user_id = u.id
    LEFT JOIN leads l ON la.lead_id = l.id
    ORDER BY la.created_at DESC
    LIMIT 35
  `).all();

  res.json({
    kpis: {
      totalLeads,
      pbSessionsBooked,
      enrolled,
      pbFormSent,
      prospects,
      callbacks,
      dnpCount,
      dropped,
      conversionRate
    },
    funnel,
    counsellorPerformance,
    sheetsBreakdown,
    recentActivities
  });
});

module.exports = router;
