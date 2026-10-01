import React, { lazy, Suspense } from 'react';
import { useApp } from '../../context/AppContext';
const EditorView = lazy(() => import('./EditorView').then(module => ({ default: module.EditorView })));
const ThemeStudio = lazy(() => import('../design/ThemeStudio').then(module => ({ default: module.ThemeStudio })));
const AnalyticsDashboard = lazy(() => import('../analytics/AnalyticsDashboard').then(module => ({ default: module.AnalyticsDashboard })));
const FormInboxView = lazy(() => import('../forms/FormInboxView').then(module => ({ default: module.FormInboxView })));
const SalesDashboard = lazy(() => import('../growth/SalesDashboard').then(module => ({ default: module.SalesDashboard })));
const SocialShareHub = lazy(() => import('../growth/SocialShareHub').then(module => ({ default: module.SocialShareHub })));
const QrCodeStudio = lazy(() => import('../growth/QrCodeStudio').then(module => ({ default: module.QrCodeStudio })));
const CustomDomainManager = lazy(() => import('../growth/CustomDomainManager').then(module => ({ default: module.CustomDomainManager })));
const MultiProfileManager = lazy(() => import('../growth/MultiProfileManager').then(module => ({ default: module.MultiProfileManager })));
const BillingSettings = lazy(() => import('../billing/BillingSettings').then(module => ({ default: module.BillingSettings })));
const ApiExplorer = lazy(() => import('../developer/ApiExplorer').then(module => ({ default: module.ApiExplorer })));
const SupportInbox = lazy(() => import('../support/SupportInbox').then(module => ({ default: module.SupportInbox })));
const AdminSafetyConsole = lazy(() => import('../admin/AdminSafetyConsole').then(module => ({ default: module.AdminSafetyConsole })));
import { 
  Sliders, 
  Palette, 
  BarChart2, 
  MailCheck, 
  QrCode, 
  Globe, 
  CreditCard, 
  ShoppingBag,
  Share2,
  Terminal, 
  Shield,
  LifeBuoy,
  ExternalLink,
  LogOut,
  Users,
  MoreHorizontal,
  X
} from 'lucide-react';

interface DashboardLayoutProps {
  onOpenReportModal: () => void;
  onOpenNewProfileModal: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  onOpenReportModal, 
  onOpenNewProfileModal 
}) => {
  const { currentView, setCurrentView, user, activeProfile, setPublicViewingUsername, setPublicDemo, resendVerificationEmail, logOut } = useApp();
  const [mobileMoreOpen, setMobileMoreOpen] = React.useState(false);

  const navItems = [
    { id: 'editor' as const, label: 'Page Builder', icon: <Sliders className="w-4 h-4" /> },
    { id: 'themes' as const, label: 'Themes & Styles', icon: <Palette className="w-4 h-4" /> },
    { id: 'analytics' as const, label: 'Analytics', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'forms' as const, label: 'Form Inbox', icon: <MailCheck className="w-4 h-4" /> },
    { id: 'sales' as const, label: 'Sales', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'social' as const, label: 'Share & Publish', icon: <Share2 className="w-4 h-4" /> },
    { id: 'growth' as const, label: 'Dynamic QR', icon: <QrCode className="w-4 h-4" /> },
    { id: 'profiles' as const, label: 'All Profiles', icon: <Users className="w-4 h-4" /> },
    { id: 'settings' as const, label: 'Custom Domain', icon: <Globe className="w-4 h-4" /> },
    { id: 'billing' as const, label: 'Plans & Billing', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'api' as const, label: 'API & Webhooks', icon: <Terminal className="w-4 h-4" /> },
    { id: 'support' as const, label: 'Support', icon: <LifeBuoy className="w-4 h-4" /> },
    { id: 'admin' as const, label: 'Trust & Safety', icon: <Shield className="w-4 h-4" /> },
  ];

  const mobilePrimaryItems = navItems.slice(0, 4);
  const mobileSecondaryItems = navItems.slice(4);
  const isSecondaryView = mobileSecondaryItems.some(item => item.id === currentView);

  const handleMobileNavigation = (view: typeof navItems[number]['id']) => {
    setCurrentView(view);
    setMobileMoreOpen(false);
  };

  const handleOpenLiveDemo = () => {
    setPublicViewingUsername(activeProfile.username);
    setPublicDemo(false);
    window.history.replaceState({}, '', `/@${encodeURIComponent(activeProfile.username)}`);
    setCurrentView('public_standalone');
  };

  return (
    <div className="studio-shell flex h-[calc(100vh-64px)] w-full overflow-hidden bg-canvas">
      {/* Left Navigation Sidebar */}
      <aside className="studio-sidebar w-56 shrink-0 border-r border-line bg-surface/40 backdrop-blur-md hidden md:flex flex-col justify-between p-3">
        <nav aria-label="Workspace navigation" className="space-y-1">
          <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-subtle">
            Workspace Hub
          </div>

          {navItems.map(item => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-surface-2 text-ink font-semibold shadow-xs'
                    : 'text-muted hover:text-ink-strong hover:bg-surface-3'
                }`}
              >
                <span className={isActive ? 'text-accent' : 'text-muted'}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Card & Back Action */}
        <div className="pt-3 border-t border-line space-y-2">
          {/* Unverified Email Alert Banner */}
          {!user.isVerified && user.id !== 'usr-guest' && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-warning text-[11px] space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-warning">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Email Unverified</span>
              </div>
              <p className="text-[10px] text-warning/80 leading-relaxed">
                Publishing is restricted until verified.
              </p>
              <button
                onClick={resendVerificationEmail}
                className="w-full py-1 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-warning text-[10px] font-medium transition-colors cursor-pointer text-center"
              >
                Resend verification email
              </button>
            </div>
          )}

          <button
            onClick={handleOpenLiveDemo}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-surface/90 border border-line hover:border-line-strong text-body hover:text-ink text-xs transition-colors cursor-pointer"
          >
            <span className="truncate font-mono text-[11px]">@{activeProfile.username}</span>
            <ExternalLink className="w-3.5 h-3.5 text-muted" />
          </button>

          <div className="px-3 py-2 rounded-xl bg-surface/60 border border-line/80 flex items-center justify-between text-muted text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/30 text-accent-soft font-semibold text-[11px] flex items-center justify-center shrink-0">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-ink truncate flex items-center gap-1.5">
                  <span>{user.name}</span>
                  {user.isVerified ? (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-success border border-emerald-500/30 font-mono">verified</span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-warning border border-amber-500/30 font-mono">unverified</span>
                  )}
                </div>
                <div className="text-[10px] text-subtle truncate">{user.email}</div>
              </div>
            </div>
            {user.id !== 'usr-guest' && (
              <button
                onClick={logOut}
                title="Log out"
                aria-label="Log out"
                className="p-1 rounded text-subtle hover:text-ink-strong hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Workspace Body */}
      <main className="studio-workspace min-w-0 flex-1 flex flex-col h-full overflow-hidden bg-canvas pb-24 md:pb-0">
        <Suspense fallback={<div className="flex h-full items-center justify-center text-xs text-subtle">Loading workspace…</div>}>
          {currentView === 'editor' && (
            <EditorView
              onOpenReportModal={onOpenReportModal}
              onOpenNewProfileModal={onOpenNewProfileModal}
            />
          )}
          {currentView === 'themes' && <ThemeStudio onOpenReportModal={onOpenReportModal} />}
          {currentView === 'analytics' && <AnalyticsDashboard />}
          {currentView === 'forms' && <FormInboxView />}
          {currentView === 'sales' && <SalesDashboard />}
          {currentView === 'social' && <SocialShareHub />}
          {currentView === 'growth' && <QrCodeStudio />}
          {currentView === 'profiles' && <MultiProfileManager />}
          {currentView === 'settings' && <CustomDomainManager />}
          {currentView === 'billing' && <BillingSettings />}
          {currentView === 'api' && <ApiExplorer />}
          {currentView === 'support' && <SupportInbox />}
          {currentView === 'admin' && <AdminSafetyConsole />}
        </Suspense>
      </main>

      {/* Mobile workspace tabs: compact app navigation with a safe-area-aware floating surface. */}
      <nav
        aria-label="Mobile workspace navigation"
        className="studio-mobile-nav fixed inset-x-3 bottom-3 z-50 md:hidden rounded-2xl border border-line-strong bg-surface/95 p-1.5 shadow-lg shadow-black/10 backdrop-blur-xl"
        style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}
      >
        <div className="grid grid-cols-5 gap-1">
          {mobilePrimaryItems.map(item => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleMobileNavigation(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  isActive
                    ? 'bg-accent/12 text-accent'
                    : 'text-muted hover:bg-surface-2 hover:text-ink'
                }`}
              >
                <span className={`flex h-5 w-5 items-center justify-center ${isActive ? 'text-accent' : 'text-subtle'}`} aria-hidden="true">
                  {item.icon}
                </span>
                <span className="truncate">{item.label === 'Page Builder' ? 'Builder' : item.label === 'Form Inbox' ? 'Inbox' : item.label.replace(' & Styles', '')}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileMoreOpen(prev => !prev)}
            aria-expanded={mobileMoreOpen}
            aria-haspopup="dialog"
            className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              mobileMoreOpen || isSecondaryView
                ? 'bg-accent/12 text-accent'
                : 'text-muted hover:bg-surface-2 hover:text-ink'
            }`}
          >
            <span className={`flex h-5 w-5 items-center justify-center ${mobileMoreOpen || isSecondaryView ? 'text-accent' : 'text-subtle'}`} aria-hidden="true">
              <MoreHorizontal className="h-5 w-5" />
            </span>
            <span>More</span>
          </button>
        </div>

        {mobileMoreOpen && (
          <div
            role="dialog"
            aria-label="More workspace destinations"
            className="absolute bottom-[calc(100%+0.75rem)] left-0 right-0 rounded-2xl border border-line-strong bg-surface/98 p-2 shadow-lg shadow-black/10 backdrop-blur-xl animate-in slide-in-from-bottom-2 duration-150"
          >
            <div className="mb-1 flex items-center justify-between px-2 py-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-subtle">Workspace</span>
              <button
                type="button"
                onClick={() => setMobileMoreOpen(false)}
                aria-label="Close more workspace destinations"
                className="rounded-lg p-1 text-subtle transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {mobileSecondaryItems.map(item => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleMobileNavigation(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex min-h-11 items-center gap-2 rounded-xl px-2.5 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      isActive
                        ? 'bg-accent/12 text-accent'
                        : 'text-muted hover:bg-surface-2 hover:text-ink'
                    }`}
                  >
                    <span className={isActive ? 'text-accent' : 'text-subtle'} aria-hidden="true">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>
    </div>
  );
};
