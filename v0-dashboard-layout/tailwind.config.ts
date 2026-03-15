import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    '*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-nunito)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-fredoka)', 'system-ui', 'sans-serif'],
      },
      spacing: {
        /* Prodigy Pawns Spacing Scale */
        'xs': '0.25rem',   /* 4px */
        'sm': '0.5rem',    /* 8px */
        'md': '1rem',      /* 16px */
        'lg': '1.5rem',    /* 24px */
        'xl': '2rem',      /* 32px */
        '2xl': '3rem',     /* 48px */
        '3xl': '4rem',     /* 64px */
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--primary))',
        /* Extended color palette */
        'green': {
          'dark': 'hsl(var(--green-dark))',
          'medium': 'hsl(var(--green-medium))',
          'light': 'hsl(var(--green-light))',
          'very-light': 'hsl(var(--green-very-light))',
        },
        'orange': {
          'dark': 'hsl(var(--orange-dark))',
          'medium': 'hsl(var(--orange-medium))',
          'light': 'hsl(var(--orange-light))',
          'very-light': 'hsl(var(--orange-very-light))',
        },
        'purple': {
          'dark': 'hsl(var(--purple-dark))',
          'medium': 'hsl(var(--purple-medium))',
          'light': 'hsl(var(--purple-light))',
        },
        'blue': {
          'dark': 'hsl(var(--blue-dark))',
          'medium': 'hsl(var(--blue-medium))',
          'light': 'hsl(var(--blue-light))',
        },
        'gray': {
          'dark': 'hsl(var(--gray-dark))',
          'medium': 'hsl(var(--gray-medium))',
          'light': 'hsl(var(--gray-light))',
          'very-light': 'hsl(var(--gray-very-light))',
        },
        'red': {
          'dark': 'hsl(var(--red-dark))',
          'medium': 'hsl(var(--red-medium))',
          'light': 'hsl(var(--red-light))',
        },
        'gold': {
          'dark': 'hsl(var(--gold-dark))',
          'medium': 'hsl(var(--gold-medium))',
          'light': 'hsl(var(--gold-light))',
        },
        /* Semantic colors */
        'completed': 'hsl(var(--completed-bg))',
        'active': 'hsl(var(--active-bg))',
        'locked': 'hsl(var(--locked-bg))',
        'premium': 'hsl(var(--premium-bg))',
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'flame-pulse': 'flame-pulse 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
