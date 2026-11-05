import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, Plus, User, LogOut, Phone, ShieldCheck, CheckCircle2, AlertTriangle, MessageSquare } from 'lucide-react';
import api from '../services/api';

export default function Navbar({ onOpenNewLead, onOpenProfile, onSelectFollowUpFilter }) {
  const { user, logout, isAdmin } = useAuth();
  const [counts, setCounts] = useState({ dueToday: 0, overdue: 0 });
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await api.get('/leads/pipeline-counts');
        setCounts({
          dueToday: res.data.dueToday || 0,
          overdue: res.data.overdue || 0
        });
      } catch (err) {
        // silent fail
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  const totalAlerts = counts.dueToday + counts.overdue;

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-600 text-white font-bold text-lg shadow-sm">
            PW
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">PW Global CRM</span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                Team Hub
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">Lead Pipeline & Demo Management</p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Add Lead */}
          <button
            onClick={onOpenNewLead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Lead</span>
          </button>

          {/* Follow-up Reminders Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Follow-up Reminders"
            >
              <Bell className="w-5 h-5" />
              {totalAlerts > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full ring-2 ring-white">
                  {totalAlerts}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div 
                className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 text-sm animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setShowNotifications(false)}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <span className="font-semibold text-slate-800">Follow-up Reminders</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                    {totalAlerts} pending
                  </span>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => onSelectFollowUpFilter && onSelectFollowUpFilter('today')}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-amber-50 hover:bg-amber-100/70 border border-amber-200 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <div>
                        <div className="font-medium text-amber-900 text-xs">Due Today</div>
                        <div className="text-[11px] text-amber-700">Follow-ups scheduled for today</div>
                      </div>
                    </div>
                    <span className="font-bold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded text-xs">
                      {counts.dueToday}
                    </span>
                  </button>

                  <button
                    onClick={() => onSelectFollowUpFilter && onSelectFollowUpFilter('overdue')}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-rose-50 hover:bg-rose-100/70 border border-rose-200 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <div>
                        <div className="font-medium text-rose-900 text-xs">Overdue</div>
                        <div className="text-[11px] text-rose-700">Requires urgent attention</div>
                      </div>
                    </div>
                    <span className="font-bold text-rose-800 bg-rose-200/60 px-2 py-0.5 rounded text-xs">
                      {counts.overdue}
                    </span>
                  </button>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 text-center">
                  <span className="text-[11px] text-slate-500">
                    💡 Click on any lead to send a WhatsApp reminder instantly
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-medium text-xs">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs font-semibold text-slate-800 leading-tight">{user?.name}</div>
                <div className="text-[10px] text-slate-500 capitalize flex items-center gap-1">
                  {isAdmin ? <ShieldCheck className="w-3 h-3 text-indigo-600" /> : <User className="w-3 h-3 text-slate-400" />}
                  {user?.role}
                </div>
              </div>
            </button>

            {showUserMenu && (
              <div 
                className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-sm"
                onClick={() => setShowUserMenu(false)}
              >
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <div className="font-semibold text-slate-800">{user?.name}</div>
                  <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                  {user?.phone && (
                    <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> WhatsApp: {user.phone}
                    </div>
                  )}
                </div>

                <button
                  onClick={onOpenProfile}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  Profile & WhatsApp Settings
                </button>

                <div className="border-t border-slate-100 my-1"></div>

                <button
                  onClick={logout}
                  className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
