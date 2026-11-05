import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users2,
  CalendarCheck2,
  FileSpreadsheet,
  BarChart3,
  UserCog,
  Settings,
  Sparkles
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { isAdmin } = useAuth();

  const navItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      adminOnly: false
    },
    {
      to: '/leads',
      label: 'Leads Pipeline',
      icon: Users2,
      adminOnly: false
    },
    {
      to: '/demos',
      label: 'Demo Sessions',
      icon: CalendarCheck2,
      adminOnly: false
    },
    {
      to: '/sheets',
      label: 'Google Sheets',
      icon: FileSpreadsheet,
      adminOnly: true,
      badge: 'Multi-Sheet'
    },
    {
      to: '/team',
      label: 'Team Members',
      icon: UserCog,
      adminOnly: true
    },
    {
      to: '/analytics',
      label: 'Admin Analytics',
      icon: BarChart3,
      adminOnly: true
    }
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed lg:static top-0 bottom-0 left-0 z-20
        w-64 bg-white border-r border-slate-200 flex flex-col justify-between
        transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 space-y-6">
          {/* Workspace label */}
          <div className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Workspace</div>
              <div className="text-xs font-bold text-slate-800">PW Global Operations</div>
            </div>
            <Sparkles className="w-4 h-4 text-indigo-500" />
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              if (item.adminOnly && !isAdmin) return null;
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => onClose && onClose()}
                  className={({ isActive }) => `
                    flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${isActive 
                      ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Banner */}
        <div className="p-4 border-t border-slate-100">
          <div className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100/80 text-xs">
            <div className="font-semibold text-indigo-950 flex items-center gap-1.5 mb-1">
              <span>Google Sheets 2-Way Sync</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Updates made by counsellors in CRM automatically write back to linked Google Sheets.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
