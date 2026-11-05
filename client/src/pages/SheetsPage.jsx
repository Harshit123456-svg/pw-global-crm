import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Code2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Sparkles,
  Users,
  Settings2,
  Trash2
} from 'lucide-react';
import api from '../services/api';

export default function SheetsPage() {
  const [sheets, setSheets] = useState([]);
  const [counsellors, setCounsellors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Sheet Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetName, setSheetName] = useState('Sheet1');
  const [assignmentMode, setAssignmentMode] = useState('round_robin'); // 'round_robin', 'specific_user', 'unassigned'
  const [defaultUserId, setDefaultUserId] = useState('');
  const [serviceAccountKey, setServiceAccountKey] = useState('');
  const [saving, setSaving] = useState(false);

  // Apps Script Code Modal
  const [scriptModalData, setScriptModalData] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Syncing / Simulating feedback
  const [syncingId, setSyncingId] = useState(null);
  const [simulatingId, setSimulatingId] = useState(null);

  const fetchSheets = async () => {
    setLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([
        api.get('/sheets'),
        api.get('/users/counsellors')
      ]);
      setSheets(sRes.data.sheets || []);
      setCounsellors(cRes.data.counsellors || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheets();
  }, []);

  const handleCreateSheet = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/sheets', {
        name: name.trim(),
        spreadsheet_id: spreadsheetId.trim(),
        sheet_name: sheetName.trim() || 'Sheet1',
        assignment_mode: assignmentMode,
        default_assigned_user_id: defaultUserId ? parseInt(defaultUserId) : null,
        service_account_key: serviceAccountKey.trim() || null
      });

      setIsAddOpen(false);
      setName('');
      setSpreadsheetId('');
      setSheetName('Sheet1');
      fetchSheets();
      alert('Google Sheet added successfully! Leads from this sheet will be distributed according to your assignment rule.');
    } catch (err) {
      alert('Error adding sheet: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleSyncNow = async (sheetId) => {
    setSyncingId(sheetId);
    try {
      const res = await api.post(`/sheets/${sheetId}/sync`);
      alert(`Sync completed! ${res.data.result?.imported || 0} leads imported.`);
      fetchSheets();
    } catch (err) {
      alert('Sync failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSyncingId(null);
    }
  };

  const handleSimulateLead = async (sheetId) => {
    setSimulatingId(sheetId);
    try {
      const res = await api.post(`/sheets/${sheetId}/simulate-leads`);
      alert(res.data.message);
      fetchSheets();
    } catch (err) {
      alert('Simulation failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSimulatingId(null);
    }
  };

  const handleViewAppsScriptCode = async (sheetId) => {
    try {
      const res = await api.get(`/sheets/${sheetId}/apps-script-code`);
      setScriptModalData(res.data);
    } catch (err) {
      alert('Failed to get script code: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteSheet = async (sheetId, sheetTitle) => {
    if (!window.confirm(`Are you sure you want to remove "${sheetTitle}" from CRM? Leads already imported will be preserved.`)) {
      return;
    }
    try {
      await api.delete(`/sheets/${sheetId}`);
      fetchSheets();
    } catch (err) {
      alert('Failed to delete sheet: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            Multi Google Sheets Manager
          </h1>
          <p className="text-xs text-slate-500">
            Connect unlimited Google Sheets, configure round-robin counsellor assignment, and enable 2-way sync
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Connect Google Sheet</span>
        </button>
      </div>

      {/* Sheets List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading sheets configuration...</div>
      ) : sheets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Google Sheets Connected Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Add your campaign or intake Google Sheet to automatically import leads and distribute them to your counselling team.
          </p>
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-xl"
          >
            Connect First Sheet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sheets.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 hover:border-slate-300 transition-all"
            >
              {/* Sheet Title & Status */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{s.name}</h3>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Tab: <span className="font-bold">{s.sheet_name}</span> • ID: {s.spreadsheet_id.slice(0, 16)}...
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDeleteSheet(s.id, s.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Remove Sheet"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Assignment Rule & Stats */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Leads</div>
                  <div className="text-base font-bold text-slate-800">{s.actual_leads_count || 0}</div>
                </div>
                <div>
                  <div className="text-[10px] text-purple-700 uppercase font-semibold">Demos Booked</div>
                  <div className="text-base font-bold text-purple-800">{s.demo_booked_count || 0}</div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-700 uppercase font-semibold">Enrolled</div>
                  <div className="text-base font-bold text-emerald-800">{s.enrolled_count || 0}</div>
                </div>
              </div>

              {/* Assignment Mode Pill */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500">Distribution Rule:</span>
                <span className="font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px]">
                  {s.assignment_mode === 'round_robin' && '🔄 Round-Robin Team'}
                  {s.assignment_mode === 'specific_user' && `👤 Assigned to ${s.default_counsellor_name || 'Specific'}`}
                  {s.assignment_mode === 'unassigned' && '📥 Unassigned Pool'}
                </span>
              </div>

              {/* Sync Timestamp */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                <span>Last Synced: {s.last_synced_at ? new Date(s.last_synced_at).toLocaleTimeString() : 'Never'}</span>
                <span className="flex items-center gap-1 font-medium text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 2-Way Sync Active
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleViewAppsScriptCode(s.id)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
                  title="View Google Apps Script Webhook Snippet"
                >
                  <Code2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Apps Script Webhook</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSimulateLead(s.id)}
                    disabled={simulatingId === s.id}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors border border-indigo-200 flex items-center gap-1"
                    title="Simulate a new lead arrival from this sheet to test round-robin"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{simulatingId === s.id ? 'Adding...' : 'Test Inbound Lead'}</span>
                  </button>

                  <button
                    onClick={() => handleSyncNow(s.id)}
                    disabled={syncingId === s.id}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingId === s.id ? 'animate-spin' : ''}`} />
                    <span>{syncingId === s.id ? 'Syncing...' : 'Sync Now'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Google Sheet Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in duration-150">
            <div className="flex items-center justify-between px-6 py-4 bg-emerald-50 border-b border-emerald-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-950">Connect Google Sheet</h3>
                  <p className="text-xs text-emerald-700">Add a source sheet for automated lead distribution</p>
                </div>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="p-1.5 text-emerald-600 hover:text-emerald-900 rounded-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSheet} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sheet Label / Campaign Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. PW Global - JEE 2026 Batch Leads"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Google Spreadsheet ID or Full URL *</label>
                <input
                  type="text"
                  required
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1A2B3C4D5E... or raw ID"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sheet Tab Name</label>
                  <input
                    type="text"
                    required
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    placeholder="Sheet1 or Form Responses"
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assignment Mode</label>
                  <select
                    value={assignmentMode}
                    onChange={(e) => setAssignmentMode(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    <option value="round_robin">Round-Robin (Even Team Distribution)</option>
                    <option value="specific_user">Assign to Specific Counsellor</option>
                    <option value="unassigned">Unassigned (Team Pool)</option>
                  </select>
                </div>
              </div>

              {assignmentMode === 'specific_user' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Counsellor *</label>
                  <select
                    required
                    value={defaultUserId}
                    onChange={(e) => setDefaultUserId(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    <option value="">Select a counsellor</option>
                    {counsellors.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google Cloud Service Account JSON Key (Optional)
                </label>
                <textarea
                  rows={2}
                  value={serviceAccountKey}
                  onChange={(e) => setServiceAccountKey(e.target.value)}
                  placeholder="Paste Service Account JSON credentials for direct API access (or use Google Apps Script zero-credential mode)"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono resize-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 Don't have a Google Cloud account? Leave this blank and use the instant Apps Script Webhook snippet provided on the sheet card!
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Connect Sheet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google Apps Script Modal */}
      {scriptModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <Code2 className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold">1-Click Google Apps Script Webhook</h3>
                  <p className="text-[11px] text-slate-400">Zero credentials needed for instant 2-way sync</p>
                </div>
              </div>
              <button onClick={() => setScriptModalData(null)} className="p-1.5 text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5 text-slate-700 bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-100">
                <div className="font-bold text-indigo-950">How to activate in 30 seconds:</div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>Open your Google Sheet.</li>
                  <li>Click <strong>Extensions</strong> → <strong>Apps Script</strong>.</li>
                  <li>Delete any existing code and paste the script below.</li>
                  <li>Click <strong>Save</strong> and run the <code>setupTriggers</code> function once!</li>
                </ol>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800">Apps Script Code</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(scriptModalData.code);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCode ? 'Copied!' : 'Copy Script'}
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={9}
                  value={scriptModalData.code}
                  className="w-full p-3 font-mono text-[11px] bg-slate-950 text-emerald-400 rounded-xl resize-none focus:outline-none"
                />
              </div>

              <div className="text-right">
                <button
                  onClick={() => setScriptModalData(null)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-xl"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
