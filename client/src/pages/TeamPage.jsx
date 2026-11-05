import React, { useState, useEffect } from 'react';
import {
  UserCog,
  Plus,
  ShieldCheck,
  User,
  Phone,
  Link2,
  Copy,
  Check,
  MessageSquare,
  RefreshCw,
  X,
  ExternalLink
} from 'lucide-react';
import api from '../services/api';

export default function TeamPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  // Add User Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('counsellor');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getFullInviteLink = (inviteToken) => {
    const origin = window.location.origin;
    return `${origin}/join/${inviteToken}`;
  };

  const handleCopyLink = (user) => {
    const link = getFullInviteLink(user.invite_token);
    navigator.clipboard.writeText(link);
    setCopiedId(user.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleShareWhatsAppLink = (user) => {
    const link = getFullInviteLink(user.invite_token);
    const text = encodeURIComponent(
      `Hello ${user.name}! 🌟\n\nHere is your unique 1-click personal login link to access your PW Global CRM lead pipeline:\n${link}\n\nClick this link to immediately open your workstation and start counseling your assigned students.`
    );
    const cleanPhone = (user.phone || '').replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${text}`;
    window.open(url, '_blank');
  };

  const handleRegenerateLink = async (userId, userName) => {
    if (!window.confirm(`Regenerate unique login link for ${userName}? Older links will stop working.`)) return;
    try {
      const res = await api.post(`/users/${userId}/regenerate-link`);
      alert(res.data.message);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to regenerate link');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await api.post('/users', {
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        role,
        phone: phone.trim()
      });

      setIsAddOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
      fetchUsers();
      alert(`Team member created! Their unique join link is: ${getFullInviteLink(res.data.user.invite_token)}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create team member');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCog className="w-5 h-5 text-indigo-600" />
            Team Management & Unique Counsellor Links
          </h1>
          <p className="text-xs text-slate-500">
            Share unique 1-click access links with counsellors so they can join directly on their individual system
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Team Member</span>
        </button>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 rounded-2xl border border-indigo-200 text-xs text-indigo-950 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">
            <Link2 className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold">Unique Personal Login Links</div>
            <div className="text-slate-600 text-[11px]">
              Every counsellor gets their own unique login URL. Simply click <strong>Share on WhatsApp</strong> or <strong>Copy Link</strong> to send it to them.
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading team...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Member Name & Role</th>
                  <th className="py-3 px-4">Login Email</th>
                  <th className="py-3 px-4">WhatsApp Phone</th>
                  <th className="py-3 px-4">Unique 1-Click Join Link</th>
                  <th className="py-3 px-4 text-center">Pipeline Leads</th>
                  <th className="py-3 px-4 text-center">PB Sessions</th>
                  <th className="py-3 px-4 text-center">Enrolled</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const uniqueLink = getFullInviteLink(u.invite_token);
                  const isCopied = copiedId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Role */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{u.name}</div>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                              u.role === 'admin'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}>
                              {u.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
                              {u.role}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {u.email}
                      </td>

                      {/* WhatsApp */}
                      <td className="py-3.5 px-4">
                        {u.phone ? (
                          <span className="font-bold text-emerald-700 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            {u.phone}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not set</span>
                        )}
                      </td>

                      {/* Unique Access Link Column */}
                      <td className="py-3.5 px-4 max-w-[240px]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] bg-slate-100 px-2 py-1 rounded-lg text-slate-700 truncate max-w-[150px] border border-slate-200 select-all">
                            {uniqueLink}
                          </span>
                          <button
                            onClick={() => handleCopyLink(u)}
                            className="p-1 text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors"
                            title="Copy Unique Join Link"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          {u.phone && (
                            <button
                              onClick={() => handleShareWhatsAppLink(u)}
                              className="p-1 text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-lg shadow-2xs transition-colors"
                              title="Share Unique Link on Counsellor's WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Leads Count */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {u.total_leads || 0}
                      </td>

                      {/* PB Sessions */}
                      <td className="py-3.5 px-4 text-center font-bold text-purple-700">
                        {u.demos_booked || 0}
                      </td>

                      {/* Enrolled */}
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-700">
                        {u.enrolled || 0}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleRegenerateLink(u.id, u.name)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Regenerate Access Link"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 bg-indigo-50 border-b border-indigo-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <UserCog className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-indigo-950">Add Team Member</h3>
                  <p className="text-xs text-indigo-700">Generates their unique 1-click personal login link</p>
                </div>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="p-1.5 text-indigo-600 hover:text-indigo-900 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {error && (
                <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Login Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rahul@crm.com"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="counsellor">Counsellor</option>
                    <option value="admin">Admin Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Phone *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="919876543210"
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-xs text-indigo-900">
                ⚡ A unique 1-click personal link will automatically be generated for this counsellor so you can share it directly via WhatsApp.
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
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create & Generate Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
