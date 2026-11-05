import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  LayoutGrid,
  List,
  Columns3,
  Star,
  Users2,
  Clock,
  Plus,
  RefreshCw,
  AlertTriangle,
  GraduationCap,
  Phone,
  MessageSquare,
  BookOpen,
  UserCheck,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import LeadCard from '../components/LeadCard';
import LeadTable from '../components/LeadTable';
import StageBadge, { STAGES } from '../components/StageBadge';
import api from '../services/api';

export default function LeadsPage({
  onOpenLead,
  onOpenNewLead,
  onBookDemo,
  onScheduleFollowUp,
  onOpenWhatsApp
}) {
  const { user, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters state
  const [stageFilter, setStageFilter] = useState(searchParams.get('stage') || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSheetId, setSelectedSheetId] = useState('');
  const [selectedCounsellorId, setSelectedCounsellorId] = useState('');
  const [onlyImportant, setOnlyImportant] = useState(searchParams.get('is_important') === '1');
  const [followUpFilter, setFollowUpFilter] = useState(searchParams.get('follow_up_filter') || '');
  
  // Default view mode: table for Admin (so they see all team leads clearly), kanban for Counsellors
  const [viewMode, setViewMode] = useState(isAdmin ? 'table' : 'kanban');

  // Data
  const [leads, setLeads] = useState([]);
  const [sheets, setSheets] = useState([]);
  const [counsellors, setCounsellors] = useState([]);
  const [pipelineCounts, setPipelineCounts] = useState({ byStage: {} });
  const [loading, setLoading] = useState(true);

  // Bulk actions
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [bulkCounsellorId, setBulkCounsellorId] = useState('');
  const [bulkAssigning, setBulkAssigning] = useState(false);

  const fetchFiltersAndCounts = async () => {
    try {
      const [sheetsRes, countsRes] = await Promise.all([
        api.get('/sheets'),
        api.get('/leads/pipeline-counts')
      ]);
      setSheets(sheetsRes.data.sheets || []);
      setPipelineCounts(countsRes.data || { byStage: {} });

      if (isAdmin) {
        const cRes = await api.get('/users/counsellors');
        setCounsellors(cRes.data.counsellors || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (stageFilter) params.append('stage', stageFilter);
      if (selectedSheetId) params.append('sheet_id', selectedSheetId);
      if (selectedCounsellorId) params.append('counsellor_id', selectedCounsellorId);
      if (onlyImportant) params.append('is_important', '1');
      if (followUpFilter) params.append('follow_up_filter', followUpFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await api.get(`/leads?${params.toString()}`);
      setLeads(res.data.leads || []);
      setSelectedLeadIds([]);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiltersAndCounts();
  }, [isAdmin]);

  useEffect(() => {
    fetchLeads();
  }, [stageFilter, selectedSheetId, selectedCounsellorId, onlyImportant, followUpFilter, searchQuery]);

  // Stage change handler
  const handleStageChange = async (lead, newStage) => {
    if (newStage === 'PB Session Booked' || newStage === 'Demo Booked') {
      onBookDemo(lead);
      return;
    }

    try {
      const res = await api.put(`/leads/${lead.id}/stage`, { stage: newStage });
      setLeads(prev => prev.map(l => l.id === lead.id ? res.data.lead : l));
      fetchFiltersAndCounts();
    } catch (err) {
      alert('Error updating stage: ' + (err.response?.data?.error || err.message));
    }
  };

  // Admin Single Lead Reassignment
  const handleAssignCounsellor = async (leadId, newCounsellorId) => {
    try {
      const res = await api.put(`/leads/${leadId}/assign`, {
        assigned_user_id: newCounsellorId ? parseInt(newCounsellorId) : null
      });
      setLeads(prev => prev.map(l => l.id === leadId ? res.data.lead : l));
      fetchFiltersAndCounts();
    } catch (err) {
      alert('Failed to reassign: ' + (err.response?.data?.error || err.message));
    }
  };

  // Toggle Star
  const handleToggleStar = async (leadId) => {
    try {
      const res = await api.put(`/leads/${leadId}/star`);
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, is_important: res.data.is_important } : l));
    } catch (err) {
      console.error(err);
    }
  };

  // Bulk Assignment (Admin)
  const handleBulkAssign = async () => {
    if (!bulkCounsellorId || selectedLeadIds.length === 0) return;
    setBulkAssigning(true);
    try {
      await api.post('/leads/bulk-assign', {
        lead_ids: selectedLeadIds,
        assigned_user_id: parseInt(bulkCounsellorId)
      });
      alert(`Successfully assigned ${selectedLeadIds.length} leads!`);
      setSelectedLeadIds([]);
      fetchLeads();
      fetchFiltersAndCounts();
    } catch (err) {
      alert('Bulk assign failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setBulkAssigning(false);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedLeadIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked) => {
    setSelectedLeadIds(checked ? leads.map(l => l.id) : []);
  };

  // Group leads with respect to stages (for the Stage Pipeline Kanban view)
  const leadsByStage = {};
  STAGES.forEach(s => {
    leadsByStage[s] = leads.filter(l => l.stage === s);
  });

  return (
    <div className="space-y-4">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Users2 className="w-5 h-5 text-indigo-600" />
              {isAdmin ? 'All Team Leads (Admin Command Center)' : 'My Leads Pipeline'}
            </h1>
            {isAdmin && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                Full Team Visibility
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Showing {leads.length} leads {isAdmin ? 'across all counsellors' : 'in your active pipeline'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg flex items-center gap-1 text-xs font-semibold transition-all ${viewMode === 'table' ? 'bg-white shadow-xs text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
              title="Table View (Clear overview of all team leads)"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg flex items-center gap-1 text-xs font-semibold transition-all ${viewMode === 'grid' ? 'bg-white shadow-xs text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg flex items-center gap-1 text-xs font-semibold transition-all ${viewMode === 'kanban' ? 'bg-white shadow-xs text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
              title="Stage Columns View (Pipeline wrt Stages)"
            >
              <Columns3 className="w-4 h-4" />
              <span className="hidden sm:inline">Stages View</span>
            </button>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={() => { fetchLeads(); fetchFiltersAndCounts(); }}
            disabled={loading}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-600 hover:border-indigo-300 transition-colors shadow-xs"
            title="Refresh Leads"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* New Lead */}
          <button
            onClick={onOpenNewLead}
            className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Admin Quick Counsellor Filter Tabs (Instantly view leads of each counsellor or all) */}
      {isAdmin && (
        <div className="bg-indigo-50/60 p-2.5 rounded-2xl border border-indigo-100 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-xs font-bold text-indigo-950 flex items-center gap-1 shrink-0 px-1">
            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Counsellor Filter:</span>
          </span>

          <button
            onClick={() => setSelectedCounsellorId('')}
            className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCounsellorId === ''
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-indigo-900 border border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            All Counsellors ({pipelineCounts.total || leads.length})
          </button>

          {counsellors.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCounsellorId(String(c.id))}
              className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCounsellorId === String(c.id)
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-indigo-50'
              }`}
            >
              {c.name}
            </button>
          ))}

          <button
            onClick={() => setSelectedCounsellorId('unassigned')}
            className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCounsellorId === 'unassigned'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
            }`}
          >
            Unassigned Pool
          </button>
        </div>
      )}

      {/* Stage Filter Tabs (Horizontal stages bar with lead counters) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => { setStageFilter(''); setFollowUpFilter(''); }}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            stageFilter === '' && followUpFilter === ''
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>All Stages</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${stageFilter === '' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {leads.length}
          </span>
        </button>

        {STAGES.map((s) => {
          const count = pipelineCounts.byStage?.[s] || 0;
          return (
            <button
              key={s}
              onClick={() => { setStageFilter(s); setFollowUpFilter(''); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                stageFilter === s
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{s}</span>
              {count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  stageFilter === s ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}

        <div className="h-5 w-[1px] bg-slate-300 mx-1 shrink-0"></div>

        {/* Due Today & Overdue Quick Filters */}
        <button
          onClick={() => { setFollowUpFilter('today'); setStageFilter(''); }}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
            followUpFilter === 'today'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100'
          }`}
        >
          <Clock className="w-3 h-3" />
          Due Today
        </button>

        <button
          onClick={() => { setFollowUpFilter('overdue'); setStageFilter(''); }}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
            followUpFilter === 'overdue'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-rose-50 border border-rose-200 text-rose-900 hover:bg-rose-100'
          }`}
        >
          <AlertTriangle className="w-3 h-3" />
          Overdue
        </button>

        <button
          onClick={() => setOnlyImportant(!onlyImportant)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
            onlyImportant
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${onlyImportant ? 'fill-white' : 'text-amber-500'}`} />
          Starred
        </button>
      </div>

      {/* Search & Sheet Filter Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        {/* Search */}
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student, phone, school, emails, notes, counsellor name..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Sheet Source Filter */}
        <div className="sm:col-span-4">
          <select
            value={selectedSheetId}
            onChange={(e) => setSelectedSheetId(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">All Google Sheets</option>
            {sheets.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Assignment Bar for Admin */}
      {isAdmin && selectedLeadIds.length > 0 && (
        <div className="bg-indigo-900 text-white px-4 py-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg animate-in fade-in duration-150">
          <div className="text-xs font-semibold flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[11px] font-bold">
              {selectedLeadIds.length}
            </span>
            <span>leads selected for assignment</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={bulkCounsellorId}
              onChange={(e) => setBulkCounsellorId(e.target.value)}
              className="px-3 py-1 text-xs rounded-xl bg-indigo-800 text-white border border-indigo-700 focus:outline-none font-bold"
            >
              <option value="">Select Counsellor to Assign</option>
              {counsellors.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <button
              onClick={handleBulkAssign}
              disabled={bulkAssigning || !bulkCounsellorId}
              className="px-3 py-1 text-xs font-bold bg-white text-indigo-950 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
            >
              {bulkAssigning ? 'Assigning...' : 'Assign Leads'}
            </button>
          </div>
        </div>
      )}

      {/* Pipeline Content View */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading pipeline leads...</div>
      ) : leads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Users2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No leads found in this filter</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try switching stages or clearing your search term to see more leads.
          </p>
          <button
            onClick={() => { setStageFilter(''); setFollowUpFilter(''); setSearchQuery(''); setSelectedCounsellorId(''); }}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl"
          >
            Show All Leads
          </button>
        </div>
      ) : viewMode === 'kanban' ? (
        /* Stage-by-Stage Pipeline Kanban Board */
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max items-start">
            {STAGES.map((st) => {
              const stageLeads = leadsByStage[st] || [];
              if (stageFilter && stageFilter !== st) return null;

              return (
                <div
                  key={st}
                  className="w-80 bg-slate-100/70 rounded-2xl border border-slate-200/80 p-3 space-y-3 shrink-0"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <StageBadge stage={st} size="sm" />
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 shadow-2xs">
                      {stageLeads.length}
                    </span>
                  </div>

                  {/* Leads in this stage */}
                  <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
                    {stageLeads.length === 0 ? (
                      <div className="py-6 text-center text-[11px] text-slate-400 italic bg-white/60 rounded-xl border border-dashed border-slate-200">
                        No leads in {st}
                      </div>
                    ) : (
                      stageLeads.map((lead) => (
                        <div
                          key={lead.id}
                          onClick={() => onOpenLead(lead.id)}
                          className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer space-y-2 group"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <h4 className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 truncate transition-colors">
                                {lead.name}
                              </h4>
                              <div className="text-[11px] text-slate-500 font-medium">
                                {lead.phone}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleStar(lead.id);
                              }}
                              className="text-slate-300 hover:text-amber-500 p-0.5"
                            >
                              <Star className={`w-3.5 h-3.5 ${lead.is_important ? 'fill-amber-400 text-amber-500' : ''}`} />
                            </button>
                          </div>

                          {lead.school && (
                            <div className="text-[11px] text-indigo-950 font-semibold flex items-center gap-1 truncate">
                              <GraduationCap className="w-3 h-3 text-indigo-500 shrink-0" />
                              <span className="truncate">{lead.school}</span>
                            </div>
                          )}

                          {/* Owner badge */}
                          <div className="text-[10px] text-slate-500 flex items-center justify-between">
                            <span>Owner: <strong className="text-slate-800">{lead.counsellor_name || 'Unassigned'}</strong></span>
                          </div>

                          {lead.notes && (
                            <p className="text-[11px] text-slate-500 line-clamp-2 italic bg-slate-50 p-1.5 rounded-lg">
                              "{lead.notes.split('\n')[0]}"
                            </p>
                          )}

                          {/* Quick buttons */}
                          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-[10px] text-slate-400 truncate max-w-[100px]">
                              {lead.source || 'Lead'}
                            </span>
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <a
                                href={`tel:${lead.phone}`}
                                className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                                title="Call"
                              >
                                <Phone className="w-3 h-3" />
                              </a>
                              <button
                                onClick={() => onOpenWhatsApp(lead, 'lead')}
                                className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                                title="WhatsApp Student"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onBookDemo(lead)}
                                className="p-1 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded"
                                title="Book PB Session"
                              >
                                <BookOpen className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              counsellors={counsellors}
              onClick={(l) => onOpenLead(l.id)}
              onStageChange={handleStageChange}
              onToggleStar={handleToggleStar}
              onBookDemo={onBookDemo}
              onScheduleFollowUp={onScheduleFollowUp}
              onOpenWhatsApp={onOpenWhatsApp}
              onAssignCounsellor={handleAssignCounsellor}
            />
          ))}
        </div>
      ) : (
        <LeadTable
          leads={leads}
          counsellors={counsellors}
          selectedLeadIds={selectedLeadIds}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          onLeadClick={(l) => onOpenLead(l.id)}
          onStageChange={handleStageChange}
          onToggleStar={handleToggleStar}
          onBookDemo={onBookDemo}
          onScheduleFollowUp={onScheduleFollowUp}
          onOpenWhatsApp={onOpenWhatsApp}
          onAssignCounsellor={handleAssignCounsellor}
        />
      )}
    </div>
  );
}
