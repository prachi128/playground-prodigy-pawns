# Typography System for Prodigy Pawns

Designed for kids ages 5-15 years old. Uses playful, readable fonts with consistent sizing across all components.

## Font Families

- **Headings**: Fredoka (rounded, playful, kid-friendly)
- **Body Text**: Nunito (clean, highly readable, friendly)

## Heading Scale

### H1 (Page Titles)
- **Size**: `text-3xl` (30px)
- **Weight**: `font-bold`
- **Font**: `font-heading` (Fredoka)
- **Use**: Main page titles like "Adventure Map", "Hey Alex! Let's play!"
- **Example**: `<h1 className="text-3xl font-bold font-heading">Your Adventure</h1>`

### H2 (Section Titles)
- **Size**: `text-2xl` (24px)
- **Weight**: `font-bold`
- **Font**: `font-heading`
- **Use**: Section headers like "Your Adventure 🗺️", "Save the Queen!"
- **Example**: `<h2 className="text-2xl font-bold font-heading">Daily Challenge</h2>`

### H3 (Card Titles)
- **Size**: `text-xl` (20px)
- **Weight**: `font-semibold`
- **Font**: `font-heading`
- **Use**: Card titles, quest names
- **Example**: `<h3 className="text-xl font-semibold font-heading">Play vs Kid</h3>`

## Body Text Scale

### Large Body
- **Size**: `text-lg` (18px)
- **Weight**: `font-normal`
- **Font**: `font-sans` (Nunito)
- **Use**: Quest descriptions, important explanations
- **Example**: `<p className="text-lg font-sans">Challenge another kid in a real game!</p>`

### Regular Body (Default)
- **Size**: `text-base` (16px)
- **Weight**: `font-normal`
- **Font**: `font-sans`
- **Use**: Most UI text, button labels, navigation items
- **Example**: `<p className="text-base font-sans">Your rating is 1842</p>`

### Small Body
- **Size**: `text-sm` (14px)
- **Weight**: `font-normal`
- **Font**: `font-sans`
- **Use**: Helper text, timestamps, secondary information
- **Example**: `<span className="text-sm font-sans">Completed 2 hours ago</span>`

### Tiny Text
- **Size**: `text-xs` (12px)
- **Weight**: `font-normal`
- **Font**: `font-sans`
- **Use**: Badges, labels, small icons, metadata
- **Example**: `<span className="text-xs font-sans">640 / 1000 XP</span>`

## Numbers & Stats

### Hero Numbers
- **Size**: `text-5xl` (48px)
- **Weight**: `font-bold`
- **Font**: `font-heading`
- **Use**: Large stats like rating (1842), big achievements
- **Example**: `<span className="text-5xl font-bold font-heading">1842</span>`

### Large Numbers
- **Size**: `text-3xl` (30px)
- **Weight**: `font-bold`
- **Font**: `font-heading`
- **Use**: XP amounts, streak counts, achievement points
- **Example**: `<span className="text-3xl font-bold font-heading">640 XP</span>`

### Medium Numbers
- **Size**: `text-2xl` (24px)
- **Weight**: `font-semibold`
- **Font**: `font-heading`
- **Use**: Star counts, level numbers, trophy counts
- **Example**: `<span className="text-2xl font-semibold font-heading">42</span>`

## Button Text

### Primary/Large Buttons
- **Size**: `text-lg` (18px)
- **Weight**: `font-bold`
- **Font**: `font-heading`
- **Use**: Main CTAs like "PLAY NOW!", "Start Quest"
- **Example**: `<button className="text-lg font-bold font-heading">Start Quest</button>`

### Secondary/Medium Buttons
- **Size**: `text-base` (16px)
- **Weight**: `font-semibold`
- **Font**: `font-heading`
- **Use**: Secondary actions like "View Profile", "Learn More"
- **Example**: `<button className="text-base font-semibold font-heading">View Profile</button>`

### Small Buttons
- **Size**: `text-sm` (14px)
- **Weight**: `font-medium`
- **Font**: `font-heading`
- **Use**: Tertiary actions, badges with actions
- **Example**: `<button className="text-sm font-medium font-heading">Mark as Read</button>`

## Special Text Guidelines

### Inline Emojis
Add emojis inline with text to make content more engaging for kids:
- `⚡ 640 XP` - Energy for XP
- `🔥 7 days` - Fire for streaks
- `🏆 Level 12` - Trophy for achievements
- `🎯 Save the Queen!` - Target for quests

### Important CTAs
Use SPARINGLY in ALL CAPS for critical call-to-actions:
- `PLAY NOW!`
- `START QUEST`
- `COMPLETE CHALLENGE`

### Font Weight Consistency
- **Never use more than 2 font weights in one component**
- Typical combinations: `font-bold` + `font-normal` or `font-semibold` + `font-normal`
- Avoid: mixing `font-bold`, `font-semibold`, AND `font-medium` in the same component

## Color-Safe Pairings

### Primary Text (Main color)
- **Class**: `text-amber-900` or `text-foreground`
- **Use**: Body text on light backgrounds
- **Example**: Quest descriptions, regular UI text

### Secondary Text
- **Class**: `text-amber-700` or `text-muted-foreground`
- **Use**: Secondary information, timestamps
- **Example**: "Completed in 15 min ago"

### Accent Text
- **Class**: `text-orange-600`
- **Use**: Highlights, important information
- **Example**: "+120 XP", "Quest Active"

### Success Text
- **Class**: `text-emerald-600`
- **Use**: Completed tasks, positive feedback
- **Example**: "Quest Completed!", trophy labels

### Warning Text
- **Class**: `text-amber-600`
- **Use**: Caution, locked quests
- **Example**: "Unlock requirement: Level 5"

### Info Text
- **Class**: `text-blue-600`
- **Use**: Information, tips, hints
- **Example**: "Tip: Move your knight first"

## Application Examples

### Quest Card Title
```jsx
<h3 className="text-xl font-semibold font-heading text-amber-900">
  Save the Queen!
</h3>
```

### Hero Stat
```jsx
<div className="flex flex-col items-center">
  <span className="text-5xl font-bold font-heading text-amber-900">1842</span>
  <p className="text-sm font-sans text-amber-700">Your Rating</p>
</div>
```

### Button
```jsx
<button className="text-lg font-bold font-heading text-white bg-orange-500 px-6 py-3 rounded-lg">
  Start Quest
</button>
```

### Activity Item
```jsx
<div>
  <p className="text-base font-sans text-amber-900">You solved a puzzle</p>
  <span className="text-xs font-sans text-amber-700">2 hours ago</span>
</div>
```

## Accessibility Notes

- Font sizes are large enough for kids to read comfortably
- Using both fonts (Fredoka + Nunito) creates visual hierarchy
- High contrast colors ensure readability
- Emoji usage enhances engagement without compromising readability
- Never reduce font size below `text-xs` for main content

## Implementation

Always import typography utilities from `lib/typography.ts`:

```tsx
import { typography, getTypography } from '@/lib/typography'

// Use predefined classes
<h1 className={typography.h1}>Page Title</h1>

// Or combine with colors
<p className={getTypography('body', 'secondary')}>Secondary text</p>
```
