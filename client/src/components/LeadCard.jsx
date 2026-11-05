import React from 'react';
import { Phone, MessageSquare, Clock, Star, BookOpen, GraduationCap, ChevronRight, User, Lock } from 'lucide-react';
import StageBadge, { STAGES } from './StageBadge';
import { useAuth } from '../context/AuthContext';

export default function LeadCard({
  lead,
  counsellors = [],
  onClick,
  onStageChange,
  onToggleStar,
  onBookDemo,
  onScheduleFollowUp,
  onOpenWhatsApp,
  onAssignCounsellor
}) {
  const { isAdmin } = useAuth();
  const isOverdue = lead.follow_up_date && new Date(lead.follow_up_date) < new Date() && new Date(lead.follow_up_date).toDateString() !== new Date().toDateString();
  const isDueToday = lead.follow_up_date && new Date(lead.follow_up_date).toDateString() === new Date().toDateString();

  return (
    <div className={`
      group bg-white rounded-2xl border transition-all duration-150 p-4 shadow-xs hover:shadow-md
      ${lead.is_important ? 'border-amber-300 ring-1 ring-amber-200/50 bg-amber-50/10' : 'border-slate-200 hover:border-indigo-300'}
    `}>
      {/* Top Header: Star, Name, Stage */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar(lead.id);
            }}
            className="p-1 -ml-1 text-slate-300 hover:text-amber-500 transition-colors"
            title={lead.is_important ? 'Starred Lead' : 'Star as Important'}
          >
            <Star className={`w-4 h-4 ${lead.is_important ? 'fill-amber-400 text-amber-500' : ''}`} />
          </button>
          <div 
            onClick={() => onClick(lead)}
            className="cursor-pointer min-w-0"
          >
            <h4 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 truncate transition-colors">
              {lead.name}
            </h4>
            <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
              <span>{lead.phone}</span>
              {lead.alt_phone && (
                <span className="text-[10px] text-slate-400">Alt: {lead.alt_phone}</span>
              )}
            </div>
          </div>
        </div>

        <StageBadge stage={lead.stage} size="sm" />
      </div>

      {/* School & Course Tags */}
      <div className="space-y-1.5 my-2.5">
        {lead.school && (
          <div className="text-xs text-indigo-950 font-semibold flex items-center gap-1.5 truncate">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="truncate">{lead.school}</span>
          </div>
        )}
        <div className="text-xs text-slate-600 truncate">
          📚 {lead.course_interest || 'General Inquiry'}
        </div>
      </div>

      {/* Counsellor Owner Ribbon */}
      <div className="my-2 text-[11px] flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
        <span className="text-slate-500 flex items-center gap-1">
          <User className="w-3 h-3 text-slate-400" />
          <span>Assigned:</span>
        </span>
        {isAdmin ? (
          /* Admin can assign/reassign to any counsellor */
          <select
            value={lead.assigned_user_id || ''}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              if (onAssignCounsellor) onAssignCounsellor(lead.id, e.target.value);
            }}
            className="text-[11px] font-bold bg-white text-indigo-900 border border-slate-200 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[150px] truncate"
          >
            <option value="">Unassigned</option>
            {counsellors.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        ) : (
          /* Counsellor cannot change owner (locked) */
          <span className="font-semibold text-slate-700 flex items-center gap-1">
            <span>{lead.counsellor_name || 'Unassigned'}</span>
            <Lock className="w-2.5 h-2.5 text-slate-400" />
          </span>
        )}
      </div>

      {/* PB Session / Follow-up Alert Ribbon */}
      {(lead.stage === 'PB Session Booked' || lead.stage === 'Demo Booked') && lead.demo_date ? (
        <div className="mb-3 px-2.5 py-1.5 bg-purple-50 rounded-lg border border-purple-200 text-purple-900 text-[11px] flex items-center justify-between">
          <span className="font-bold flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-purple-600" />
            PB Session: {new Date(lead.demo_date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenWhatsApp(lead, 'lead');
            }}
            className="text-[10px] text-purple-700 underline font-bold"
          >
            Remind
          </button>
        </div>
      ) : lead.follow_up_date ? (
        <div className={`mb-3 px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center justify-between ${
          isOverdue 
            ? 'bg-rose-50 border-rose-200 text-rose-800' 
            : isDueToday 
            ? 'bg-amber-50 border-amber-200 text-amber-900' 
            : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}>
          <span className="font-semibold flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {isOverdue ? 'Overdue: ' : isDueToday ? 'Today: ' : 'Follow-up: '}
            {new Date(lead.follow_up_date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenWhatsApp(lead, 'counsellor');
            }}
            title="Send reminder to my WhatsApp"
            className="text-[10px] font-bold text-emerald-700 underline"
          >
            WA Alert
          </button>
        </div>
      ) : null}

      {/* Latest Notes Snippet */}
      {lead.notes && (
        <p className="text-[11px] text-slate-500 line-clamp-2 italic mb-3 bg-slate-50 p-2 rounded-lg">
          "{lead.notes.split('\n')[0]}"
        </p>
      )}

      {/* Action Footer */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <a
            href={`tel:${lead.phone}`}
            onClick={(e) => e.stopPropagation()}
            title="Call Lead"
            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenWhatsApp(lead, 'lead');
            }}
            title="WhatsApp Student"
            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onBookDemo(lead);
            }}
            title="Book PB Session"
            className="p-1.5 text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onScheduleFollowUp(lead);
            }}
            title="Schedule Follow-up"
            className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={() => onClick(lead)}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
        >
          Details <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
