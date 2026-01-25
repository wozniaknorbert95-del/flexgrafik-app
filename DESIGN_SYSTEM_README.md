# 🎨 FlexGrafik ADHD OS - Design System

## Overview

A comprehensive design system built for the FlexGrafik ADHD OS, featuring:

- **Cyberpunk-inspired aesthetic** with electric colors and glassmorphism
- **8px grid-based spacing** for consistent layouts
- **Type scale hierarchy** with proper accessibility ratios
- **Component tokens** for buttons, forms, cards, and more
- **Responsive design** with mobile-first approach
- **Accessibility features** including high contrast and reduced motion support

## Architecture

```
src/styles/
├── design-system.css      # Main entry point
├── tokens/
│   ├── colors.css        # Color palette & semantic colors
│   ├── typography.css    # Font scales & text styles
│   ├── spacing.css       # Spacing grid & layout tokens
│   └── shadows.css       # Elevation & glow effects
├── components/
│   ├── buttons.css       # Button variants & states
│   ├── forms.css         # Form elements & validation
│   └── cards.css         # Card layouts & effects
└── utilities/
    ├── layout.css        # Flexbox, grid, positioning
    └── responsive.css    # Breakpoints & responsive helpers
```

## Color System

### Primary Colors - Electric Cyan

```css
--color-primary-50: #ecfeff; /* Lightest */
--color-primary-500: #06b6d4; /* Main */
--color-primary-950: #083344; /* Darkest */
```

### Semantic Colors

```css
--color-success-500: #22c55e; /* Electric Green */
--color-warning-500: #f97316; /* Electric Orange */
--color-error-500: #ef4444; /* Electric Red */
--color-info-500: #6366f1; /* Electric Indigo */
```

### Usage Examples

```tsx
// CSS custom properties
.primary-button {
  background: var(--color-primary-500);
  color: var(--color-white);
}

// Tailwind classes
<button className="bg-primary-500 text-white hover:bg-primary-400">
  Primary Button
</button>

// Semantic colors
<div className="bg-success-500 text-white">Success Message</div>
```

## Typography System

### Font Scales

```css
--font-size-xs: 0.75rem; /* 12px */
--font-size-sm: 0.875rem; /* 14px */
--font-size-base: 1rem; /* 16px */
--font-size-lg: 1.125rem; /* 18px */
--font-size-xl: 1.25rem; /* 20px */
--font-size-2xl: 1.5rem; /* 24px */
--font-size-3xl: 1.875rem; /* 30px */
```

### Text Styles

```css
--text-display-font-size: var(--font-size-5xl);
--text-headline-font-size: var(--font-size-4xl);
--text-title-font-size: var(--font-size-3xl);
--text-body-font-size: var(--font-size-base);
```

### Usage Examples

```tsx
// CSS classes
<h1 className="text-display">Display Heading</h1>
<h2 className="text-headline">Headline</h2>
<p className="text-body">Body text</p>

// Tailwind utilities
<h1 className="text-5xl font-bold">Custom Heading</h1>
<p className="text-base leading-relaxed">Body text</p>
```

## Spacing System

### 8px Grid Scale

```css
--space-1: 0.25rem; /* 4px */
--space-2: 0.5rem; /* 8px */
--space-3: 0.75rem; /* 12px */
--space-4: 1rem; /* 16px */
--space-6: 1.5rem; /* 24px */
--space-8: 2rem; /* 32px */
--space-12: 3rem; /* 48px */
```

### Component Spacing

```css
--space-component-padding-md: var(--space-4); /* 16px */
--space-layout-gap-md: var(--space-6); /* 24px */
--space-element-gap-sm: var(--space-2); /* 8px */
```

### Usage Examples

```tsx
// Padding utilities
<div className="p-md">16px padding</div>
<div className="px-lg py-sm">Horizontal 24px, vertical 8px</div>

// Margins
<div className="mb-lg">48px bottom margin</div>

// Gaps
<div className="flex gap-md">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

## Component Tokens

### Buttons

```tsx
// Primary button
<button className="btn btn-primary btn-md">Primary Action</button>

// Ghost button
<button className="btn btn-ghost btn-secondary">Secondary Action</button>

// Loading state
<button className="btn btn-primary btn-loading" disabled>
  Saving...
</button>

// Button group
<div className="btn-group">
  <button className="btn btn-primary">Left</button>
  <button className="btn btn-primary">Middle</button>
  <button className="btn btn-primary">Right</button>
</div>
```

### Forms

```tsx
// Basic form field
<div className="field">
  <label className="label" htmlFor="email">Email Address</label>
  <input className="input input-md" id="email" type="email" />

  {/* Help text */}
  <div className="help-text">We'll never share your email.</div>
</div>

// Form with validation
<div className="field">
  <label className="label" htmlFor="password">Password</label>
  <input className="input input-md input-error" id="password" type="password" />
  <div className="error-message">Password is required</div>
</div>

// Horizontal form
<div className="form-field field-horizontal">
  <label className="label">Name</label>
  <input className="input input-md" />
</div>

// Checkboxes and radios
<label className="checkbox">
  <input type="checkbox" />
  <span>Remember me</span>
</label>
```

### Cards

```tsx
// Basic card
<div className="card card-md">
  <h3 className="card-title">Card Title</h3>
  <p className="card-subtitle">Card subtitle</p>
  <div className="card-content">
    <p>Card content goes here.</p>
  </div>
  <div className="card-actions">
    <button className="btn btn-secondary">Cancel</button>
    <button className="btn btn-primary">Action</button>
  </div>
</div>

// Glass card with glow
<div className="glass-card card-lg">
  <div className="card-content">
    <p>Glass morphism effect with backdrop blur.</p>
  </div>
</div>

// Horizontal card
<div className="card card-horizontal">
  <img className="card-media" src="..." alt="..." />
  <div className="card-content">
    <h3 className="card-title">Title</h3>
    <p>Content</p>
  </div>
</div>
```

## Layout Utilities

### Containers

```tsx
// Responsive containers
<div className="container container-lg">Content</div>
<div className="container-responsive">Adapts to screen size</div>
```

### Flexbox

```tsx
// Basic flex
<div className="flex items-center justify-between">
  <div>Left</div>
  <div>Right</div>
</div>

// Responsive flex
<div className="flex flex-col-mobile">
  <div>Stacks on mobile, row on larger screens</div>
  <div>Second item</div>
</div>
```

### Grid

```tsx
// Basic grid
<div className="grid grid-cols-3 gap-md">
  <div>Column 1</div>
  <div>Column 2</div>
  <div>Column 3</div>
</div>

// Responsive grid
<div className="grid-responsive-3">
  <div className="card">Card 1</div>
  <div className="card">Card 2</div>
  <div className="card">Card 3</div>
</div>
```

## Shadow System

### Elevation Levels

```css
--shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* Subtle */
--shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1); /* Card */
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1); /* Modal */
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1); /* Large */
```

### Cyberpunk Glows

```css
--shadow-glow-primary-sm: 0 0 8px rgba(6, 182, 212, 0.4);
--shadow-glow-secondary-sm: 0 0 8px rgba(217, 70, 239, 0.4);
```

### Usage Examples

```tsx
// Elevation shadows
<div className="shadow-elevation-md">Elevated content</div>

// Glow effects
<button className="shadow-glow-primary-sm">Glowing button</button>

// Special effects
<div className="shadow-cyber-card">Cyberpunk card</div>
<div className="shadow-glass">Glass morphism</div>

// Animated shadows
<div className="shadow-glow-breath-primary">Breathing glow</div>
<button className="shadow-lift">Lift on hover</button>
```

## Responsive Design

### Breakpoints

```css
--breakpoint-sm: 640px; /* Small devices */
--breakpoint-md: 768px; /* Medium devices */
--breakpoint-lg: 1024px; /* Large devices */
--breakpoint-xl: 1280px; /* Extra large */
```

### Responsive Utilities

```tsx
// Show/hide elements
<div className="sm-hide md-show">Visible on medium+ screens</div>

// Responsive text
<h1 className="text-responsive-lg">Scales with screen size</h1>

// Responsive spacing
<div className="grid space-responsive-md">
  <div>Responsive gaps</div>
</div>

// Touch-friendly
<button className="touch-target-responsive">Larger on touch devices</button>
```

## Animation System

### Duration Tokens

```css
--button-transition-fast: 0.15s ease-out;
--button-transition-normal: 0.2s ease-out;
--button-transition-slow: 0.3s ease-out;
```

### Keyframe Animations

```css
@keyframes fade-in {
  /* ... */
}
@keyframes slide-up {
  /* ... */
}
@keyframes scale-in {
  /* ... */
}
@keyframes glow-breath-primary {
  /* ... */
}
```

### Usage Examples

```tsx
// Utility classes
<div className="animate-fade-in">Fades in</div>
<div className="animate-slide-up">Slides up</div>

// Custom animations
<div className="shadow-glow-breath-primary">Breathing glow</div>
```

## Accessibility Features

### High Contrast Support

```css
@media (prefers-contrast: high) {
  :root {
    --color-border-light: rgba(255, 255, 255, 0.4);
    --font-weight-normal: 500;
  }
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .shadow-glow-breath-primary {
    animation: none;
  }
}
```

### Focus Management

```css
.btn:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
```

## Tailwind Integration

### Custom Configuration

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--color-primary-50)',
          500: 'var(--color-primary-500)',
          // ... more colors
        },
      },
      spacing: {
        xs: 'var(--space-2)',
        sm: 'var(--space-3)',
        // ... more spacing
      },
    },
  },
};
```

### Utility Classes

```tsx
// Use design tokens in Tailwind
<div className="bg-primary-500 text-white p-md rounded-lg shadow-elevation-md">
  Styled with design system
</div>
```

## Development Workflow

### Adding New Components

1. **Define tokens** in appropriate CSS file
2. **Create component styles** using tokens
3. **Add to Tailwind config** if needed
4. **Update safelist** for purging
5. **Document usage** in this README

### Modifying Colors

1. **Update color tokens** in `colors.css`
2. **Update Tailwind config** to match
3. **Test contrast ratios** for accessibility
4. **Update semantic mappings** if needed

### Testing Changes

```bash
# Build and check for errors
npm run build

# Test responsive design
# Resize browser and check breakpoints

# Test accessibility
# Use screen reader and keyboard navigation
```

## Performance Considerations

### CSS Optimization

- **CSS custom properties** for theme switching
- **Minimal CSS** with utility-first approach
- **Purged unused styles** in production

### Bundle Size

- **Modular imports** - only import what you need
- **Tree shaking** removes unused code
- **Lazy loading** for large components

## Browser Support

- **Chrome 90+**
- **Firefox 88+**
- **Safari 14+**
- **Edge 90+**

Modern browsers with CSS custom properties support.

## Future Enhancements

### Planned Features

- [ ] **Dark mode** toggle with CSS custom properties
- [ ] **Theme variants** (high contrast, color blind friendly)
- [ ] **Component library** with Storybook documentation
- [ ] **Design tokens** as JSON for cross-platform use
- [ ] **Animation presets** for common interactions

### Maintenance

- **Regular audits** of color contrast ratios
- **Performance monitoring** of CSS bundle size
- **User feedback** integration for UX improvements
- **Cross-browser testing** for compatibility

---

## Quick Reference

### Colors

- **Primary**: Electric cyan for main actions
- **Secondary**: Electric magenta for secondary actions
- **Success/Error**: Green/red for status feedback

### Spacing

- **Base unit**: 8px grid
- **Component padding**: 16px (2 units)
- **Layout gaps**: 24px (3 units)

### Typography

- **Body**: 16px with 1.5 line height
- **Headings**: Scale from 24px to 48px
- **Interactive**: 14px semibold

### Shadows

- **Cards**: Subtle elevation
- **Buttons**: Interactive feedback
- **Glows**: Cyberpunk accent effects

---

**Built for the cyberpunk ADHD productivity experience!** 🚀✨
