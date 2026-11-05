import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  Mail,
  Calendar,
  Clock,
  Star,
  MessageSquare,
  BookOpen,
  User,
  History,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Send,
  Building2,
  GraduationCap,
  Edit2,
  Save,
  Lock,
  UserCheck
} from 'lucide-react';
import StageBadge, { STAGES } from './StageBadge';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function LeadDetailModal({
  leadId,
  isOpen,
  onClose,
  onLeadUpdated,
  onBookDemo,
  onScheduleFollowUp,
  onOpenWhatsApp
}) {
  if (!isOpen || !leadId) return null;

  const { isAdmin } = useAuth();
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [counsellors, setCounsellors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [isCallNote, setIsCallNote] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [changingStage, setChangingStage] = useState(false);
  const [reassigning, setReassigning] = useState(false);

  // Editable fields state (Past notes are strictly immutable and NOT editable)
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchLeadDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/leads/${leadId}`);
      setLead(res.data.lead);
      setActivities(res.data.activities || []);
      setEditForm({
        name: res.data.lead.name || '',
        phone: res.data.lead.phone || '',
        alt_phone: res.data.lead.alt_phone || '',
        email: res.data.lead.email || '',
        student_email: res.data.lead.student_email || '',
        parent_email: res.data.lead.parent_email || '',
        school: res.data.lead.school || '',
        source: res.data.lead.source || '',
        course_interest: res.data.lead.course_interest || ''
      });

      if (isAdmin) {
        const cRes = await api.get('/users/counsellors');
        setCounsellors(cRes.data.counsellors || []);
      }
    } catch (err) {
      console.error('Failed to load lead details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadDetails();
    setIsEditing(false);
  }, [leadId]);

  const handleStageChange = async (newStage) => {
    if (newStage === 'PB Session Booked' || newStage === 'Demo Booked') {
      onBookDemo(lead);
      return;
    }

    setChangingStage(true);
    try {
      const res = await api.put(`/leads/${lead.id}/stage`, { stage: newStage });
      setLead(res.data.lead);
      if (onLeadUpdated) onLeadUpdated(res.data.lead);
      fetchLeadDetails();
    } catch (err) {
      alert('Failed to update stage: ' + (err.response?.data?.error || err.message));
    } finally {
      setChangingStage(false);
    }
  };

  // Admin Lead Assignment Control
  const handleAssignCounsellor = async (newCounsellorId) => {
    setReassigning(true);
    try {
      const res = await api.put(`/leads/${lead.id}/assign`, {
        assigned_user_id: newCounsellorId ? parseInt(newCounsellorId) : null
      });
      setLead(res.data.lead);
      if (onLeadUpdated) onLeadUpdated(res.data.lead);
      fetchLeadDetails();
    } catch (err) {
      alert('Failed to reassign lead: ' + (err.response?.data?.error || err.message));
    } finally {
      setReassigning(false);
    }
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const res = await api.put(`/leads/${lead.id}`, editForm);
      setLead(res.data.lead);
      setIsEditing(false);
      if (onLeadUpdated) onLeadUpdated(res.data.lead);
      fetchLeadDetails();
    } catch (err) {
      alert('Failed to update details: ' + (err.response?.data?.error || err.message));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSavingNote(true);
    try {
      const res = await api.put(`/leads/${lead.id}/notes`, {
        note: newNote.trim(),
        isCallLog: isCallNote
      });
      setLead(res.data.lead);
      setNewNote('');
      if (onLeadUpdated) onLeadUpdated(res.data.lead);
      fetchLeadDetails();
    } catch (err) {
      alert('Failed to save note: ' + (err.response?.data?.error || err.message));
    } finally {
      setSavingNote(false);
    }
  };

  const handleToggleStar = async () => {
    try {
      const res = await api.put(`/leads/${lead.id}/star`);
      const updated = { ...lead, is_important: res.data.is_important };
      setLead(updated);
      if (onLeadUpdated) onLeadUpdated(updated);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs">
      <div 
        className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleStar}
              className="p-1 rounded-lg text-slate-400 hover:text-amber-500 transition-colors"
              title={lead?.is_important ? 'Starred Lead' : 'Star as Important'}
            >
              <Star className={`w-5 h-5 ${lead?.is_important ? 'fill-amber-400 text-amber-500' : ''}`} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{lead?.name || 'Loading...'}</h2>
                {lead && <StageBadge stage={lead.stage} />}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span>Created: {lead?.created_at ? new Date(lead.created_at).toLocaleDateString() : ''}</span>
                {lead?.source && (
                  <span className="flex items-center gap-1 text-indigo-600 font-medium">
                    <FileSpreadsheet className="w-3 h-3" /> {lead.source}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg flex items-center gap-1 shadow-2xs"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Cancel Edit' : 'Edit Info'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {loading || !lead ? (
          <div className="flex-1 flex items-center justify-center p-8 text-slate-400 text-sm">
            Loading lead details...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Quick Action Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <a
                href={`tel:${lead.phone}`}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold border border-emerald-200 transition-colors"
              >
                <Phone className="w-4 h-4 text-emerald-600" />
                Call Primary
              </a>

              <button
                onClick={() => onOpenWhatsApp(lead, 'lead')}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                WhatsApp
              </button>

              <button
                onClick={() => onBookDemo(lead)}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-xl text-xs font-semibold border border-purple-200 transition-colors"
              >
                <BookOpen className="w-4 h-4 text-purple-600" />
                Book PB Session
              </button>

              <button
                onClick={() => onScheduleFollowUp(lead)}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-semibold border border-amber-200 transition-colors"
              >
                <Clock className="w-4 h-4 text-amber-600" />
                Follow-up
              </button>
            </div>

            {/* Stage Selector & Admin Assignment Control */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              {/* Current Status */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">Current Status / Stage:</label>
                <select
                  value={lead.stage}
                  disabled={changingStage}
                  onChange={(e) => handleStageChange(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 bg-white shadow-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {STAGES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Owner / Assigned Counsellor */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1 flex items-center justify-between">
                  <span>Assigned Owner:</span>
                  {!isAdmin && (
                    <span className="text-[10px] text-slate-400 font-normal flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  )}
                </label>
                {isAdmin ? (
                  /* Admin can assign leads to any counsellor */
                  <select
                    value={lead.assigned_user_id || ''}
                    disabled={reassigning}
                    onChange={(e) => handleAssignCounsellor(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-indigo-300 bg-indigo-50 text-indigo-900 shadow-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">Unassigned Pool</option>
                    {counsellors.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                    ))}
                  </select>
                ) : (
                  /* Counsellor cannot change owner */
                  <div className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                    <span>{lead.counsellor_name || 'Unassigned'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Lead Details Grid */}
            {isEditing ? (
              <form onSubmit={handleSaveDetails} className="bg-indigo-50/40 p-4 rounded-2xl border border-indigo-200 space-y-3 text-xs">
                <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <Edit2 className="w-4 h-4 text-indigo-600" /> Edit Contact & School Information
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Name</label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Phone Number</label>
                    <input
                      type="text"
                      required
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Alternative Number</label>
                    <input
                      type="text"
                      value={editForm.alt_phone}
                      onChange={(e) => setEditForm({ ...editForm, alt_phone: e.target.value })}
                      placeholder="e.g. +91 9876543219"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">School / Institution</label>
                    <input
                      type="text"
                      value={editForm.school}
                      onChange={(e) => setEditForm({ ...editForm, school: e.target.value })}
                      placeholder="e.g. DPS R.K. Puram"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">General E-mail</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Student E-mail ID</label>
                    <input
                      type="email"
                      value={editForm.student_email}
                      onChange={(e) => setEditForm({ ...editForm, student_email: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Parent E-mail ID</label>
                    <input
                      type="email"
                      value={editForm.parent_email}
                      onChange={(e) => setEditForm({ ...editForm, parent_email: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Source</label>
                    <input
                      type="text"
                      value={editForm.source}
                      onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Course / Batch Interest</label>
                    <input
                      type="text"
                      value={editForm.course_interest}
                      onChange={(e) => setEditForm({ ...editForm, course_interest: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-2xs"
                  >
                    {savingEdit ? 'Saving...' : 'Save Updates'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                  {/* Phone */}
                  <div>
                    <span className="text-slate-500 block text-[11px]">Phone Number</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-bold text-slate-900">{lead.phone}</span>
                      <a href={`tel:${lead.phone}`} className="text-emerald-600 hover:text-emerald-700" title="Call">
                        <Phone className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Alternative Phone */}
                  <div>
                    <span className="text-slate-500 block text-[11px]">Alternative Number</span>
                    {lead.alt_phone ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-bold text-slate-900">{lead.alt_phone}</span>
                        <a href={`tel:${lead.alt_phone}`} className="text-emerald-600 hover:text-emerald-700" title="Call Alt">
                          <Phone className="w-3 h-3" />
                        </a>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Not provided</span>
                    )}
                  </div>

                  {/* School */}
                  <div>
                    <span className="text-slate-500 block text-[11px] flex items-center gap-1">
                      <GraduationCap className="w-3 h-3 text-indigo-500" /> School / Institution
                    </span>
                    <span className="font-bold text-slate-900 block truncate mt-0.5">
                      {lead.school || 'Not specified'}
                    </span>
                  </div>

                  {/* Student Email */}
                  <div>
                    <span className="text-slate-500 block text-[11px]">Student E-mail ID</span>
                    {lead.student_email ? (
                      <a href={`mailto:${lead.student_email}`} className="font-semibold text-indigo-600 hover:underline block truncate mt-0.5">
                        {lead.student_email}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">Not provided</span>
                    )}
                  </div>

                  {/* Parent Email */}
                  <div>
                    <span className="text-slate-500 block text-[11px]">Parent E-Mail ID</span>
                    {lead.parent_email ? (
                      <a href={`mailto:${lead.parent_email}`} className="font-semibold text-purple-600 hover:underline block truncate mt-0.5">
                        {lead.parent_email}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">Not provided</span>
                    )}
                  </div>

                  {/* General Email */}
                  <div>
                    <span className="text-slate-500 block text-[11px]">General E-Mail</span>
                    {lead.email ? (
                      <a href={`mailto:${lead.email}`} className="font-medium text-slate-800 hover:underline block truncate mt-0.5">
                        {lead.email}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">Not provided</span>
                    )}
                  </div>

                  {/* Source */}
                  <div>
                    <span className="text-slate-500 block text-[11px]">Source</span>
                    <span className="font-semibold text-slate-800 block truncate mt-0.5">
                      {lead.source || 'Direct Inquiry'}
                    </span>
                  </div>

                  {/* Course / Program */}
                  <div>
                    <span className="text-slate-500 block text-[11px]">Course / Program</span>
                    <span className="font-semibold text-slate-800 block truncate mt-0.5">
                      {lead.course_interest || 'General'}
                    </span>
                  </div>

                  {/* Assigned Counsellor */}
                  <div>
                    <span className="text-slate-500 block text-[11px]">Assigned Counsellor</span>
                    <span className="font-bold text-slate-900 block truncate mt-0.5">
                      {lead.counsellor_name || 'Unassigned'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* PB Session Banner if booked */}
            {(lead.stage === 'PB Session Booked' || lead.stage === 'Demo Booked') && lead.demo_date && (
              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-600" />
                    <span className="font-bold text-xs text-purple-950">Booked Profile Building Session</span>
                  </div>
                  <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
                    {lead.demo_attendance || 'Scheduled'}
                  </span>
                </div>
                <div className="text-xs text-purple-900 space-y-1">
                  <div><strong>Date & Time:</strong> {new Date(lead.demo_date).toLocaleString()}</div>
                  <div><strong>Topic:</strong> {lead.demo_topic}</div>
                  {lead.demo_link && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <strong>Meeting:</strong>
                      <a 
                        href={lead.demo_link} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-purple-700 hover:text-purple-900 underline flex items-center gap-1 font-semibold"
                      >
                        Join Video Call <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Follow-up banner if set */}
            {lead.follow_up_date && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Next Follow-Up: {new Date(lead.follow_up_date).toLocaleString()}
                  </div>
                  {lead.follow_up_notes && (
                    <div className="text-amber-800 text-[11px] mt-0.5">{lead.follow_up_notes}</div>
                  )}
                </div>
                <button
                  onClick={() => onOpenWhatsApp(lead, 'counsellor')}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                >
                  WhatsApp Me Reminder
                </button>
              </div>
            )}

            {/* Log Call / Add Note Section (Past notes are locked; new notes can only be appended) */}
            <form onSubmit={handleAddNote} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>Append Call Log / Progress Note</span>
                  <span className="text-[10px] text-slate-500 font-normal">(Past notes are saved permanently & locked)</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCallNote}
                    onChange={(e) => setIsCallNote(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Mark as Call Logged</span>
                </label>
              </div>
              <textarea
                rows={3}
                required
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Type new call update or parent note... (This will be permanently timestamped and cannot be deleted once saved)"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  ⚡ Permanently logs to CRM & syncs to Google Sheets
                </span>
                <button
                  type="submit"
                  disabled={savingNote || !newNote.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3 h-3" />
                  {savingNote ? 'Saving...' : 'Submit Note'}
                </button>
              </div>
            </form>

            {/* Permanent Activity Timeline & Locked Past Notes */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <History className="w-4 h-4 text-slate-500" />
                  Immutable Activity Timeline & Saved Notes ({activities.length})
                </div>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Submitted notes cannot be edited
                </span>
              </div>

              {activities.length === 0 ? (
                <div className="text-xs text-slate-400 py-3 text-center">No activity history yet.</div>
              ) : (
                <div className="space-y-2.5">
                  {activities.map((act) => (
                    <div key={act.id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs space-y-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{act.user_name || 'System'}</span>
                          <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                            {act.activity_type}
                          </span>
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {act.created_at ? new Date(act.created_at).toLocaleString() : ''}
                        </span>
                      </div>
                      {act.from_stage && act.to_stage && (
                        <div className="text-[11px] text-indigo-700 font-semibold mb-1">
                          Stage updated: {act.from_stage} → {act.to_stage}
                        </div>
                      )}
                      {act.notes && (
                        <div className="text-slate-700 bg-slate-50/60 p-2 rounded-lg border border-slate-100 whitespace-pre-wrap leading-relaxed select-text">
                          {act.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => onOpenWhatsApp(lead, 'counsellor')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            Send Reminder to My WhatsApp
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
