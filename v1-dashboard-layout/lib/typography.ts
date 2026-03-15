// Typography System for Prodigy Pawns
// Designed for kids 5-15 years old
// Consistent scales across all components

export const typography = {
  // Headings - using Fredoka for playful, rounded feel
  h1: "text-3xl font-bold font-heading", // 30px - Page titles
  h2: "text-2xl font-bold font-heading", // 24px - Section titles
  h3: "text-xl font-semibold font-heading", // 20px - Card titles

  // Body text - using Nunito for readability
  bodyLarge: "text-lg font-normal font-sans", // 18px - Quest descriptions
  body: "text-base font-normal font-sans", // 16px - Most UI text
  bodySmall: "text-sm font-normal font-sans", // 14px - Helper text
  bodyTiny: "text-xs font-normal font-sans", // 12px - Badges, labels

  // Numbers and stats - prominent display
  heroNumber: "text-5xl font-bold font-heading", // 48px - Rating, big stats
  largeNumber: "text-3xl font-bold font-heading", // 30px - XP, streak
  mediumNumber: "text-2xl font-semibold font-heading", // 24px - Stars, counts

  // Buttons
  buttonLarge: "text-lg font-bold font-heading", // Primary CTAs
  buttonMedium: "text-base font-semibold font-heading", // Secondary buttons
  buttonSmall: "text-sm font-medium font-heading", // Small actions
}

// Color-safe typography combinations for kids
export const textColors = {
  primary: "text-amber-900", // Main text on light backgrounds
  secondary: "text-amber-700", // Secondary text
  accent: "text-orange-600", // Important highlights
  success: "text-emerald-600", // Completion, success
  warning: "text-amber-600", // Caution, warnings
  info: "text-blue-600", // Information
}

// Helper function to combine typography classes
export function getTypography(size: keyof typeof typography, color?: keyof typeof textColors): string {
  const typeClass = typography[size]
  const colorClass = color ? textColors[color] : textColors.primary
  return `${typeClass} ${colorClass}`
}
