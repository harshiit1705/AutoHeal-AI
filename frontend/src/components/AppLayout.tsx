import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { fetchDashboardSummary } from '../api/client.js';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [awaitingCount, setAwaitingCount] = useState<number>(2);
  const [failingCount, setFailingCount] = useState<number>(3);
  const [environment, setEnvironment] = useState<'production' | 'staging'>('production');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDashboardSummary()
      .then((data) => {
        setAwaitingCount(data.awaiting_approval_count);
        setFailingCount(data.recent_incidents.filter(i => i.status !== 'verified_healed').length || 3);
      })
      .catch(() => {});
  }, [location.pathname]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/incidents?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navItems = [
    { to: '/', label: 'Overview', icon: 'dashboard', end: true },
    { to: '/workflow-monitor', label: 'Workflow Monitor', icon: 'hub' },
    { to: '/incidents', label: 'Incidents', icon: 'warning', badge: failingCount, badgeColor: 'bg-error-container text-on-error-container' },
    { to: '/recovery-center', label: 'Recovery Center', icon: 'restart_alt', badge: awaitingCount, badgeColor: 'bg-surface-container-high text-primary' },
    { to: '/recovery-approval', label: 'Recovery Approval', icon: 'gshield', pingDot: awaitingCount > 0 },
    { to: '/integrations', label: 'Integrations', icon: 'extension' },
    { to: '/audit-logs', label: 'Audit Logs', icon: 'description' },
  ];

  return (
    <div className="bg-surface text-on-surface font-body-md text-body-md antialiased min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-surface-container-lowest flex flex-col justify-between z-50 shadow-[0_1px_8px_rgba(0,0,0,0.25)] border-r border-[#24304a]/40">
        <div className="flex flex-col">
          {/* Logo & Header */}
          <div className="h-16 px-space-md flex items-center gap-space-sm bg-surface-container-low border-b border-[#24304a]/30">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.4)]">
              <span className="material-symbols-outlined text-[1.5rem] text-surface-container-lowest font-bold">autorenew</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight leading-none font-semibold">AutoHeal AI</span>
              <span className="font-label-xs text-label-xs text-primary font-semibold tracking-wider uppercase mt-0.5">Reliability Engine</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-space-xs p-space-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center justify-between px-space-md py-space-sm rounded-lg transition-all ${
                    isActive
                      ? 'bg-primary-container text-on-primary-container font-semibold shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`
                }
              >
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[1.25rem]">{item.icon}</span>
                  <span className="font-label-md text-label-md">{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full font-label-xs text-label-xs font-bold leading-none ${item.badgeColor || 'bg-surface-container-high text-primary'}`}>
                    {item.badge}
                  </span>
                )}
                {item.pingDot && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Tenant Workspace Selector */}
        <div className="p-space-sm bg-surface-container-lowest border-t border-[#24304a]/30">
          <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer border border-[#24304a]/40">
            <div className="flex items-center gap-space-sm min-w-0">
              <span className="h-2 w-2 rounded-full bg-tertiary shadow-[0_0_6px_#4edea3] flex-shrink-0"></span>
              <div className="min-w-0 flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface font-medium truncate">Acme Enterprise Ops</span>
                <span className="font-code-sm text-code-sm text-on-surface-variant truncate">US-East-1 · Live</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-[1.125rem] flex-shrink-0">unfold_more</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="pl-64">
        {/* Top Header */}
        <header className="fixed top-0 left-64 right-0 h-16 bg-surface-container-lowest/80 backdrop-blur-xl z-40 px-space-lg flex items-center justify-between gap-space-md shadow-[0_1px_8px_rgba(0,0,0,0.15)] border-b border-[#24304a]/40">
          <div className="flex items-center gap-space-md flex-1 max-w-2xl">
            <div className="relative w-full max-w-xl">
              <span className="material-symbols-outlined absolute left-space-sm top-1/2 -translate-y-1/2 text-on-surface-variant text-[1.25rem]">search</span>
              <input
                className="w-full pl-9 pr-14 py-space-xs bg-surface-container rounded-lg text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm outline-none focus:ring-1 focus:ring-primary border border-[#24304a]/50"
                placeholder="Search workflows, incidents (e.g. INC-2048), runs, error codes..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
              <div className="absolute right-space-sm top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-code-sm text-code-sm uppercase border border-white/5">
                ⌘K
              </div>
            </div>
          </div>

          <div className="flex items-center gap-space-md flex-shrink-0">
            {/* Environment Toggle */}
            <div className="flex items-center p-0.5 rounded-lg bg-surface-container-low border border-[#24304a]/40">
              <button
                type="button"
                onClick={() => setEnvironment('production')}
                className={`px-space-sm py-1 rounded font-label-xs text-label-xs font-semibold flex items-center gap-1.5 transition-all ${
                  environment === 'production'
                    ? 'bg-primary-container text-on-primary-container shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${environment === 'production' ? 'bg-on-primary-container' : 'bg-on-surface-variant'}`}></span>
                Production
              </button>
              <button
                type="button"
                onClick={() => setEnvironment('staging')}
                className={`px-space-sm py-1 rounded font-label-xs text-label-xs font-medium transition-all ${
                  environment === 'staging'
                    ? 'bg-primary-container text-on-primary-container shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Staging
              </button>
            </div>

            {/* Notifications Bell */}
            <button
              className="relative p-space-xs rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
              type="button"
              title="Recent Notifications"
              onClick={() => navigate('/incidents')}
            >
              <span className="material-symbols-outlined text-[1.375rem]">notifications</span>
              {failingCount > 0 && (
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-error"></span>
                </span>
              )}
            </button>

            {/* Profile Chip */}
            <div className="flex items-center gap-space-sm pl-space-xs border-l border-[#24304a]/50">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-secondary-container to-primary flex items-center justify-center ring-1 ring-primary/40 font-label-sm font-bold text-white shadow-sm">
                AC
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <div className="flex items-center gap-space-xs">
                  <span className="font-label-sm text-label-sm text-on-surface font-semibold leading-tight">Alex Chen</span>
                  <span className="px-1.5 py-0.2 rounded bg-surface-container-high text-primary font-code-sm text-code-sm font-semibold uppercase leading-none">Admin</span>
                </div>
                <span className="font-code-sm text-code-sm text-on-surface-variant leading-none">Staff Reliability Eng</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Routed Content */}
        <main className="relative pt-16 w-full min-h-screen bg-surface">
          {children}
        </main>
      </div>
    </div>
  );
};
