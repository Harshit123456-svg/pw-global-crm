import React from 'react';
import { Phone, MessageSquare, Clock, BookOpen, Star, FileSpreadsheet, GraduationCap, Lock, User } from 'lucide-react';
import StageBadge, { STAGES } from './StageBadge';
import { useAuth } from '../context/AuthContext';

export default function LeadTable({
  leads,
  counsellors = [],
  selectedLeadIds,
  onToggleSelect,
  onSelectAll,
  onLeadClick,
  onStageChange,
  onToggleStar,
  onBookDemo,
  onScheduleFollowUp,
  onOpenWhatsApp,
  onAssignCounsellor
}) {
  const { isAdmin } = useAuth();
  const allSelected = leads.length > 0 && selectedLeadIds.length === leads.length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <th className="py-3 px-3 w-8 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onSelectAll && onSelectAll(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="py-3 px-2 w-6 text-center">★</th>
              <th className="py-3 px-3">Lead & Contact</th>
              <th className="py-3 px-3">School / Institution</th>
              <th className="py-3 px-3">Emails (Student / Parent)</th>
              <th className="py-3 px-3">Current Status</th>
              <th className="py-3 px-3">Assigned Owner</th>
              <th className="py-3 px-3">Follow-Up / PB Session</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  No leads found in this pipeline view.
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const isSelected = selectedLeadIds.includes(lead.id);
                const isOverdue = lead.follow_up_date && new Date(lead.follow_up_date) < new Date() && new Date(lead.follow_up_date).toDateString() !== new Date().toDateString();
                const isDueToday = lead.follow_up_date && new Date(lead.follow_up_date).toDateString() === new Date().toDateString();

                return (
                  <tr
                    key={lead.id}
                    onClick={() => onLeadClick(lead)}
                    className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-50/40' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect && onToggleSelect(lead.id)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>

                    {/* Star */}
                    <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onToggleStar(lead.id)}
                        className="text-slate-300 hover:text-amber-500 transition-colors"
                      >
                        <Star className={`w-4 h-4 ${lead.is_important ? 'fill-amber-400 text-amber-500' : ''}`} />
                      </button>
                    </td>

                    {/* Name & Numbers */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                        {lead.name}
                      </div>
                      <div className="text-slate-500 font-medium text-[11px] flex items-center gap-1.5">
                        <span>{lead.phone}</span>
                        {lead.alt_phone && (
                          <span className="text-[10px] text-slate-400 font-normal">| Alt: {lead.alt_phone}</span>
                        )}
                      </div>
                    </td>

                    {/* School */}
                    <td className="py-3 px-3 max-w-[150px] truncate">
                      {lead.school ? (
                        <span className="font-medium text-slate-800 flex items-center gap-1 truncate" title={lead.school}>
                          <GraduationCap className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span className="truncate">{lead.school}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not set</span>
                      )}
                    </td>

                    {/* Emails */}
                    <td className="py-3 px-3 text-[11px]">
                      {lead.student_email && (
                        <div className="text-indigo-700 truncate max-w-[130px]" title={`Student: ${lead.student_email}`}>
                          S: {lead.student_email}
                        </div>
                      )}
                      {lead.parent_email && (
                        <div className="text-purple-700 truncate max-w-[130px]" title={`Parent: ${lead.parent_email}`}>
                          P: {lead.parent_email}
                        </div>
                      )}
                      {!lead.student_email && !lead.parent_email && (
                        <span className="text-slate-400">{lead.email || '-'}</span>
                      )}
                    </td>

                    {/* Stage Dropdown */}
                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={lead.stage}
                        onChange={(e) => onStageChange(lead, e.target.value)}
                        className="text-xs font-semibold px-2 py-1 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[150px]"
                      >
                        {STAGES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>

                    {/* Assigned Owner (Admin interactive assignment vs Counsellor locked) */}
                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                      {isAdmin ? (
                        /* Admin can assign leads to any counsellor right in the table */
                        <select
                          value={lead.assigned_user_id || ''}
                          onChange={(e) => onAssignCounsellor && onAssignCounsellor(lead.id, e.target.value)}
                          className="text-[11px] font-bold text-indigo-900 bg-indigo-50/70 border border-indigo-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-indigo-500 max-w-[140px] truncate"
                        >
                          <option value="">Unassigned Pool</option>
                          {counsellors.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      ) : (
                        /* Counsellor cannot change owner */
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                          <span>{lead.counsellor_name || 'Unassigned'}</span>
                          <Lock className="w-2.5 h-2.5 text-slate-400" />
                        </span>
                      )}
                    </td>

                    {/* Follow Up / PB Session */}
                    <td className="py-3 px-3">
                      {(lead.stage === 'PB Session Booked' || lead.stage === 'Demo Booked') && lead.demo_date ? (
                        <div className="text-purple-700 font-bold flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 shrink-0" />
                          <span>{new Date(lead.demo_date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ) : lead.follow_up_date ? (
                        <div className={`font-semibold flex items-center gap-1 ${
                          isOverdue ? 'text-rose-600 font-bold' : isDueToday ? 'text-amber-700 font-bold' : 'text-slate-600'
                        }`}>
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>{new Date(lead.follow_up_date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Quick Actions */}
                    <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`tel:${lead.phone}`}
                          title="Call Primary"
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>

                        <button
                          onClick={() => onOpenWhatsApp(lead, 'lead')}
                          title="WhatsApp Student"
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onBookDemo(lead)}
                          title="Book PB Session"
                          className="p-1.5 text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onScheduleFollowUp(lead)}
                          title="Schedule Follow-up"
                          className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
