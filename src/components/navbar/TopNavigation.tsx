import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ArrowRight, Menu, X, LogIn, UserPlus } from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';
import { 
  triggerAnimeRipple, 
  animateHoverEnter, 
  animateHoverLeave, 
  animateIconBounce 
} from '../../utils/animeAnimations';

interface TopNavigationProps {
  onOpenAuth?: (mode: 'create' | 'login' | 'forgot' | 'verify') => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({ onOpenAuth }) => {
  const { currentView, setCurrentView, activeProfile, profiles, switchActiveProfile, setPublicViewingUsername, setPublicDemo, user, logOut } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMarketing = currentView === 'marketing';

  const handleOpenLiveDemo = (e: React.MouseEvent<HTMLButtonElement>) => {
    triggerAnimeRipple(e, e.currentTarget, 'rgba(100, 100, 100, 0.18)');
    setPublicViewingUsername(activeProfile.username);
    setPublicDemo(user.id === 'usr-guest');
    window.history.replaceState({}, '', user.id === 'usr-guest'
      ? `/@${encodeURIComponent(activeProfile.username)}?demo=1`
      : `/@${encodeURIComponent(activeProfile.username)}`);
    setCurrentView('public_standalone');
    setMobileMenuOpen(false);
  };

  const handleOpenStudio = (e: React.MouseEvent<HTMLButtonElement>) => {
    triggerAnimeRipple(e, e.currentTarget, 'rgba(0, 0, 0, 0.2)');
    const icon = e.currentTarget.querySelector<HTMLElement>('.nav-arrow-icon');
    if (icon) animateIconBounce(icon);
    setTimeout(() => {
      setCurrentView('editor');
      setMobileMenuOpen(false);
    }, 150);
  };

  const handleNavClick = (view: 'editor', e: React.MouseEvent<HTMLButtonElement>) => {
    triggerAnimeRipple(e, e.currentTarget, 'rgba(99, 102, 241, 0.25)');
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  const handleScrollToAnchor = (anchorId: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const scrollToAnchor = () => {
      const el = document.getElementById(anchorId);
      if (el) {
        // Measure only the fixed top bar. The mobile drawer lives inside the
        // header and may still be present during its exit transition.
        const headerHeight = document.querySelector('header > div')?.getBoundingClientRect().height || 0;
        const targetTop = window.scrollY + el.getBoundingClientRect().top - headerHeight - 12;
        const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
        window.scrollTo({ top: Math.max(0, targetTop), behavior });
        el.focus({ preventScroll: true });
      }
    };

    // Close the mobile drawer before measuring the target; otherwise removing
    // the drawer shifts the document after scrollIntoView has calculated its position.
    setMobileMenuOpen(false);
    if (currentView !== 'marketing') {
      setCurrentView('marketing');
      setTimeout(scrollToAnchor, 220);
    } else {
      // Allow the drawer's exit render to commit before measuring the sticky header.
      setTimeout(scrollToAnchor, 220);
    }
  };

  return (
    <header className={`sticky top-0 z-40 w-full ${isMarketing ? 'pointer-events-none bg-transparent px-3 pt-3 sm:px-5 sm:pt-4' : 'border-b border-line bg-canvas/90 backdrop-blur-md'}`}>
        <div className={`${isMarketing ? 'pointer-events-auto mx-auto max-w-6xl rounded-full border border-line/80 bg-canvas/95 shadow-md shadow-black/8 backdrop-blur-md' : 'max-w-7xl mx-auto'} min-w-0 px-3 sm:px-6 h-16 flex items-center justify-between gap-3`}>
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={(e) => {
            triggerAnimeRipple(e, e.currentTarget, 'rgba(100, 100, 100, 0.18)');
            setCurrentView('marketing');
          }}
          onMouseEnter={(e) => animateHoverEnter(e.currentTarget)}
          onMouseLeave={(e) => animateHoverLeave(e.currentTarget)}
          className="touch-target relative shrink-0 overflow-hidden px-2 py-1 rounded-lg text-lg font-bold tracking-tight text-ink font-display hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
        >
          LynkFlow
        </button>

        {/* Zone 2: Clean navigation links with anchor preservation */}
        <nav 
          aria-label="Main Navigation" 
            className="hidden md:flex min-w-0 flex-1 items-center justify-center gap-3 xl:gap-6 text-xs font-medium text-muted"
        >
          <a
            href="#overview"
            onClick={(e) => handleScrollToAnchor('overview', e)}
            className="transition-colors hover:text-ink cursor-pointer py-1 px-1.5 rounded focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none"
          >
            Overview
          </a>
          <a
            href="#features"
            onClick={(e) => handleScrollToAnchor('features', e)}
            className="transition-colors hover:text-ink cursor-pointer py-1 px-1.5 rounded focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none"
          >
            Features
          </a>
          <a
            href="#pricing"
            onClick={(e) => handleScrollToAnchor('pricing', e)}
            className="transition-colors hover:text-ink cursor-pointer py-1 px-1.5 rounded focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none"
          >
            Pricing
          </a>
          <a
            href="#faq"
            onClick={(e) => handleScrollToAnchor('faq', e)}
            className="transition-colors hover:text-ink cursor-pointer py-1 px-1.5 rounded focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none"
          >
            FAQ
          </a>
          <button
            onClick={(e) => handleNavClick('editor', e)}
            className={`transition-colors hover:text-ink cursor-pointer py-1 px-1.5 rounded focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none ${currentView === 'editor' ? 'text-ink font-semibold' : ''}`}
          >
            Studio Builder
          </button>
        </nav>

        {/* Zone 3: Primary Actions (MKT-001 & Flow 3) */}
        <div className="hidden sm:flex shrink-0 items-center gap-1.5 xl:gap-2.5">
          <ThemeToggle className="shrink-0" />
          {user.id !== 'usr-guest' ? (
            <div className="flex items-center gap-2">
              {!user.isVerified && (
                <button
                  onClick={() => onOpenAuth ? onOpenAuth('verify') : undefined}
                  className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-warning text-[10px] font-semibold flex items-center gap-1 hover:bg-amber-500/20 transition-colors cursor-pointer"
                  title="Click to enter verification token"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>Unverified</span>
                </button>
              )}

              {/* Profile Quick Switcher Dropdown */}
              {profiles.length > 1 && (
                <div className="relative">
                  <select
                    value={activeProfile.id}
                    onChange={(e) => switchActiveProfile(e.target.value)}
                    className="h-9 pl-2 pr-7 rounded-lg bg-surface border border-line text-xs font-mono text-ink appearance-none cursor-pointer focus:outline-none focus:border-indigo-500 shadow-xs"
                    title="Switch active profile"
                    aria-label="Switch active profile"
                  >
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>
                        @{p.username} {p.id === activeProfile.id ? '✓' : ''}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted">
                    ▾
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-surface border border-line text-xs shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" />
                <span className="font-semibold text-ink max-w-[120px] truncate">{user.name}</span>
              </div>
              <button
                onClick={logOut}
                className="h-9 px-2.5 rounded-lg text-xs font-medium text-muted hover:text-ink hover:bg-surface border border-transparent hover:border-line transition-colors cursor-pointer"
              >
                Log Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => onOpenAuth ? onOpenAuth('login') : setCurrentView('editor')}
              className="px-3 py-1.5 text-xs font-semibold text-body hover:text-ink transition-colors rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none"
            >
              Log In
            </button>
          )}

          <button
            onClick={handleOpenLiveDemo}
            onMouseEnter={(e) => animateHoverEnter(e.currentTarget)}
            onMouseLeave={(e) => animateHoverLeave(e.currentTarget)}
            aria-label="Open live demo profile"
            className="relative hidden lg:inline-flex h-9 overflow-hidden px-3 text-xs font-semibold text-body hover:text-ink transition-colors border border-line hover:border-line-strong bg-surface rounded-lg whitespace-nowrap items-center gap-1.5 cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none"
          >
            <span>Live demo</span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>

          <button
            onClick={(e) => {
              if (user.id === 'usr-guest') {
                if (onOpenAuth) onOpenAuth('create');
                else handleOpenStudio(e);
              } else {
                handleOpenStudio(e);
              }
            }}
            onMouseEnter={(e) => {
              animateHoverEnter(e.currentTarget);
              const icon = e.currentTarget.querySelector<HTMLElement>('.nav-arrow-icon');
              if (icon) animateIconBounce(icon);
            }}
            onMouseLeave={(e) => animateHoverLeave(e.currentTarget)}
            className="relative h-9 overflow-hidden px-3.5 text-xs font-bold text-inverse-text bg-inverse hover:bg-inverse-hover transition-colors rounded-lg whitespace-nowrap flex items-center gap-1.5 shadow-xs cursor-pointer group focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none"
          >
            <span>{user.id !== 'usr-guest' ? 'Open Studio' : 'Create your page'}</span>
            <ArrowRight className="nav-arrow-icon w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Mobile Hamburger Button (MKT-004: Accessible mobile navigation) */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          <button
            onClick={() => onOpenAuth ? onOpenAuth('create') : setCurrentView('editor')}
            className="touch-target px-3 py-1.5 text-xs font-bold text-inverse-text bg-inverse rounded-lg cursor-pointer"
          >
            Start Free
          </button>
          <button
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
            className="touch-target rounded-lg text-muted hover:text-ink hover:bg-surface border border-line transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer (Accessible at 320px & 200% text zoom) */}
      {mobileMenuOpen && (
        <div className={`pointer-events-auto md:hidden px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-150 shadow-lg shadow-black/10 ${isMarketing ? 'mx-3 mt-2 rounded-2xl border border-line bg-canvas/98 sm:mx-5' : 'border-t border-line bg-canvas/98'}`}>
          <div className="grid grid-cols-2 gap-2 pb-3 border-b border-line text-xs">
            <button
              onClick={() => {
                onOpenAuth ? onOpenAuth('create') : setCurrentView('editor');
                setMobileMenuOpen(false);
              }}
              className="touch-target py-2.5 px-3 rounded-xl bg-inverse text-inverse-text font-bold text-center flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create page</span>
            </button>
            <button
              onClick={() => {
                onOpenAuth ? onOpenAuth('login') : setCurrentView('editor');
                setMobileMenuOpen(false);
              }}
              className="touch-target py-2.5 px-3 rounded-xl bg-surface border border-line text-ink font-semibold text-center flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log in</span>
            </button>
          </div>

          <nav aria-label="Mobile Navigation" className="flex flex-col space-y-1 text-sm font-medium text-body">
            <a
              href="#overview"
              onClick={(e) => handleScrollToAnchor('overview', e)}
              className="touch-target w-full justify-start py-2 px-3 rounded-lg hover:bg-surface hover:text-ink transition-colors"
            >
              Overview
            </a>
            <a
              href="#features"
              onClick={(e) => handleScrollToAnchor('features', e)}
              className="touch-target w-full justify-start py-2 px-3 rounded-lg hover:bg-surface hover:text-ink transition-colors"
            >
              Features
            </a>
            <a
              href="#pricing"
              onClick={(e) => handleScrollToAnchor('pricing', e)}
              className="touch-target w-full justify-start py-2 px-3 rounded-lg hover:bg-surface hover:text-ink transition-colors"
            >
              Pricing
            </a>
            <a
              href="#faq"
              onClick={(e) => handleScrollToAnchor('faq', e)}
              className="touch-target w-full justify-start py-2 px-3 rounded-lg hover:bg-surface hover:text-ink transition-colors"
            >
              FAQ
            </a>
            <button
              onClick={(e) => handleNavClick('editor', e)}
              className="touch-target w-full justify-start py-2 px-3 rounded-lg text-left hover:bg-surface hover:text-ink transition-colors"
            >
              Studio Builder
            </button>
            <button
              onClick={handleOpenLiveDemo}
              className="touch-target w-full justify-between py-2 px-3 rounded-lg text-left text-accent hover:bg-surface transition-colors flex items-center"
            >
              <span>Explore Demo Profile</span>
              <span className="text-xs font-mono text-subtle">@{activeProfile.username}</span>
            </button>
          </nav>
        </div>
      )}
    </header>
  );
};
