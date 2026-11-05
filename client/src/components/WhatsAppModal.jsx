import React, { useState, useEffect } from 'react';
import { MessageSquare, Phone, Send, ExternalLink, X, Check, Copy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function WhatsAppModal({ lead, isOpen, onClose, initialTarget = 'lead', initialType = null }) {
  if (!isOpen || !lead) return null;

  const { user } = useAuth();
  const [target, setTarget] = useState(initialTarget); // 'lead' or 'counsellor'
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTemplatesAndGenerate = async () => {
      setLoading(true);
      setError('');
      try {
        const tRes = await api.get('/whatsapp/templates');
        setTemplates(tRes.data.templates || []);

        let matchedTemplate = null;
        if (target === 'counsellor') {
          matchedTemplate = tRes.data.templates.find(t => t.type === 'counsellor_reminder');
        } else if (initialType) {
          matchedTemplate = tRes.data.templates.find(t => t.type === initialType);
        } else if (lead.stage === 'Demo Booked') {
          matchedTemplate = tRes.data.templates.find(t => t.type === 'demo_booked');
        } else {
          matchedTemplate = tRes.data.templates.find(t => t.type === 'follow_up');
        }

        const templateId = matchedTemplate ? matchedTemplate.id : (tRes.data.templates[0]?.id || '');
        setSelectedTemplateId(templateId);

        // Generate initial preview link and text
        const res = await api.post('/whatsapp/generate-link', {
          lead_id: lead.id,
          target: target,
          template_id: templateId
        });

        setMessageText(res.data.message);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to prepare WhatsApp message');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplatesAndGenerate();
  }, [lead.id, target]);

  const handleTemplateChange = async (templateId) => {
    setSelectedTemplateId(templateId);
    try {
      const res = await api.post('/whatsapp/generate-link', {
        lead_id: lead.id,
        target: target,
        template_id: templateId
      });
      setMessageText(res.data.message);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLaunchWhatsApp = async () => {
    try {
      const res = await api.post('/whatsapp/generate-link', {
        lead_id: lead.id,
        target: target,
        custom_message: messageText
      });

      // Open in new tab
      window.open(res.data.url, '_blank');
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to launch WhatsApp');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-50 border-b border-emerald-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-950">WhatsApp Dispatch & Reminder</h3>
              <p className="text-xs text-emerald-700">One-click personalized WhatsApp communication</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-emerald-600 hover:text-emerald-900 rounded-lg hover:bg-emerald-100/60">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
              {error}
            </div>
          )}

          {/* Target Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Recipient</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setTarget('lead')}
                className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-all ${
                  target === 'lead'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lead: {lead.name}
              </button>
              <button
                type="button"
                onClick={() => setTarget('counsellor')}
                className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-all ${
                  target === 'counsellor'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                My WhatsApp (Reminder)
              </button>
            </div>
          </div>

          {/* Recipient Details Card */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">Destination Number: </span>
              <span className="font-bold text-slate-800">
                {target === 'lead' ? lead.phone : (user?.phone || 'Not set in profile')}
              </span>
            </div>
            {target === 'counsellor' && !user?.phone && (
              <span className="text-[11px] text-rose-600 font-medium">Please add phone in profile!</span>
            )}
          </div>

          {/* Template selector if target is lead */}
          {target === 'lead' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Choose Message Template
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {templates.filter(t => t.type !== 'counsellor_reminder').map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Message Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Message Preview (Editable)
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <textarea
              rows={6}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-sans border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none bg-slate-50/50"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-500">
              ⚡ Opens WhatsApp Web / App directly
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800 font-medium"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleLaunchWhatsApp}
                disabled={loading || (target === 'counsellor' && !user?.phone)}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {target === 'counsellor' ? 'Send Reminder to My WhatsApp' : 'Open WhatsApp Chat'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
