import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users2,
  CalendarCheck2,
  History,
  FileSpreadsheet,
  Award,
  PhoneCall,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import api from '../services/api';

export default function AnalyticsPage({ onOpenLead }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activityFilter, setActivityFilter] = useState('All');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/dashboard');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading || !data) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading analytics & audit reports...</div>;
  }

  const { kpis, funnel, counsellorPerformance, sheetsBreakdown, recentActivities } = data;

  const filteredActivities = recentActivities.filter(a => {
    if (activityFilter === 'All') return true;
    if (activityFilter === 'Calls') return a.activity_type === 'call_logged';
    if (activityFilter === 'Demos') return a.activity_type === 'demo_booked';
    if (activityFilter === 'Stages') return a.activity_type === 'stage_change';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          Admin Analytics & Counsellor Operations
        </h1>
        <p className="text-xs text-slate-500">
          Analyze conversion funnels, measure counsellor productivity, and audit team activities
        </p>
      </div>

      {/* Top Conversion KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Overall Conversion Rate</div>
          <div className="text-2xl font-black text-emerald-600 mt-1 flex items-center gap-1">
            {kpis.conversionRate}%
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{kpis.enrolled} conversions out of {kpis.totalLeads} total leads</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Demo Show-Up Rate</div>
          <div className="text-2xl font-black text-purple-600 mt-1 flex items-center gap-1">
            {kpis.demoAttendanceRate}%
            <CalendarCheck2 className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{kpis.demosAttended} attended out of {kpis.demosBooked + kpis.demosAttended} booked</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Demos Scheduled</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {kpis.demosBooked}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Currently in progress</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Active Counsellors</div>
          <div className="text-2xl font-black text-indigo-600 mt-1">
            {counsellorPerformance.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Handling incoming inquiries</p>
        </div>
      </div>

      {/* Conversion Funnel Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Lead Progression Funnel</h3>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {funnel.map((step, idx) => {
            const percentage = kpis.totalLeads > 0 ? Math.round((step.count / kpis.totalLeads) * 100) : 0;
            return (
              <div key={idx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{step.stage}</span>
                  <span className="text-slate-400 font-mono text-[11px]">#{idx + 1}</span>
                </div>
                <div className="text-xl font-black text-slate-900">{step.count}</div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 text-right font-medium">
                  {percentage}% of leads
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Counsellor Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-3 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">Counsellor Productivity Leaderboard</h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">Counsellor</th>
                <th className="py-2.5 px-3 text-center">Assigned</th>
                <th className="py-2.5 px-3 text-center">Calls Logged</th>
                <th className="py-2.5 px-3 text-center">Demos Booked</th>
                <th className="py-2.5 px-3 text-center">Conversions</th>
                <th className="py-2.5 px-3 text-right">Conversion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {counsellorPerformance.map((c) => {
                const cRate = c.assigned_leads > 0 ? ((c.conversions / c.assigned_leads) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={c.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <div>{c.name}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{c.email}</div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-800">{c.assigned_leads}</td>
                    <td className="py-3 px-3 text-center font-semibold text-indigo-700">{c.calls_made}</td>
                    <td className="py-3 px-3 text-center font-bold text-purple-700">{c.demos_booked}</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-700">{c.conversions}</td>
                    <td className="py-3 px-3 text-right font-black text-slate-900">{cRate}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Counsellor Activity Audit Trail (Learn what they are doing) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Live Team Audit Log (What they are doing)</h3>
          </div>

          <div className="flex items-center gap-1.5">
            {['All', 'Calls', 'Demos', 'Stages'].map((f) => (
              <button
                key={f}
                onClick={() => setActivityFilter(f)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                  activityFilter === f
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
          {filteredActivities.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No activities match this filter.</div>
          ) : (
            filteredActivities.map((act) => (
              <div
                key={act.id}
                onClick={() => act.lead_id && onOpenLead(act.lead_id)}
                className="p-3 bg-slate-50/70 hover:bg-slate-100 rounded-xl border border-slate-200 text-xs flex items-start justify-between gap-3 cursor-pointer transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{act.user_name || 'System'}</span>
                    <span className="text-slate-400">•</span>
                    <span className="font-medium text-indigo-700">Lead: {act.lead_name || 'Inquiry'}</span>
                    <span className="text-slate-400 text-[11px]">({act.lead_phone})</span>
                  </div>
                  {act.from_stage && act.to_stage && (
                    <div className="text-[11px] font-semibold text-purple-700">
                      Moved stage: {act.from_stage} → {act.to_stage}
                    </div>
                  )}
                  {act.notes && (
                    <div className="text-slate-600 text-[11px] italic bg-white p-2 rounded-lg border border-slate-100">
                      "{act.notes}"
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                  {act.created_at ? new Date(act.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
