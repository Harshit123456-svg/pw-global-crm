import React, { useState, useEffect } from 'react';
import {
  CalendarCheck2,
  Clock,
  Video,
  User,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Phone,
  Filter
} from 'lucide-react';
import api from '../services/api';

export default function DemoSessionsPage({ onOpenLead, onOpenWhatsApp, onScheduleFollowUp }) {
  const [demos, setDemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'Scheduled', 'Attended', 'No Show'

  const fetchDemos = async () => {
    setLoading(true);
    try {
      const res = await api.get('/leads?stage=Demo Booked');
      const attendedRes = await api.get('/leads?stage=Demo Attended');
      const combined = [...(res.data.leads || []), ...(attendedRes.data.leads || [])];
      
      // Sort chronologically by demo_date
      combined.sort((a, b) => new Date(a.demo_date || 0) - new Date(b.demo_date || 0));
      setDemos(combined);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemos();
  }, []);

  const handleUpdateAttendance = async (lead, attendance) => {
    try {
      const targetStage = attendance === 'Attended' ? 'Demo Attended' : 'Demo Booked';
      const res = await api.put(`/leads/${lead.id}/stage`, {
        stage: targetStage,
        notes: `Demo Session marked as "${attendance}" by counsellor`
      });

      // Update attendance status locally
      setDemos(prev => prev.map(d => d.id === lead.id ? { ...res.data.lead, demo_attendance: attendance } : d));
    } catch (err) {
      alert('Failed to update attendance: ' + (err.response?.data?.error || err.message));
    }
  };

  const filteredDemos = demos.filter(d => {
    if (statusFilter === 'All') return true;
    if (statusFilter === 'Scheduled') return d.stage === 'Demo Booked';
    if (statusFilter === 'Attended') return d.stage === 'Demo Attended';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-purple-600" />
            1-on-1 Demo Sessions Manager
          </h1>
          <p className="text-xs text-slate-500">
            Track booked demos, join video calls, and record student attendance with Google Sheet writeback
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          {['All', 'Scheduled', 'Attended'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === status
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Demos List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading demo sessions...</div>
      ) : filteredDemos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
          <CalendarCheck2 className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Demo Sessions Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Book a demo session directly from any lead card or detail drawer when on call with a student!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDemos.map((demo) => {
            const isAttended = demo.stage === 'Demo Attended';
            const demoDateTime = demo.demo_date ? new Date(demo.demo_date) : null;

            return (
              <div
                key={demo.id}
                className={`bg-white rounded-2xl border p-4 shadow-xs space-y-3 transition-all ${
                  isAttended ? 'border-emerald-200 bg-emerald-50/10' : 'border-purple-200 hover:shadow-md'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 
                      onClick={() => onOpenLead(demo.id)}
                      className="font-bold text-sm text-slate-900 hover:text-purple-600 cursor-pointer"
                    >
                      {demo.name}
                    </h3>
                    <div className="text-xs text-slate-500">{demo.phone}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isAttended 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                      : 'bg-purple-100 text-purple-800 border border-purple-200'
                  }`}>
                    {isAttended ? 'Attended ✅' : 'Scheduled'}
                  </span>
                </div>

                {/* Session Details */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-purple-600" />
                    <span>
                      {demoDateTime ? demoDateTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'No date'}
                      {' at '}
                      {demoDateTime ? demoDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  <div className="text-slate-600 truncate">
                    <strong>Topic:</strong> {demo.demo_topic || 'Academic Evaluation'}
                  </div>

                  <div className="text-slate-600 truncate">
                    <strong>Counsellor:</strong> {demo.counsellor_name || 'Assigned Staff'}
                  </div>
                </div>

                {/* Join Link */}
                {demo.demo_link && (
                  <a
                    href={demo.demo_link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                  >
                    <Video className="w-4 h-4" />
                    Join Video Session
                  </a>
                )}

                {/* Action Row */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onOpenWhatsApp(demo, 'demo_reminder')}
                      title="Send WhatsApp Reminder to Student"
                      className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg flex items-center gap-1 font-semibold text-[11px]"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Remind
                    </button>

                    <a
                      href={`tel:${demo.phone}`}
                      className="p-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg"
                      title="Call Student"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {!isAttended ? (
                    <button
                      onClick={() => handleUpdateAttendance(demo, 'Attended')}
                      className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs"
                    >
                      Mark Attended
                    </button>
                  ) : (
                    <button
                      onClick={() => onScheduleFollowUp(demo)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg border border-indigo-200"
                    >
                      Post-Demo Followup
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
