import React, { useState } from 'react';
import { Calendar, Clock, MessageSquare, X, Check } from 'lucide-react';
import api from '../services/api';

export default function FollowUpModal({ lead, isOpen, onClose, onSuccess, onOpenWhatsAppReminder }) {
  if (!isOpen || !lead) return null;

  // Default follow-up date to today 5:00 PM or tomorrow 11:00 AM
  const getDefaultDateTime = () => {
    const d = new Date();
    d.setHours(d.getHours() + 2, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  const [followUpDate, setFollowUpDate] = useState(lead.follow_up_date ? lead.follow_up_date.slice(0, 16) : getDefaultDateTime());
  const [followUpNotes, setFollowUpNotes] = useState(lead.follow_up_notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.put(`/leads/${lead.id}/follow-up`, {
        follow_up_date: followUpDate,
        follow_up_notes: followUpNotes.trim()
      });

      if (onSuccess) onSuccess(res.data.lead);

      if (window.confirm("Follow-up scheduled! Would you like to send a reminder alert to your own WhatsApp now?")) {
        if (onOpenWhatsAppReminder) {
          onOpenWhatsAppReminder(res.data.lead);
        }
      }

      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to schedule follow up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-amber-50 border-b border-amber-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-950">Schedule Follow-Up</h3>
              <p className="text-xs text-amber-700">Lead: <span className="font-semibold">{lead.name}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-amber-600 hover:text-amber-900 rounded-lg hover:bg-amber-100/60">
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
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Follow-Up Timing *
            </label>
            <input
              type="datetime-local"
              required
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Follow-Up Agenda / Reminder Note
            </label>
            <textarea
              rows={3}
              value={followUpNotes}
              onChange={(e) => setFollowUpNotes(e.target.value)}
              placeholder="e.g. Call back at 5 PM after student returns from school. Provide fee installment plan."
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Quick preset buttons */}
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Quick Presets</div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setHours(d.getHours() + 2);
                  setFollowUpDate(d.toISOString().slice(0, 16));
                }}
                className="px-2.5 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 font-medium"
              >
                In 2 Hours
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 1);
                  d.setHours(11, 0, 0, 0);
                  setFollowUpDate(d.toISOString().slice(0, 16));
                }}
                className="px-2.5 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 font-medium"
              >
                Tomorrow 11 AM
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 2);
                  d.setHours(15, 0, 0, 0);
                  setFollowUpDate(d.toISOString().slice(0, 16));
                }}
                className="px-2.5 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 font-medium"
              >
                In 2 Days
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
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
              className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Set Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
