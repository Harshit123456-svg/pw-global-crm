import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Users2,
  CalendarCheck2,
  Clock,
  Star,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  MessageSquare,
  Phone,
  BookOpen,
  Sparkles,
  ExternalLink,
  UserCheck,
  ShieldCheck
} from 'lucide-react';
import StageBadge from '../components/StageBadge';
import api from '../services/api';

export default function DashboardPage({
  onOpenLead,
  onBookDemo,
  onScheduleFollowUp,
  onOpenWhatsApp
}) {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [counts, setCounts] = useState({
    total: 0,
    important: 0,
    dueToday: 0,
    overdue: 0,
    pbSessionsBooked: 0,
    enrolled: 0,
    byStage: {}
  });

  const [dueLeads, setDueLeads] = useState([]);
  const [upcomingDemos, setUpcomingDemos] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [countsRes, dueRes, leadsRes] = await Promise.all([
        api.get('/leads/pipeline-counts'),
        api.get('/leads?follow_up_filter=today&limit=6'),
        api.get('/leads?stage=PB Session Booked&limit=6')
      ]);

      setCounts(countsRes.data);
      setDueLeads(dueRes.data.leads || []);
      setUpcomingDemos(leadsRes.data.leads || []);

      if (isAdmin) {
        const [analyticsRes, usersRes] = await Promise.all([
          api.get('/analytics/dashboard'),
          api.get('/users')
        ]);
        setActivities(analyticsRes.data.recentActivities || []);
        setTeamMembers(usersRes.data.users || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [isAdmin]);

  const kpis = [
    {
      title: isAdmin ? 'All Team Leads' : 'My Pipeline Leads',
      value: counts.total,
      icon: Users2,
      color: 'bg-indigo-500',
      textColor: 'text-indigo-600',
      bgLight: 'bg-indigo-50',
      onClick: () => navigate('/leads')
    },
    {
      title: 'Call Back Later',
      value: counts.byStage['Call Back later'] || 0,
      icon: Clock,
      color: 'bg-amber-500',
      textColor: 'text-amber-600',
      bgLight: 'bg-amber-50',
      onClick: () => navigate('/leads?stage=Call Back later')
    },
    {
      title: 'PB Sessions Booked',
      value: counts.pbSessionsBooked,
      icon: CalendarCheck2,
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
      bgLight: 'bg-purple-50',
      onClick: () => navigate('/demos')
    },
    {
      title: 'DNP / WA Sent',
      value: (counts.byStage['DNP/ WA sent'] || 0) + (counts.byStage['DNP'] || 0),
      icon: MessageSquare,
      color: 'bg-sky-500',
      textColor: 'text-sky-600',
      bgLight: 'bg-sky-50',
      onClick: () => navigate('/leads?stage=DNP/ WA sent')
    },
    {
      title: 'Enrolled 🎉',
      value: counts.enrolled,
      icon: TrendingUp,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      bgLight: 'bg-emerald-50',
      onClick: () => navigate('/leads?stage=Enrolled')
    },
    {
      title: 'Important / Starred',
      value: counts.important,
      icon: Star,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      bgLight: 'bg-yellow-50',
      onClick: () => navigate('/leads?is_important=1')
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-xs mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isAdmin ? 'Admin Master Control • Full Team Access' : 'Counsellor Workstation'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Welcome back, {user?.name}! 👋
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
              {isAdmin 
                ? 'You have complete visibility into all leads, counsellor workloads, and activity audit trails.' 
                : 'Here is your active pipeline. Call students, schedule PB sessions, and log progress notes.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/leads')}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <span>{isAdmin ? 'View All Team Leads' : 'Open My Pipeline'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Follow-up Alerts Bar */}
      {(counts.dueToday > 0 || counts.overdue > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {counts.overdue > 0 && (
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold">
                  {counts.overdue}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-rose-950">Overdue Follow-ups</h4>
                  <p className="text-xs text-rose-700">These students were scheduled for callback earlier</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/leads?follow_up_filter=overdue')}
                className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-100 hover:bg-rose-200/80 rounded-xl transition-colors"
              >
                View Leads
              </button>
            </div>
          )}

          {counts.dueToday > 0 && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  {counts.dueToday}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-950">Follow-ups Due Today</h4>
                  <p className="text-xs text-amber-700">Scheduled for calls and counseling today</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/leads?follow_up_filter=today')}
                className="px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200/80 rounded-xl transition-colors"
              >
                View Schedule
              </button>
            </div>
          )}
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              onClick={kpi.onClick}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-8 h-8 rounded-lg ${kpi.bgLight} ${kpi.textColor} flex items-center justify-center`}>
                  <Icon className="w-4 h-4" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                {kpi.value}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-0.5 truncate">
                {kpi.title}
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin Team Workload Widget (Only for Admin: Instant breakdown of leads per counsellor) */}
      {isAdmin && teamMembers.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-900">Team Workload & Assigned Leads</h3>
            </div>
            <button
              onClick={() => navigate('/team')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Manage Team & Links
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {teamMembers.filter(m => m.role === 'counsellor').map((member) => (
              <div
                key={member.id}
                onClick={() => navigate(`/leads?counsellor_id=${member.id}`)}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-indigo-50/50 hover:border-indigo-300 transition-all cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 truncate">
                    {member.name}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    {member.total_leads || 0} Leads
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
                  <div>
                    <span className="block font-bold text-purple-700">{member.demos_booked || 0}</span>
                    <span>PB Demos</span>
                  </div>
                  <div>
                    <span className="block font-bold text-emerald-700">{member.enrolled || 0}</span>
                    <span>Enrolled</span>
                  </div>
                  <div>
                    <span className="block font-bold text-amber-700">{member.due_today_followups || 0}</span>
                    <span>Due Today</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Section: Booked Sessions & Follow-up Action List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booked Sessions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarCheck2 className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-sm text-slate-900">Upcoming Profile Building Sessions</h3>
            </div>
            <button
              onClick={() => navigate('/demos')}
              className="text-xs font-semibold text-purple-600 hover:text-purple-700"
            >
              View All ({counts.pbSessionsBooked})
            </button>
          </div>

          {upcomingDemos.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No scheduled sessions right now. Book a session from any lead!
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingDemos.map((demo) => (
                <div
                  key={demo.id}
                  onClick={() => onOpenLead(demo.id)}
                  className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/40 hover:bg-purple-50 transition-colors cursor-pointer space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-900">{demo.name}</div>
                      <div className="text-[11px] text-purple-800 font-semibold">{demo.school || demo.course_interest}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-200/60 text-purple-800 rounded-full">
                      {demo.demo_date ? new Date(demo.demo_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'PB Session'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-purple-100">
                    <span className="truncate max-w-[200px]">📌 {demo.demo_topic || 'PB Session'}</span>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onOpenWhatsApp(demo, 'lead')}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                        title="Send WhatsApp Reminder"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      {demo.demo_link && (
                        <a
                          href={demo.demo_link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-purple-700 hover:underline flex items-center gap-0.5 font-semibold"
                        >
                          Join <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Due Follow-ups / Action Items */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-sm text-slate-900">Today's Callback Schedule</h3>
            </div>
            <button
              onClick={() => navigate('/leads?follow_up_filter=today')}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800"
            >
              View Schedule ({counts.dueToday})
            </button>
          </div>

          {dueLeads.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No pending callbacks for today.
            </div>
          ) : (
            <div className="space-y-3">
              {dueLeads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => onOpenLead(lead.id)}
                  className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/40 hover:bg-amber-50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-xs text-slate-900">{lead.name}</div>
                    <div className="text-[11px] text-slate-500">{lead.phone} • {lead.school || lead.course_interest}</div>
                    {lead.follow_up_notes && (
                      <div className="text-[11px] text-amber-800 italic mt-0.5">"{lead.follow_up_notes}"</div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <a
                      href={`tel:${lead.phone}`}
                      className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100"
                      title="Call Student"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => onOpenWhatsApp(lead, 'counsellor')}
                      className="p-1.5 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200"
                      title="WhatsApp Me Reminder"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
