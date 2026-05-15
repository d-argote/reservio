---
name: Corporate Workspace System
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daea'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eefe'
  surface-container-high: '#e2e8f8'
  surface-container-highest: '#dce2f3'
  on-surface: '#151c27'
  on-surface-variant: '#444653'
  inverse-surface: '#2a313d'
  inverse-on-surface: '#ebf1ff'
  outline: '#757684'
  outline-variant: '#c4c5d5'
  surface-tint: '#3755c3'
  primary: '#00288e'
  on-primary: '#ffffff'
  primary-container: '#1e40af'
  on-primary-container: '#a8b8ff'
  inverse-primary: '#b8c4ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#4c2e00'
  on-tertiary: '#ffffff'
  tertiary-container: '#6b4200'
  on-tertiary-container: '#ffa929'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c4ff'
  on-primary-fixed: '#001453'
  on-primary-fixed-variant: '#173bab'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f9f9ff'
  on-background: '#151c27'
  surface-variant: '#dce2f3'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 48px
  max-width: 1440px
---

## Brand & Style

The brand personality of this design system is authoritative, efficient, and impeccably organized. Designed for a corporate environment where clarity and speed of task completion are paramount, the UI focuses on a **Corporate / Modern** aesthetic with a lean toward **Minimalism**. 

The target audience consists of busy professionals and facilities managers who require high-density information without cognitive overload. The emotional response should be one of reliability and calm control. To achieve this, the system utilizes significant whitespace, a disciplined color application, and a rigorous typographic hierarchy that prioritizes data legibility above all else.

## Colors

This design system utilizes a structured, high-contrast palette to distinguish between interactive elements, status indicators, and static content. 

- **Primary Blue (#1E40AF):** Used for primary actions, navigation headers, and active states to convey trust and authority.
- **Accent Green (#10B981):** Reserved for "Approved" statuses and secondary success-oriented calls to action.
- **Surface Colors:** The main application background is a clean White (#FFFFFF), while the systemic background uses a subtle Light Gray (#F9FAFB) to differentiate container layers.
- **Status Palette:**
    - **Pending:** #F59E0B (Amber)
    - **Approved:** #10B981 (Green)
    - **Rejected:** #EF4444 (Red)
    - **Canceled/Completed:** #6B7280 (Cool Gray)

## Typography

The typography system is built entirely on **Inter**, a typeface designed for screen readability and high-density interfaces. 

- **Hierarchy:** We use a tight scale to keep information compact. Headlines use semi-bold weights with slight negative letter-spacing to appear more cohesive.
- **Data Display:** For table content and equipment lists, `body-md` is the standard. Use `body-sm` for secondary metadata and timestamps.
- **Labels:** Small labels (`label-sm`) utilize uppercase styling and increased letter spacing to serve as clear category headers in filters and sidebars.

## Layout & Spacing

This design system follows a **Fixed Grid** philosophy for desktop to ensure data tables and request forms remain readable and don't stretch excessively on wide monitors.

- **Grid System:** A 12-column grid is used for desktop layouts.
- **Responsive Behavior:** 
    - **Desktop (1024px+):** 48px side margins, 16px gutters.
    - **Tablet (768px - 1023px):** 24px side margins, 16px gutters. Columns reflow to 6 or 8 depending on content density.
    - **Mobile (<768px):** 16px side margins. Layout collapses to a single column; tables transition to card-based views.
- **Spacing Rhythm:** All dimensions (padding, margins) must be multiples of the 8px base unit to maintain a rigorous visual rhythm.

## Elevation & Depth

To maintain a professional and minimalist aesthetic, this design system avoids heavy shadows and skeuomorphism. Depth is communicated via **Low-contrast outlines** and **Tonal layers**.

- **Surface Levels:** 
    - **Level 0 (Background):** #F9FAFB.
    - **Level 1 (Cards/Containers):** #FFFFFF with a 1px border (#E5E7EB).
    - **Level 2 (Modals/Popovers):** #FFFFFF with a subtle, highly-diffused ambient shadow (0px 10px 15px -3px rgba(0, 0, 0, 0.05)).
- **Interactions:** Hover states on table rows use a subtle background tint (#F3F4F6) rather than a shadow, ensuring the interface feels "flat" and fast.

## Shapes

The shape language is **Soft** (4px / 0.25rem). This choice balances the rigidity of corporate structures with a modern, approachable feel. 

- **Standard Elements:** Buttons, input fields, and checkboxes use the 4px radius.
- **Large Elements:** Cards and modals use `rounded-lg` (8px).
- **Status Tags:** These are the only exception, utilizing a **Pill-shape** (full rounding) to clearly distinguish them from interactive buttons.

## Components

### Buttons
- **Primary:** Solid #1E40AF with white text. 4px roundedness. High contrast is essential.
- **Secondary:** White background with #D1D5DB border and #1E40AF text.
- **Ghost:** No border or background; #1E40AF text. Used for "Cancel" or less frequent actions.

### Tables & Data
- **Header:** Light gray background (#F3F4F6), semi-bold text, 1px bottom border.
- **Rows:** 1px bottom border (#F3F4F6). Hover state: #F9FAFB.
- **Status Tags:** Pill-shaped with 10% opacity background of the status color and 100% opacity text of the same color (e.g., Pending has #FEF3C7 background and #F59E0B text).

### Form Fields
- **Inputs:** 1px #D1D5DB border. On focus: 1px #1E40AF border with a 2px soft blue focus ring (outline).
- **Filters:** Use a "Compact" variant of input fields (body-sm typography) to save vertical space in the header area.

### Cards
- Used for equipment summaries or dashboard widgets. 1px #E5E7EB border, no shadow, white background.

### Checkboxes & Radios
- Uses the Primary Blue (#1E40AF) for the checked state. Checkboxes have a 2px radius; radios are fully circular.