import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, Users, Sparkles, Database } from 'lucide-react';
import Papa from 'papaparse';
import api from '../services/api';

export default function BulkImportModal({ isOpen, onClose, onImportSuccess, counsellors = [] }) {
  const [file, setFile] = useState(null);
  const [pasteData, setPasteData] = useState('');
  const [mode, setMode] = useState('file'); // 'file' or 'paste'
  const [parsedRows, setParsedRows] = useState([]);
  const [assignmentMode, setAssignmentMode] = useState('round_robin');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [sourceName, setSourceName] = useState('Bulk Sheet Upload');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setError(null);
    setImportResult(null);

    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          setParsedRows(results.data);
        } else {
          setError('No valid rows detected in the uploaded file.');
        }
      },
      error: (err) => {
        setError('Failed to parse CSV: ' + err.message);
      }
    });
  };

  const handleParsePastedText = () => {
    if (!pasteData.trim()) {
      setError('Please paste your copied rows first.');
      return;
    }
    setError(null);
    setImportResult(null);

    Papa.parse(pasteData.trim(), {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          setParsedRows(results.data);
        } else {
          setError('Could not detect header or data rows. Ensure the first row has column titles (e.g. Name, Phone, School).');
        }
      },
      error: (err) => {
        setError('Failed to parse pasted data: ' + err.message);
      }
    });
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) {
      setError('No leads to import. Please upload a CSV or paste data.');
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const res = await api.post('/leads/bulk-import', {
        leads: parsedRows,
        assignment_mode: assignmentMode,
        assigned_user_id: assignedUserId ? parseInt(assignedUserId) : null,
        source_name: sourceName.trim() || 'Bulk Upload'
      });

      setImportResult(res.data);
      if (onImportSuccess) onImportSuccess();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPasteData('');
    setParsedRows([]);
    setImportResult(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-indigo-50/70 border-b border-indigo-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-indigo-950">High-Speed Leads Bulk Import</h3>
              <p className="text-xs text-indigo-700">Import multiple sheet tabs or CSV files with zero lag & auto-assignment</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-indigo-500 hover:text-indigo-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {importResult ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-emerald-950">Import Completed Successfully!</h4>
              <p className="text-xs text-emerald-800">{importResult.message}</p>
              <div className="grid grid-cols-2 gap-3 pt-2 max-w-xs mx-auto">
                <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-center">
                  <div className="text-lg font-black text-emerald-600">{importResult.imported}</div>
                  <div className="text-[11px] text-slate-500 font-semibold">New Leads Created</div>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-center">
                  <div className="text-lg font-black text-indigo-600">{importResult.updated}</div>
                  <div className="text-[11px] text-slate-500 font-semibold">Leads Updated</div>
                </div>
              </div>
              <div className="pt-3 flex justify-center gap-2">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
                >
                  Import Another Sheet
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                >
                  View in Pipeline
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Tab Selector: Upload File vs Paste Data */}
              <div className="flex border-b border-slate-200 pb-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode('file')}
                  className={`pb-1 text-xs font-bold border-b-2 transition-colors ${mode === 'file' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  Upload CSV / Sheet File
                </button>
                <button
                  type="button"
                  onClick={() => setMode('paste')}
                  className={`pb-1 text-xs font-bold border-b-2 transition-colors ${mode === 'paste' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  Paste from Google Sheets
                </button>
              </div>

              {mode === 'file' ? (
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-indigo-400 transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="bulk-file-upload"
                  />
                  <label htmlFor="bulk-file-upload" className="cursor-pointer block">
                    <FileText className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">
                      {file ? file.name : 'Click to select CSV file from your computer'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Supports exported sheets with Name, Phone, Alternative Number, Email, School, Stage columns
                    </p>
                  </label>
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    rows={5}
                    value={pasteData}
                    onChange={(e) => setPasteData(e.target.value)}
                    placeholder="Copy all cells from your Google Sheet (including the top header row) and paste here..."
                    className="w-full px-3.5 py-2.5 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleParsePastedText}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                  >
                    Parse Rows
                  </button>
                </div>
              )}

              {/* Assignment Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Sheet Tab / Campaign Source</label>
                  <input
                    type="text"
                    value={sourceName}
                    onChange={(e) => setSourceName(e.target.value)}
                    placeholder="e.g. Nov SAT Batch Sheet"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Team Distribution Rule</label>
                  <select
                    value={assignmentMode}
                    onChange={(e) => setAssignmentMode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="round_robin">🔄 Round-Robin (Distribute Evenly to Active Counsellors)</option>
                    <option value="specific_user">👤 Assign to Specific Counsellor</option>
                    <option value="unassigned">⏳ Leave Unassigned (Team Pool)</option>
                  </select>
                </div>

                {assignmentMode === 'specific_user' && (
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Select Counsellor *</label>
                    <select
                      value={assignedUserId}
                      onChange={(e) => setAssignedUserId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                    >
                      <option value="">Select a counsellor</option>
                      {counsellors.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Preview Rows Summary */}
              {parsedRows.length > 0 && (
                <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-indigo-950">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Detected {parsedRows.length} Rows Ready for Instant Import
                    </span>
                    <span className="text-[11px] px-2 py-0.5 bg-indigo-600 text-white rounded-md">
                      0ms Atomic Speed
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Sample Lead: <span className="font-semibold text-slate-800">{parsedRows[0].Name || parsedRows[0]['Student Name'] || parsedRows[0].name || 'Name Found'}</span> 
                    {' '}| Phone: <span className="font-semibold text-slate-800">{parsedRows[0].Phone || parsedRows[0]['Phone Number'] || parsedRows[0].phone || 'Phone Found'}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!importResult && (
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteImport}
              disabled={isImporting || parsedRows.length === 0}
              className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs flex items-center gap-2"
            >
              {isImporting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Import {parsedRows.length > 0 ? `${parsedRows.length} Leads Now` : 'Leads'}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
