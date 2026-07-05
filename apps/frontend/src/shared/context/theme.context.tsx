'use client';

import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useLocalStorage } from '@/shared/hooks/use-local-storage.hook';
import { getMessage } from '../i18n';

export type Theme = 'light' | 'dark';

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

type ThemeProviderProps = {
  children: React.ReactNode;
};

const THEME_STORAGE_KEY = 'taskboard-live:theme';
const DEFAULT_THEME: Theme = 'light';

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeClass(theme: Theme) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setStoredTheme] = useLocalStorage<Theme>(THEME_STORAGE_KEY, DEFAULT_THEME);

  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  const setTheme = useCallback(
    (nextTheme: Theme) => {
      setStoredTheme(nextTheme);
    },
    [setStoredTheme],
  );

  const toggleTheme = useCallback(() => {
    setStoredTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, [setStoredTheme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error(getMessage('THEME_CONTEXT_PROVIDER_REQUIRED'));
  }
  return context;
}

export const THEME_ANTI_FLASH_SCRIPT = `(function(){try{var stored=window.localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var theme=stored?JSON.parse(stored):${JSON.stringify(DEFAULT_THEME)};if(theme==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;
