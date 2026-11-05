import React, { useState } from 'react';
import { Calendar, Clock, Video, BookOpen, MessageSquare, X, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

export default function BookDemoModal({ lead, isOpen, onClose, onSuccess, onOpenWhatsApp }) {
  if (!isOpen || !lead) return null;

  // Default demo date to tomorrow 3:00 PM
  const getDefaultDateTime = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(15, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  const [demoDate, setDemoDate] = useState(lead.demo_date ? lead.demo_date.slice(0, 16) : getDefaultDateTime());
  const [demoTopic, setDemoTopic] = useState(lead.demo_topic || `${lead.course_interest || 'Academic'} 1-on-1 Demo Session`);
  const [demoLink, setDemoLink] = useState(lead.demo_link || 'https://meet.google.com/pw-global-demo');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.put(`/leads/${lead.id}/book-demo`, {
        demo_date: demoDate,
        demo_topic: demoTopic,
        demo_link: demoLink,
        notes: notes.trim()
      });

      if (onSuccess) onSuccess(res.data.lead);

      // Offer to open WhatsApp confirmation immediately
      if (window.confirm("✅ Demo Session Booked! Would you like to send WhatsApp confirmation to the student right now?")) {
        if (onOpenWhatsApp) {
          onOpenWhatsApp(res.data.lead, 'demo_booked');
        }
      }

      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to book demo session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 bg-purple-50 border-b border-purple-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-purple-950">Book Demo Session</h3>
              <p className="text-xs text-purple-700">Lead: <span className="font-semibold">{lead.name}</span> ({lead.phone})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-purple-600 hover:text-purple-900 rounded-lg hover:bg-purple-100/60">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Demo Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              value={demoDate}
              onChange={(e) => setDemoDate(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-slate-500" />
              Demo Topic / Subject
            </label>
            <input
              type="text"
              required
              value={demoTopic}
              onChange={(e) => setDemoTopic(e.target.value)}
              placeholder="e.g. Physics Mechanics Demo & Scholarship Assessment"
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-slate-500" />
              Meeting Link (Google Meet / Zoom)
            </label>
            <input
              type="url"
              value={demoLink}
              onChange={(e) => setDemoLink(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Call Notes / Specific Parent Requests
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Father requested demo with senior physics faculty. Discuss fee waiver."
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-100 text-xs text-purple-900 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <span>
              Booking this demo will automatically update lead stage to <strong>Demo Booked</strong>, log the activity, and sync back to Google Sheets.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Saving & Syncing...' : 'Confirm Demo & Change Stage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
