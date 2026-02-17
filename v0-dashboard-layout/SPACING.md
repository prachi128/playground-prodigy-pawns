# Prodigy Pawns Spacing System

A comprehensive spacing scale designed for consistent, readable layouts for kids aged 5-15.

## Spacing Scale

- **xs**: 4px (0.25rem) - Tiny gaps, icon spacing, minimal borders
- **sm**: 8px (0.5rem) - Small gaps, tight elements
- **md**: 16px (1rem) - Default gap, comfortable spacing
- **lg**: 24px (1.5rem) - Section spacing
- **xl**: 32px (2rem) - Major section breaks
- **2xl**: 48px (3rem) - Page-level spacing
- **3xl**: 64px (4rem) - Hero sections

## Component Padding

### Cards
- Small cards (badges, labels): `p-2` (8px)
- Regular cards: `p-4` (16px)
- Large cards: `p-6` (24px)
- Hero cards: `p-8` (32px)

### Buttons
- Small: `px-3 py-1.5` (12px/6px)
- Regular: `px-4 py-2` (16px/8px)
- Large: `px-6 py-3` (24px/12px)
- Extra large: `px-8 py-4` (32px/16px)

## Gaps & Margins

- Between cards in grid: `gap-4` (16px)
- Between sections: `mb-6` or `mb-8` (24px/32px)
- Between related items: `gap-2` (8px)
- Between form fields: `space-y-4` (16px)

## Grid System

### Layout Widths
- Sidebar: 240px fixed (desktop)
- Main content: flex-1
- Max width: 1400px (centered)

### Responsive Breakpoints
- Mobile: Single column
- Tablet: 6-column grid
- Desktop: 12-column grid

### Content Areas
- Page margins: `mx-auto max-w-7xl`
- Section spacing: `mb-8` between major sections
- Card spacing: Use `gap-4` on parent, not `mb` on individual cards

## Best Practices

1. **Use Spacing Scale** - Always use values from the scale (xs-3xl), never arbitrary values like `p-[17px]`
2. **Consistent Gaps** - Use `gap-*` classes instead of mixing margins and padding
3. **Mobile First** - Define mobile spacing first, then adjust for larger screens
4. **Responsive** - Use responsive prefixes: `gap-2 sm:gap-4 lg:gap-6`
5. **Section Breaks** - Use `mb-8` or `mb-2xl` between major content sections
6. **Related Items** - Group related items with smaller gaps (`gap-2` or `gap-sm`)
7. **Touch Targets** - Ensure buttons/interactive elements are at least 48px (3xl) tall for easy interaction

## Examples

### Card Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div className="p-4 bg-card rounded-lg">Content</div>
</div>
```

### Section Layout
```tsx
<section className="mx-auto max-w-7xl">
  <div className="mb-8">Section 1</div>
  <div className="mb-8">Section 2</div>
</section>
```

### Button Group
```tsx
<div className="flex gap-2">
  <button className="px-4 py-2">Action 1</button>
  <button className="px-4 py-2">Action 2</button>
</div>
```

