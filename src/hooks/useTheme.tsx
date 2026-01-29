/**
 * Theme Provider & Hook
 *
 * Implements a robust theme system with:
 * - System preference detection (prefers-color-scheme)
 * - Manual theme toggle
 * - Color theme variants (default, theme1, theme2)
 * - localStorage persistence
 * - Flash-free hydration (handles SSR)
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type DarkMode = 'light' | 'dark' | 'system';
type ResolvedDarkMode = 'light' | 'dark';
type ColorTheme = 'default' | 'theme1' | 'theme2';

interface ThemeContextType {
  // Dark mode
  theme: DarkMode;
  resolvedTheme: ResolvedDarkMode;
  setTheme: (theme: DarkMode) => void;
  toggleTheme: () => void;
  // Color theme
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DARK_MODE_STORAGE_KEY = 'casa-dark-mode';
const COLOR_THEME_STORAGE_KEY = 'casa-color-theme';

/**
 * Get the system's preferred color scheme
 */
function getSystemTheme(): ResolvedDarkMode {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Get the stored dark mode preference from localStorage
 */
function getStoredDarkMode(): DarkMode | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(DARK_MODE_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch (e) {
    console.warn('Could not access localStorage for theme:', e);
  }
  return null;
}

/**
 * Get the stored color theme preference from localStorage
 */
function getStoredColorTheme(): ColorTheme | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(COLOR_THEME_STORAGE_KEY);
    if (stored === 'default' || stored === 'theme1' || stored === 'theme2') {
      return stored;
    }
  } catch (e) {
    console.warn('Could not access localStorage for color theme:', e);
  }
  return null;
}

/**
 * Apply theme classes and data attributes to document element
 */
function applyTheme(resolvedDarkMode: ResolvedDarkMode, colorTheme: ColorTheme) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;

  // Remove any existing dark mode classes
  root.classList.remove('light', 'dark');

  // Add the dark mode class
  root.classList.add(resolvedDarkMode);

  // Set the data-theme attribute for color themes
  const themeValue = `${colorTheme}${resolvedDarkMode === 'dark' ? '-dark' : ''}`;
  root.setAttribute('data-theme', themeValue);

  // Also update the color-scheme for native elements
  root.style.colorScheme = resolvedDarkMode;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: DarkMode;
  defaultColorTheme?: ColorTheme;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  defaultColorTheme = 'default'
}: ThemeProviderProps) {
  // Initialize with stored preference or default
  const [theme, setThemeState] = useState<DarkMode>(() => {
    const stored = getStoredDarkMode();
    return stored ?? defaultTheme;
  });

  // Initialize color theme
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    const stored = getStoredColorTheme();
    return stored ?? defaultColorTheme;
  });

  // Track the actual resolved theme (light or dark)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedDarkMode>(() => {
    if (theme === 'system') {
      return getSystemTheme();
    }
    return theme;
  });

  // Track if component has mounted (for hydration)
  const [mounted, setMounted] = useState(false);

  // Handle dark mode changes
  const setTheme = useCallback((newTheme: DarkMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(DARK_MODE_STORAGE_KEY, newTheme);
    } catch (e) {
      console.warn('Could not save theme to localStorage:', e);
    }
  }, []);

  // Handle color theme changes
  const setColorTheme = useCallback((newColorTheme: ColorTheme) => {
    setColorThemeState(newColorTheme);
    try {
      localStorage.setItem(COLOR_THEME_STORAGE_KEY, newColorTheme);
    } catch (e) {
      console.warn('Could not save color theme to localStorage:', e);
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
  }, [theme]);

  // Apply theme whenever resolved theme or color theme changes
  useEffect(() => {
    if (mounted) {
      applyTheme(resolvedTheme, colorTheme);
    }
  }, [mounted, resolvedTheme, colorTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const newResolvedTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(newResolvedTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Mark as mounted and apply theme immediately
  useEffect(() => {
    setMounted(true);
    // Apply theme immediately on mount
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    applyTheme(resolved, colorTheme);
  }, []);

  const value: ThemeContextType = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    colorTheme,
    setColorTheme,
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
    var darkMode = localStorage.getItem('${DARK_MODE_STORAGE_KEY}') || 'system';
    var colorTheme = localStorage.getItem('${COLOR_THEME_STORAGE_KEY}') || 'default';
    var resolved = darkMode;

    if (darkMode === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.documentElement.classList.add(resolved);
    document.documentElement.style.colorScheme = resolved;
    document.documentElement.setAttribute('data-theme', colorTheme + (resolved === 'dark' ? '-dark' : ''));
  } catch (e) {}
})();
`;

export default ThemeProvider;
