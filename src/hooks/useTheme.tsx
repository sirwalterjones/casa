/**
 * Theme Provider & Hook
 *
 * Implements a robust theme system with:
 * - System preference detection (prefers-color-scheme)
 * - Manual theme toggle
 * - localStorage persistence
 * - Flash-free hydration (handles SSR)
 *
 * Design Decision: Using 'class' strategy with Tailwind's darkMode: 'class'
 * This allows scoped dark theme application and works well with CSS variables.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'casa-theme';

/**
 * Get the system's preferred color scheme
 */
function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Get the stored theme preference from localStorage
 */
function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch (e) {
    // localStorage might be unavailable in some contexts
    console.warn('Could not access localStorage for theme:', e);
  }
  return null;
}

/**
 * Apply theme class to document element
 */
function applyTheme(resolvedTheme: ResolvedTheme) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;

  // Remove any existing theme classes
  root.classList.remove('light', 'dark');

  // Add the new theme class
  root.classList.add(resolvedTheme);

  // Also update the color-scheme for native elements
  root.style.colorScheme = resolvedTheme;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system'
}: ThemeProviderProps) {
  // Initialize with stored preference or default
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = getStoredTheme();
    return stored ?? defaultTheme;
  });

  // Track the actual resolved theme (light or dark)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    if (theme === 'system') {
      return getSystemTheme();
    }
    return theme;
  });

  // Track if component has mounted (for hydration)
  const [mounted, setMounted] = useState(false);

  // Handle theme changes
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);

    // Persist to localStorage
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (e) {
      console.warn('Could not save theme to localStorage:', e);
    }
  }, []);

  // Toggle between light and dark (ignoring system)
  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
  }, [resolvedTheme, setTheme]);

  // Resolve the actual theme when theme preference changes
  useEffect(() => {
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const newResolvedTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(newResolvedTheme);
      applyTheme(newResolvedTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Mark as mounted after first render
  useEffect(() => {
    setMounted(true);
  }, []);

  // Apply theme on mount to handle SSR
  useEffect(() => {
    if (mounted) {
      applyTheme(resolvedTheme);
    }
  }, [mounted, resolvedTheme]);

  const value: ThemeContextType = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

/**
 * Script to inject in <head> to prevent flash of wrong theme
 * This runs before React hydration to set the correct theme immediately
 */
export const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var theme = stored || 'system';
    var resolved = theme;

    if (theme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.documentElement.classList.add(resolved);
    document.documentElement.style.colorScheme = resolved;
  } catch (e) {}
})();
`;

export default ThemeProvider;
