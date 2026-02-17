/**
 * Prodigy Pawns Spacing System
 * Reference for consistent spacing across the application
 * Designed for kids aged 5-15
 */

export const spacing = {
  /* Base Spacing Scale */
  xs: '0.25rem',   /* 4px - tiny gaps, icon spacing */
  sm: '0.5rem',    /* 8px - small gaps, tight elements */
  md: '1rem',      /* 16px - default gap, comfortable spacing */
  lg: '1.5rem',    /* 24px - section spacing */
  xl: '2rem',      /* 32px - major section breaks */
  '2xl': '3rem',   /* 48px - page-level spacing */
  '3xl': '4rem',   /* 64px - hero sections */
} as const

/* Component Padding Presets */
export const padding = {
  /* Small cards (badges, labels) */
  cardSmall: 'p-2',
  /* Regular cards */
  card: 'p-4',
  /* Large cards */
  cardLarge: 'p-6',
  /* Hero cards */
  cardHero: 'p-8',
  
  /* Button sizes */
  buttonSmall: 'px-3 py-1.5',
  button: 'px-4 py-2',
  buttonLarge: 'px-6 py-3',
  buttonXL: 'px-8 py-4',
} as const

/* Gap Presets */
export const gaps = {
  /* Tight spacing for related items */
  tight: 'gap-xs',
  /* Small spacing */
  small: 'gap-sm',
  /* Default spacing between items */
  default: 'gap-md',
  /* Between cards in grid */
  grid: 'gap-4',
  /* Related items */
  related: 'gap-2',
  /* Form fields */
  form: 'space-y-4',
} as const

/* Margin Presets */
export const margins = {
  /* Between related items */
  small: 'mb-2',
  /* Between sections */
  section: 'mb-6',
  /* Major section breaks */
  major: 'mb-8',
} as const

/* Layout Widths */
export const layout = {
  /* Sidebar width (desktop) */
  sidebarWidth: '240px',
  /* Max content width */
  maxWidth: '1400px',
  /* Tight max width */
  maxWidthTight: '1200px',
  /* Right panel width */
  panelWidth: '320px',
} as const

/* Responsive helpers */
export const responsive = {
  /* Mobile-first spacing */
  spacing: 'gap-2 sm:gap-4 lg:gap-6',
  /* Mobile-first margins */
  margin: 'mb-4 sm:mb-6 lg:mb-8',
  /* Mobile-first padding */
  padding: 'p-3 sm:p-4 lg:p-6',
} as const

/**
 * Best Practices:
 * 1. Always use spacing scale (xs-3xl), never arbitrary values
 * 2. Use gap-* classes instead of mixing margins and padding
 * 3. Mobile-first: define mobile spacing first, then adjust for larger screens
 * 4. Use responsive prefixes: gap-2 sm:gap-4 lg:gap-6
 * 5. Between major sections: mb-8 or mb-2xl
 * 6. Group related items with smaller gaps: gap-2 or gap-sm
 * 7. Touch targets: at least 48px (3xl) tall for easy interaction
 */
