import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Appearance = 'dark' | 'light';

const STORAGE_KEY = 'lynkflow:appearance';
const SYSTEM_QUERY = '(prefers-color-scheme: light)';

interface ThemeContextValue {
  appearance: Appearance;
  setAppearance: (appearance: Appearance) => void;
  toggleAppearance: () => void;
  /** True while the visitor has not chosen an appearance and we follow the OS. */
  followsSystem: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const readStoredAppearance = (): Appearance | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    return null;
  }
};

const readSystemAppearance = (): Appearance =>
  typeof window !== 'undefined' && window.matchMedia(SYSTEM_QUERY).matches ? 'light' : 'dark';

const resolveInitialAppearance = (): Appearance => readStoredAppearance() ?? readSystemAppearance();

const applyAppearance = (appearance: Appearance) => {
  const root = document.documentElement;
  root.dataset.theme = appearance;
  // Keep UA-rendered surfaces (scrollbars, form controls, canvas) in sync.
  root.style.colorScheme = appearance;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appearance, setAppearanceState] = useState<Appearance>(resolveInitialAppearance);
  const [followsSystem, setFollowsSystem] = useState<boolean>(() => readStoredAppearance() === null);

  useEffect(() => {
    applyAppearance(appearance);
  }, [appearance]);

  // Follow OS changes until the visitor makes an explicit choice.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const query = window.matchMedia(SYSTEM_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setAppearanceState(readStoredAppearance() ?? (event.matches ? 'light' : 'dark'));
      setFollowsSystem(readStoredAppearance() === null);
    };
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  const setAppearance = useCallback((next: Appearance) => {
    setAppearanceState(next);
    setFollowsSystem(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode / blocked storage: the in-memory choice still applies.
    }
  }, []);

  const toggleAppearance = useCallback(() => {
    setAppearanceState(current => {
      const next: Appearance = current === 'light' ? 'dark' : 'light';
      setFollowsSystem(false);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Ignore storage failures, the theme still switches for this session.
      }
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ appearance, setAppearance, toggleAppearance, followsSystem }),
    [appearance, setAppearance, toggleAppearance, followsSystem]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside a ThemeProvider');
  return context;
};
