/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Enable class-based dark mode for theme switching
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Existing palettes
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        accent: {
          50: '#fef7ff',
          100: '#fdf4ff',
          200: '#fae8ff',
          300: '#f5d0fe',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        },
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        // Dark Fintech Theme Colors
        fintech: {
          // Deep charcoal backgrounds (not pure black)
          bg: {
            primary: '#0f1419',     // Main background
            secondary: '#1a1f2e',   // Card/elevated surfaces
            tertiary: '#242b3d',    // Hover states, inputs
            elevated: '#2d364a',    // Highly elevated elements
          },
          // Text colors with clear hierarchy
          text: {
            primary: '#f1f5f9',     // Primary text (high contrast)
            secondary: '#cbd5e1',   // Secondary/muted text (brighter for visibility)
            tertiary: '#94a3b8',    // Disabled/placeholder (was too dark)
            inverse: '#0f1419',     // Text on light backgrounds
          },
          // Accent colors for actions
          accent: {
            blue: '#3b82f6',        // Primary actions
            indigo: '#6366f1',      // Links, highlights
            cyan: '#22d3ee',        // Info states
          },
          // Semantic colors for financial data
          gain: '#10b981',          // Profit/positive (teal-green)
          loss: '#ef4444',          // Loss/negative (red-coral)
          warning: '#f59e0b',       // Warnings (amber)
          // Border and divider colors
          border: {
            subtle: '#1e293b',      // Subtle dividers
            default: '#334155',     // Default borders
            strong: '#475569',      // Strong borders
          },
          // Glow/shadow colors for premium feel
          glow: {
            blue: 'rgba(59, 130, 246, 0.15)',
            indigo: 'rgba(99, 102, 241, 0.15)',
            green: 'rgba(16, 185, 129, 0.15)',
          },
        },
        // Theme 1 Colors (Workspace aesthetic with purple accent)
        theme1: {
          bg: {
            primary: '#f8f8f8',
            secondary: '#ffffff',
            tertiary: '#f0f0f0',
            nav: '#3f0e40',
          },
          text: {
            primary: '#1d1c1d',
            secondary: '#616061',
            tertiary: '#868686',
          },
          accent: {
            primary: '#611f69',
            secondary: '#1264a3',
            purple: '#9b59b6',
            cyan: '#36c5f0',
            green: '#2eb67d',
            pink: '#e01e5a',
            yellow: '#ecb22e',
          },
          dark: {
            bg: {
              primary: '#1a1d21',
              secondary: '#222529',
              tertiary: '#2c2d31',
              nav: '#19171d',
            },
            text: {
              primary: '#d1d2d3',
              secondary: '#ababad',
            },
          },
        },
        // Theme 2 Colors (Project management aesthetic with blue accent)
        theme2: {
          bg: {
            primary: '#f6f7fb',
            secondary: '#ffffff',
            tertiary: '#edeef2',
            nav: '#292f4c',
          },
          text: {
            primary: '#323338',
            secondary: '#676879',
            tertiary: '#9699a6',
          },
          accent: {
            primary: '#0073ea',
            secondary: '#5034ff',
            green: '#00c875',
            red: '#e2445c',
            orange: '#fdab3d',
            purple: '#a25ddc',
            pink: '#ff158a',
            blue: '#579bfc',
          },
          dark: {
            bg: {
              primary: '#181b34',
              secondary: '#1c1f3a',
              tertiary: '#242847',
              nav: '#12142b',
            },
            text: {
              primary: '#f5f6f8',
              secondary: '#c5c7d0',
            },
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'fintech': '12px',          // Consistent rounded corners
      },
      boxShadow: {
        // Premium fintech shadows with subtle glow
        'fintech-sm': '0 2px 8px rgba(0, 0, 0, 0.3), 0 0 1px rgba(255, 255, 255, 0.05)',
        'fintech': '0 4px 16px rgba(0, 0, 0, 0.4), 0 0 1px rgba(255, 255, 255, 0.08)',
        'fintech-lg': '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 2px rgba(255, 255, 255, 0.1)',
        'fintech-glow-blue': '0 4px 20px rgba(59, 130, 246, 0.25), 0 0 40px rgba(59, 130, 246, 0.1)',
        'fintech-glow-green': '0 4px 20px rgba(16, 185, 129, 0.25), 0 0 40px rgba(16, 185, 129, 0.1)',
      },
      backgroundImage: {
        // Subtle gradients for cards and buttons
        'fintech-card': 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)',
        'fintech-button': 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
        'fintech-header': 'linear-gradient(90deg, #0f1419 0%, #1a1f2e 100%)',
      },
      transitionDuration: {
        '175': '175ms',
        '225': '225ms',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};