/**
 * Theme Toggle Component
 *
 * A premium-feeling toggle switch for theme switching.
 * Features:
 * - Smooth icon transitions (sun/moon)
 * - Accessible keyboard navigation
 * - Visual feedback on hover/focus
 * - Supports light, dark, and system preferences
 */

import { useTheme } from '@/hooks/useTheme';
import { useEffect, useState } from 'react';

interface ThemeToggleProps {
  /** Show text label next to icon */
  showLabel?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

export default function ThemeToggle({
  showLabel = false,
  size = 'md',
  className = '',
}: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme, theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Size configurations
  const sizes = {
    sm: {
      button: 'h-7 w-7',
      icon: 'h-4 w-4',
      text: 'text-xs',
    },
    md: {
      button: 'h-8 w-8',
      icon: 'h-5 w-5',
      text: 'text-sm',
    },
    lg: {
      button: 'h-10 w-10',
      icon: 'h-6 w-6',
      text: 'text-base',
    },
  };

  const currentSize = sizes[size];

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div
        className={`${currentSize.button} rounded-lg bg-gray-100 ${className}`}
        aria-hidden="true"
      />
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`
        ${currentSize.button}
        ${className}
        relative inline-flex items-center justify-center
        rounded-lg border
        transition-all duration-200 ease-in-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        focus-visible:ring-blue-500
        hover:scale-105 active:scale-95
        ${isDark
          ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border-slate-600'
          : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-300'
        }
      `}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={`Current: ${theme === 'system' ? `System (${resolvedTheme})` : resolvedTheme} theme`}
    >
      {/* Sun icon (light mode) */}
      <svg
        className={`
          ${currentSize.icon}
          absolute
          transition-all duration-300 ease-in-out
          ${isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}
        `}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>

      {/* Moon icon (dark mode) */}
      <svg
        className={`
          ${currentSize.icon}
          absolute
          transition-all duration-300 ease-in-out
          ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}
        `}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>

      {/* Show label if requested */}
      {showLabel && (
        <span className={`ml-8 ${currentSize.text} font-medium`}>
          {isDark ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
}

/**
 * Theme Dropdown Selector
 * For more granular control including system preference
 */
export function ThemeSelector({ className = '' }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const options: { value: 'light' | 'dark' | 'system'; label: string; icon: JSX.Element }[] = [
    {
      value: 'light',
      label: 'Light',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ),
    },
    {
      value: 'system',
      label: 'System',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  const currentOption = options.find((o) => o.value === theme) || options[2];

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
          transition-all duration-200
          ${resolvedTheme === 'dark'
            ? 'bg-fintech-bg-tertiary hover:bg-fintech-bg-elevated text-fintech-text-primary'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }
        `}
      >
        {currentOption.icon}
        <span>{currentOption.label}</span>
        <svg
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className={`
            absolute right-0 mt-2 w-36 py-1 z-50 rounded-lg shadow-lg
            ${resolvedTheme === 'dark'
              ? 'bg-fintech-bg-secondary border border-fintech-border-default'
              : 'bg-white border border-gray-200'
            }
          `}>
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setTheme(option.value);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 text-sm
                  transition-colors duration-150
                  ${theme === option.value
                    ? resolvedTheme === 'dark'
                      ? 'bg-fintech-bg-tertiary text-fintech-accent-blue'
                      : 'bg-gray-100 text-blue-600'
                    : resolvedTheme === 'dark'
                      ? 'text-fintech-text-secondary hover:bg-fintech-bg-tertiary hover:text-fintech-text-primary'
                      : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                {option.icon}
                <span>{option.label}</span>
                {theme === option.value && (
                  <svg className="h-4 w-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
