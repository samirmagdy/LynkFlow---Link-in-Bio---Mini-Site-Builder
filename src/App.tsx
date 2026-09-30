import React, { lazy, Suspense, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { TopNavigation } from './components/navbar/TopNavigation';
import { Toast } from './components/common/Toast';
import { DialogFocusManager } from './components/common/Dialog';
import { 
  ProfileNotFoundState, 
  ProfileUnpublishedState, 
  ProfileSuspendedState, 
  ProfileLoadingSkeleton 
} from './components/public/PublicProfileStates';
import { publicProfileService } from './services/publicProfileService';
import type { PublicProfileResolutionResult } from './services/publicProfileService';
import { contentLifecycleService } from './services/contentLifecycleService';
import { Profile } from './types';

const MarketingPage = lazy(() => import('./components/marketing/MarketingPage').then(module => ({ default: module.MarketingPage })));
const PublicProfileView = lazy(() => import('./components/preview/PublicProfileView').then(module => ({ default: module.PublicProfileView })));
const DashboardLayout = lazy(() => import('./components/editor/DashboardLayout').then(module => ({ default: module.DashboardLayout })));
const NewProfileModal = lazy(() => import('./components/modals/NewProfileModal').then(module => ({ default: module.NewProfileModal })));
const AbuseReportModal = lazy(() => import('./components/modals/AbuseReportModal').then(module => ({ default: module.AbuseReportModal })));
const AuthModal = lazy(() => import('./components/modals/AuthModal').then(module => ({ default: module.AuthModal })));
const OnboardingModal = lazy(() => import('./components/modals/OnboardingModal').then(module => ({ default: module.OnboardingModal })));
const ConflictResolutionModal = lazy(() => import('./components/modals/ConflictResolutionModal').then(module => ({ default: module.ConflictResolutionModal })));

const AppContent: React.FC = () => {
  const { 
    currentView, 
    user,
    authReady,
    publishedProfile, 
    activeProfile, 
    publicViewingUsername, 
    publicDemo,
    profiles, 
    toastMessage,
    isConflictOpen,
    resolveConflictReload,
    resolveConflictOverwrite,
    setCurrentView
  } = useApp();
  const [isNewProfileOpen, setIsNewProfileOpen] = useState(false);
  const [isAbuseReportOpen, setIsAbuseReportOpen] = useState(false);
  const [reportTargetUser, setReportTargetUser] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'create' | 'login' | 'forgot' | 'verify' | 'reset'>('create');
  const isStudioRoute = currentView !== 'marketing' && currentView !== 'public_standalone';

  React.useEffect(() => {
    // Wait for authReady before checking guest status.
    // Without this guard, the Guest placeholder (user.id === 'usr-guest') that
    // AppContext starts with on every refresh would trigger this effect and show
    // the login modal before the async Supabase session check can restore a
    // valid existing session — making the user log in on every refresh.
    if (!authReady) return;
    if (!isStudioRoute || user.id !== 'usr-guest') return;
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  }, [authReady, isStudioRoute, user.id]);

  React.useEffect(() => {
    if (new URLSearchParams(window.location.search).get('password-recovery') === '1') {
      setAuthModalMode('reset');
      setIsAuthModalOpen(true);
    }
  }, []);

  // Async public resolution state for standalone route
  const [resolutionResult, setResolutionResult] = useState<PublicProfileResolutionResult | null>(null);
  const [isResolvingPublic, setIsResolvingPublic] = useState(false);

  const customDomainParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('customDomain') || undefined : undefined;
  const targetHandle = publicViewingUsername || (customDomainParam ? '' : publishedProfile.username);

  // Check URL search params for previewToken or direct profile view
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const previewTokenParam = searchParams?.get('previewToken') || undefined;

  React.useEffect(() => {
    if (currentView === 'public_standalone') {
      setIsResolvingPublic(true);
      publicProfileService.resolvePublicProfile(targetHandle, previewTokenParam, customDomainParam, publicDemo)
        .then(result => {
          setResolutionResult(result);
          setIsResolvingPublic(false);
        })
        .catch(() => {
          setResolutionResult({
            status: 'not_found',
            username: targetHandle,
            resolvedAt: new Date().toISOString()
          });
          setIsResolvingPublic(false);
        });
    }
  }, [currentView, targetHandle, publishedProfile.publishedVersion, previewTokenParam, customDomainParam, publicDemo]);

  React.useEffect(() => {
    if (currentView !== 'public_standalone' || !resolutionResult?.snapshot) return;
    const snapshot = resolutionResult.snapshot;
    const title = snapshot.seo?.title || `${snapshot.displayName || snapshot.username} | LynkFlow`;
    const description = (snapshot.seo?.description || snapshot.bio || `Explore ${snapshot.displayName || snapshot.username} on LynkFlow.`).slice(0, 160);
    const canonical = `${window.location.origin}/@${encodeURIComponent(snapshot.username)}`;
    document.title = title;
    const setMeta = (selector: string, attribute: 'name' | 'property', content: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(selector);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, selector.includes('property=') ? selector.match(/property="([^"]+)"/)?.[1] || '' : selector.match(/name="([^"]+)"/)?.[1] || '');
        document.head.appendChild(element);
      }
      element.content = content;
    };
    setMeta('meta[name="description"]', 'name', description);
    setMeta('meta[name="robots"]', 'name', snapshot.seo?.noIndex ? 'noindex, nofollow' : 'index, follow');
    setMeta('meta[property="og:title"]', 'property', title);
    setMeta('meta[property="og:description"]', 'property', description);
    setMeta('meta[property="og:url"]', 'property', canonical);
    if (snapshot.seo?.ogImage || snapshot.avatarUrl) setMeta('meta[property="og:image"]', 'property', snapshot.seo?.ogImage || snapshot.avatarUrl);
    let canonicalElement = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalElement) { canonicalElement = document.createElement('link'); canonicalElement.rel = 'canonical'; document.head.appendChild(canonicalElement); }
    canonicalElement.href = canonical;
  }, [currentView, resolutionResult]);

  // Background cron-like runner for scheduled publishes
  React.useEffect(() => {
    if (currentView === 'marketing' || currentView === 'public_standalone') return;
    contentLifecycleService.executeDueScheduledPublishes();
    const interval = setInterval(() => {
      contentLifecycleService.executeDueScheduledPublishes();
    }, 15000);
    return () => clearInterval(interval);
  }, [currentView]);

  const handleOpenAuth = (mode: 'create' | 'login' | 'forgot' | 'verify' | 'reset' = 'create') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleOpenReport = (username?: string) => {
    setReportTargetUser(username || publishedProfile.username);
    setIsAbuseReportOpen(true);
  };

  // Standalone Public Profile (when visitor opens direct profile or creator clicks "Live View")
  if (currentView === 'public_standalone') {
    if (isResolvingPublic) {
      return <ProfileLoadingSkeleton />;
    }

    if (resolutionResult?.status === 'not_found') {
      return (
        <ProfileNotFoundState 
          username={targetHandle} 
          onGoHome={() => setCurrentView('marketing')} 
        />
      );
    }

    if (resolutionResult?.status === 'unpublished') {
      return (
        <ProfileUnpublishedState 
          username={targetHandle} 
          onGoHome={() => setCurrentView('marketing')} 
        />
      );
    }

    if (resolutionResult?.status === 'suspended') {
      return (
        <ProfileSuspendedState 
          username={targetHandle} 
          onGoHome={() => setCurrentView('marketing')} 
        />
      );
    }

    // Success: render strictly from the immutable published snapshot
    const profileToRender: Profile = resolutionResult?.snapshot 
      ? {
          id: resolutionResult.snapshot.profileId,
          username: resolutionResult.snapshot.username,
          displayName: resolutionResult.snapshot.displayName,
          bio: resolutionResult.snapshot.bio,
          avatarUrl: resolutionResult.snapshot.avatarUrl,
          category: resolutionResult.snapshot.category,
          verified: resolutionResult.snapshot.verified,
          status: 'published',
          publishedVersion: resolutionResult.snapshot.version,
          directLinkMode: false,
          socialPosition: resolutionResult.snapshot.socialPosition,
          socialLinks: resolutionResult.snapshot.socialLinks,
          theme: resolutionResult.snapshot.theme,
          standardTheme: resolutionResult.snapshot.standardTheme,
          tabs: resolutionResult.snapshot.tabs,
          customDomain: resolutionResult.snapshot.customDomain,
          qrConfig: resolutionResult.snapshot.qrConfig,
          seo: resolutionResult.snapshot.seo,
          createdAt: resolutionResult.snapshot.publishedAt,
          updatedAt: resolutionResult.snapshot.publishedAt
        }
      : publishedProfile;

    return (
      <div className="w-full min-h-screen bg-canvas">
        <Suspense fallback={<ProfileLoadingSkeleton />}>
          <PublicProfileView 
            profile={profileToRender} 
            isStandalone={true} 
            onOpenReportModal={() => handleOpenReport(profileToRender.username)}
          />
        </Suspense>
        <Suspense fallback={null}>
          <AbuseReportModal
            isOpen={isAbuseReportOpen}
            onClose={() => setIsAbuseReportOpen(false)}
            targetUsername={reportTargetUser || profileToRender.username}
          />
        </Suspense>
        <Toast message={toastMessage} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink selection:bg-indigo-500/30 selection:text-accent-soft">
      <TopNavigation onOpenAuth={handleOpenAuth} />

      <main className="flex-1 flex flex-col">
        {isStudioRoute && !authReady ? (
          <div className="flex min-h-[calc(100vh-64px)] flex-1 items-center justify-center bg-canvas px-6">
            <div className="w-full max-w-sm rounded-2xl border border-line bg-surface/70 p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-xl bg-accent/15" aria-hidden="true" />
              <p className="text-sm font-semibold text-ink">Loading your studio</p>
              <p className="mt-1 text-xs text-muted">Restoring your workspace and theme settings…</p>
            </div>
          </div>
        ) : currentView === 'marketing' ? (
        <Suspense fallback={<div className="min-h-screen bg-canvas" />}><MarketingPage onOpenAuth={handleOpenAuth} /></Suspense>
        ) : user.id === 'usr-guest' ? (
          <div className="flex min-h-[calc(100vh-64px)] flex-1 items-center justify-center bg-canvas px-6">
            <div className="w-full max-w-sm rounded-2xl border border-line bg-surface/70 p-6 text-center shadow-sm">
              <p className="text-sm font-semibold text-ink">Sign in to open Studio</p>
              <p className="mt-1 text-xs text-muted">Your studio route is ready. Sign in to continue.</p>
            </div>
          </div>
        ) : (
          <Suspense fallback={<div className="flex-1 min-h-screen bg-canvas" />}>
            <DashboardLayout
              onOpenReportModal={() => handleOpenReport()}
              onOpenNewProfileModal={() => setIsNewProfileOpen(true)}
            />
          </Suspense>
        )}
      </main>

      {/* Modals */}
      <Suspense fallback={null}>
        <AuthModal
          isOpen={isAuthModalOpen}
          initialMode={authModalMode}
          onClose={() => setIsAuthModalOpen(false)}
        />

        <OnboardingModal />

        <NewProfileModal
          isOpen={isNewProfileOpen}
          onClose={() => setIsNewProfileOpen(false)}
        />

        <AbuseReportModal
          isOpen={isAbuseReportOpen}
          onClose={() => setIsAbuseReportOpen(false)}
          targetUsername={reportTargetUser || publishedProfile.username}
        />

        {/* Optimistic Concurrency Conflict Modal (EDT-003) */}
        <ConflictResolutionModal
          isOpen={isConflictOpen}
          profileUsername={activeProfile.username}
          onReloadRemote={resolveConflictReload}
          onOverwriteWithLocal={resolveConflictOverwrite}
        />
      </Suspense>

      {/* Global Action Toasts */}
      <Toast message={toastMessage} />
    </div>
  );
};

export default function App() {
  const lightweight = typeof window !== 'undefined' && (window.location.pathname.startsWith('/@') || new URLSearchParams(window.location.search).get('view') === 'public_standalone');
  return (
    <ThemeProvider>
      <AppProvider lightweight={lightweight}>
        <DialogFocusManager />
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  );
}
