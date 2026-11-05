const db = require('../db');
const axios = require('axios');

function formatDateTime(dateVal) {
  if (!dateVal) {
    return { date: 'Scheduled Date', time: 'Scheduled Time', full: 'As scheduled' };
  }
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) {
      return { date: String(dateVal), time: '', full: String(dateVal) };
    }
    const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    return { date, time, full: `${date} at ${time}` };
  } catch (e) {
    return { date: String(dateVal), time: '', full: String(dateVal) };
  }
}

class WhatsAppService {
  /**
   * Format phone number to international WhatsApp format (digits only)
   * Example: "+91 98765-43210" -> "919876543210"
   */
  formatPhone(phone) {
    if (!phone) return '';
    let digits = phone.replace(/[^0-9]/g, '');
    // If 10 digits and starts with 6,7,8,9 assume India country code 91
    if (digits.length === 10 && ['6', '7', '8', '9'].includes(digits[0])) {
      digits = '91' + digits;
    }
    return digits;
  }

  /**
   * Fill template variables and clean any unreplaced placeholders
   */
  renderTemplate(templateText, variables) {
    let result = templateText || '';
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'gi');
      result = result.replace(regex, value != null && value !== '' ? String(value) : '');
    }
    // Safety sweep: strip any remaining unreplaced {{...}} placeholders so raw brackets NEVER appear in messages
    result = result.replace(/\{\{[a-zA-Z0-9_-]+\}\}/g, '');
    return result.trim();
  }

  /**
   * Generate direct WhatsApp click-to-chat URL
   * Using api.whatsapp.com avoids the wa.me redirect bug on Windows that turns characters into ?
   */
  generateWhatsAppLink(phone, message) {
    const cleanPhone = this.formatPhone(phone);
    const encodedMessage = encodeURIComponent(message);
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
  }

  /**
   * Generate follow-up reminder text for the counsellor's own WhatsApp
   */
  buildCounsellorReminder(lead, counsellor) {
    const leadName = lead.name || 'Lead';
    const course = lead.course_interest || 'Inquiry';
    const school = lead.school || 'Not specified';
    const altPhone = lead.alt_phone ? ` (Alt: ${lead.alt_phone})` : '';
    const followUp = formatDateTime(lead.follow_up_date);
    const notes = lead.follow_up_notes || (lead.notes ? lead.notes.split('\n')[0] : 'No notes entered');

    const cleanStudentPhone = this.formatPhone(lead.phone);

    return (
`*PW GLOBAL CRM - Follow-Up Reminder*
----------------------------------------
*Student:* ${leadName}
*Phone:* ${lead.phone}${altPhone}
*School:* ${school}
*Course:* ${course}
*Current Status:* ${lead.stage}
*Scheduled Callback:* ${followUp.full}
*Reminder Note:* ${notes}

*Direct Call:* tel:${lead.phone}
*WhatsApp Student:* https://api.whatsapp.com/send?phone=${cleanStudentPhone}`
    );
  }

  /**
   * Generate PB / demo booked confirmation text for student
   */
  buildDemoConfirmation(lead, counsellor) {
    const sessionDate = formatDateTime(lead.demo_date);
    const counsellorName = counsellor ? counsellor.name : 'PW Academic Counsellor';
    const topic = lead.demo_topic || 'Profile Building & Academic Evaluation';
    const link = lead.demo_link || 'Meeting link will be shared 15 minutes before the session';

    return (
`*PW GLOBAL - Profile Building & Demo Session Confirmed*

Dear *${lead.name}*,
Your exclusive 1-on-1 Profile Building (PB) & Demo Session has been confirmed!

*Date:* ${sessionDate.date}
*Time:* ${sessionDate.time}
*Topic:* ${topic}
*Meeting Link:* ${link}

Your Academic Counsellor *${counsellorName}* will review your profile, curriculum at *${lead.school || 'your school'}*, and academic roadmap.

Please ensure you join 5 minutes early. Looking forward to connecting with you!`
    );
  }

  formatDateTime(dateVal) {
    return formatDateTime(dateVal);
  }
}

module.exports = new WhatsAppService();
