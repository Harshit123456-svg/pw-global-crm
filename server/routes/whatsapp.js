const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const whatsappService = require('../services/whatsappService');

// GET /api/whatsapp/templates
router.get('/templates', requireAuth, (req, res) => {
  const templates = db.prepare('SELECT * FROM whatsapp_templates ORDER BY id ASC').all();
  res.json({ templates });
});

// POST /api/whatsapp/templates
router.post('/templates', requireAuth, (req, res) => {
  const { name, type, content, is_default = 0 } = req.body;
  if (!name || !content) {
    return res.status(400).json({ error: 'Name and content are required' });
  }

  const result = db.prepare(`
    INSERT INTO whatsapp_templates (name, type, content, is_default)
    VALUES (?, ?, ?, ?)
  `).run(name, type || 'general', content, is_default ? 1 : 0);

  const newTemplate = db.prepare('SELECT * FROM whatsapp_templates WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ template: newTemplate, message: 'Template created' });
});

// POST /api/whatsapp/generate-link
router.post('/generate-link', requireAuth, (req, res) => {
  const { lead_id, target = 'lead', template_id, custom_message } = req.body;

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(lead_id);
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  const counsellor = db.prepare('SELECT id, name, phone, email FROM users WHERE id = ?').get(req.user.id);

  let message = '';
  let targetPhone = '';

  const sessionDate = whatsappService.formatDateTime(lead.demo_date);
  const followUpDate = whatsappService.formatDateTime(lead.follow_up_date);

  if (target === 'counsellor') {
    // Reminder sent to counsellor's own WhatsApp number!
    targetPhone = counsellor.phone;
    if (!targetPhone) {
      return res.status(400).json({ error: 'Please update your WhatsApp number in your profile first.' });
    }
    message = whatsappService.buildCounsellorReminder(lead, counsellor);
  } else {
    // Sent to lead / student
    targetPhone = lead.phone;
    if (!targetPhone) {
      return res.status(400).json({ error: 'Lead does not have a phone number.' });
    }

    if (custom_message) {
      message = custom_message;
    } else if (template_id) {
      const template = db.prepare('SELECT * FROM whatsapp_templates WHERE id = ?').get(template_id);
      if (template) {
        message = whatsappService.renderTemplate(template.content, {
          name: lead.name,
          phone: lead.phone,
          alt_phone: lead.alt_phone || '',
          email: lead.email || '',
          student_email: lead.student_email || '',
          parent_email: lead.parent_email || '',
          school: lead.school || 'your school',
          source: lead.source || '',
          course: lead.course_interest || 'PW Global Program',
          course_interest: lead.course_interest || 'PW Global Program',
          stage: lead.stage,
          demo_date: sessionDate.date,
          demo_time: sessionDate.time,
          demo_link: lead.demo_link || '',
          demo_topic: lead.demo_topic || 'Profile Building Session',
          follow_up_date: followUpDate.date,
          follow_up_time: followUpDate.time,
          follow_up_notes: lead.follow_up_notes || (lead.notes ? lead.notes.split('\n')[0] : ''),
          counsellor_name: counsellor.name,
          counsellor_phone: counsellor.phone || ''
        });
      }
    }

    if (!message) {
      if (lead.stage === 'PB Session Booked' || lead.stage === 'Demo Booked') {
        message = whatsappService.buildDemoConfirmation(lead, counsellor);
      } else {
        message = `Hello ${lead.name}, this is ${counsellor.name} from PW Global Academic Team following up on your inquiry for ${lead.course_interest || 'our programs'}. When would be a convenient time to speak?`;
      }
    }
  }

  const url = whatsappService.generateWhatsAppLink(targetPhone, message);

  // Record activity
  db.prepare(`
    INSERT INTO lead_activities (lead_id, user_id, activity_type, notes)
    VALUES (?, ?, 'whatsapp_sent', ?)
  `).run(lead_id, req.user.id, `WhatsApp link opened for ${target === 'counsellor' ? 'counsellor reminder' : 'student message'}`);

  res.json({
    url,
    message,
    phone: targetPhone,
    target
  });
});

module.exports = router;
