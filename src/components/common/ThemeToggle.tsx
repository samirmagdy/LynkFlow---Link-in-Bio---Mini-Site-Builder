import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  /** Labels the control for assistive tech. Defaults to a "switch to X" phrasing. */
  label?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', label }) => {
  const { appearance, toggleAppearance } = useTheme();
  const nextAppearance = appearance === 'light' ? 'dark' : 'light';
  const accessibleLabel = label ?? `Switch to ${nextAppearance} theme`;

  return (
    <button
      type="button"
      onClick={toggleAppearance}
      title={accessibleLabel}
      aria-label={accessibleLabel}
      className={`touch-target rounded-lg border border-line text-muted hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${className}`}
    >
      {appearance === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
    </button>
  );
};
