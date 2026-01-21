import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Raycast-inspired dark theme
        background: {
          DEFAULT: '#0D0D0D',
          secondary: '#141414',
          tertiary: '#1A1A1A',
        },
        surface: {
          DEFAULT: '#1F1F1F',
          hover: '#262626',
          active: '#2D2D2D',
        },
        border: {
          DEFAULT: '#2D2D2D',
          focus: '#404040',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#A1A1A1',
          tertiary: '#6B6B6B',
        },
        accent: {
          purple: '#8B5CF6',
          blue: '#3B82F6',
          green: '#10B981',
          yellow: '#F59E0B',
          red: '#EF4444',
          pink: '#EC4899',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(139, 92, 246, 0.15)',
        'glow-sm': '0 0 10px rgba(139, 92, 246, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-4px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
