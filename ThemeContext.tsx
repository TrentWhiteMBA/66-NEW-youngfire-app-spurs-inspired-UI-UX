import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  SanctuaryTheme,
  ThemePalette,
  THEMES,
  SANCTUARY_THEMES,
  getSavedTheme,
  applySanctuaryTheme,
  applyThemeToTouchpoint,
  generateThemedAppIconSvg
} from '../services/themeService';

interface ThemeContextValue {
  theme: SanctuaryTheme;
  themeId: string;
  setTheme: (themeIdOrObj: string | SanctuaryTheme) => void;
  themes: Record<string, SanctuaryTheme>;
  palettes: Record<string, ThemePalette>;
  getThemeIconUrl: (themeId: string) => string;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: getSavedTheme(),
  themeId: getSavedTheme().id,
  setTheme: () => {},
  themes: THEMES,
  palettes: SANCTUARY_THEMES,
  getThemeIconUrl: (id: string) => generateThemedAppIconSvg(id)
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<SanctuaryTheme>(() => getSavedTheme());

  useEffect(() => {
    applySanctuaryTheme(theme);
    applyThemeToTouchpoint(theme.id);
  }, [theme]);

  const setTheme = useCallback((themeIdOrObj: string | SanctuaryTheme) => {
    const resolved = applySanctuaryTheme(themeIdOrObj);
    applyThemeToTouchpoint(resolved.id);
    setThemeState(resolved);
    try {
      window.dispatchEvent(new CustomEvent('yf_theme_applied', { detail: { themeId: resolved.id } }));
    } catch {}
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeId: theme.id,
        setTheme,
        themes: THEMES,
        palettes: SANCTUARY_THEMES,
        getThemeIconUrl: (id: string) => generateThemedAppIconSvg(id)
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useSanctuaryTheme = () => useContext(ThemeContext);
