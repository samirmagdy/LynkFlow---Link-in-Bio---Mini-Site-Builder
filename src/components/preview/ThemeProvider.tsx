import React from 'react';
import { StandardTheme } from '../../types/themeSchema';
import { compileThemeToCssVariables } from '../../utils/themeEngine';

/** Shared theme boundary used by editor preview and public profile rendering. */
export const ThemeProvider: React.FC<{ theme: StandardTheme; children: React.ReactNode }> = ({ theme, children }) => {
  const variables = compileThemeToCssVariables(theme);
  return (
    <div className={`theme theme-${theme.id}`} style={variables as React.CSSProperties}>
      {children}
    </div>
  );
};
