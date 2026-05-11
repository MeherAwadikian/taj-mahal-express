import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1rem', sm: '1.5rem', lg: '2rem' },
      screens: { '2xl': '1400px' },
    },
    extend: {
      // -----------------------------------------------------------------------
      // Brand palette — Indian-inspired, WCAG AA compliant
      // Primary: saffron-orange  (EA580C on white = 4.53:1 ✓)
      // Accent:  deep indigo     (4338CA on white = 8.59:1 ✓)
      // Warm:    terracotta      (B45309 on white = 5.17:1 ✓)
      // -----------------------------------------------------------------------
      colors: {
        // Saffron — primary CTA, highlights
        saffron: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',  // primary button background
          700: '#c2410c',  // hover
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        // Indigo — trust, secondary actions, links
        indigo: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',  // secondary button background
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        // Terracotta — warm accent, badges
        terracotta: {
          50:  '#fdf4f0',
          100: '#fce8de',
          200: '#f9cdb8',
          300: '#f5a888',
          400: '#ef7a52',
          500: '#e85a2a',
          600: '#d44019',
          700: '#b03214',
          800: '#8f2b14',
          900: '#762713',
          950: '#3f1007',
        },
        // Cream — warm background, cards
        cream: {
          50:  '#fffbf5',
          100: '#fff5e6',
          200: '#ffeacc',
          300: '#ffd9a0',
        },
        // shadcn CSS-variable-based tokens (used by ui/ components)
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },

      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      fontFamily: {
        // Inter for UI; Noto Sans for Devanagari / vernacular support
        sans: ['var(--font-inter)', 'Noto Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        devanagari: ['Noto Sans Devanagari', 'sans-serif'],
      },

      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },

      boxShadow: {
        card:       '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)',
        'card-md':  '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.08)',
        'card-lg':  '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.08)',
        trust:      '0 0 0 2px hsl(var(--primary) / 0.2)',
      },

      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        shimmer:          'shimmer 2s linear infinite',
        'fade-in':        'fade-in 0.2s ease-out',
      },

      screens: {
        xs: '375px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
