---
name: Precision ITAM
colors:
  surface: '#f9f9ff'
  surface-dim: '#d8d9e3'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3fd'
  surface-container: '#ecedf7'
  surface-container-high: '#e6e7f2'
  surface-container-highest: '#e1e2ec'
  on-surface: '#191b23'
  on-surface-variant: '#424754'
  inverse-surface: '#2e3038'
  inverse-on-surface: '#eff0fa'
  outline: '#727785'
  outline-variant: '#c2c6d6'
  surface-tint: '#005ac2'
  primary: '#0058be'
  on-primary: '#ffffff'
  primary-container: '#2170e4'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#545f73'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f8'
  on-secondary-container: '#586377'
  tertiary: '#924700'
  on-tertiary: '#ffffff'
  tertiary-container: '#b75b00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb786'
  on-tertiary-fixed: '#311400'
  on-tertiary-fixed-variant: '#723600'
  background: '#f9f9ff'
  on-background: '#191b23'
  surface-variant: '#e1e2ec'
typography:
  h1:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  table-header:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-tabular:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  badge:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin: 24px
---

## Brand & Style

This design system is engineered for the high-stakes environment of enterprise IT asset management. The brand personality is authoritative, systematic, and reliable, aiming to instill confidence in IT administrators managing thousands of high-value assets. The emotional response is one of "ordered control"—reducing the cognitive load associated with complex data through clear hierarchy and logical structure.

The chosen style is **Corporate / Modern**, leaning heavily into a utility-first philosophy. It prioritizes information density without sacrificing clarity. The interface utilizes a structured grid, subtle tonal shifts to define boundaries, and high-contrast interaction points to ensure that the primary user path is always evident.

## Colors

The color palette is strategically divided between structural navigation and functional action.

- **Deep Slate Blue (#1E293B)**: Reserved for the primary sidebar and navigation elements. It provides a grounded, "infrastructure-like" feel that frames the content.
- **Action Blue (#3B82F6)**: Used exclusively for primary interactive elements like buttons, active states, and focus indicators.
- **Status Colors**: 
  - **Success Green (#10B981)**: Indicates "Available" or "Healthy" status.
  - **Warning Orange (#F59E0B)**: Indicates "Maintenance" or "Cautionary" states.
  - **Neutral Gray (#64748B)**: Indicates "Retired," "Archived," or "In-Storage" states.
- **Neutral Palette**: Utilizes a range of cool grays from Slate-50 to Slate-200 for backgrounds, borders, and table row stripes to maintain a clean, high-contrast environment for data.

## Typography

This design system utilizes **Inter** for its exceptional legibility in data-dense interfaces. The typographic scale is compact to maximize the information visible on-screen at once.

For tabular data, the `font-feature-settings` for tabular numbers (`tnum`) must be enabled to ensure numerical values align perfectly across rows, facilitating easier scanning of serial numbers, IP addresses, and financial figures. Use semi-bold weights for headers to provide clear section identification without the need for excessive color or size variation.

## Layout & Spacing

This design system employs a **Fluid Grid** model with fixed sidebar navigation. The main content area expands to fill the viewport, utilizing a 12-column layout for dashboard widgets and form structures.

The spacing rhythm is based on a 4px baseline grid. 16px (`md`) is the standard padding for cards and table cells, while 8px (`sm`) is used for grouping related input fields. This tight spacing ensures that comprehensive asset lists remain readable while showing as many rows as possible above the fold.

## Elevation & Depth

Visual hierarchy in this design system is achieved through **Tonal Layers** and low-contrast outlines rather than heavy shadows. 

- **Level 0 (Background)**: The main application background uses Slate-50 (#F8FAFC).
- **Level 1 (Cards/Tables)**: Surface elements use pure white (#FFFFFF) with a 1px border of Slate-200. No shadow is applied to standard cards.
- **Level 2 (Dropdowns/Modals)**: These elements use a subtle, highly-diffused shadow (0px 4px 12px rgba(0, 0, 0, 0.05)) to separate them from the content layer without breaking the professional, flat aesthetic.

This approach ensures the UI remains "quiet," allowing the status colors and data to be the primary focus.

## Shapes

The design system uses **Soft** roundedness (0.25rem / 4px). This subtle rounding softens the industrial feel of the ITAM data while maintaining a professional, boxy structure that aligns well with grid-based layouts. 

Buttons and input fields follow this 4px standard, while larger dashboard widgets or container cards may use 8px (`rounded-lg`) to distinguish them as major structural blocks.

## Components

### Buttons
Primary buttons use **Action Blue (#3B82F6)** with white text. Secondary buttons use a Slate-100 background with Slate-700 text. Buttons should have a height of 36px for standard actions to maintain high information density.

### Status Badges
Badges are the most critical visual cues. Use a "Soft Badge" style: a light tinted background of the status color (e.g., 10% opacity) with high-contrast bold text of the same hue. This provides clear identification without being visually overwhelming.

### Data Tables
Tables are the heart of this design system. Use a subtle zebra-striping (Slate-50) for rows. Headers must remain "sticky" at the top during scroll. Rows should include a hover state with a 2px Action Blue left-border highlight to indicate the active selection.

### Form Fields
Input fields use a 1px Slate-300 border. Labels are positioned above the input in a semi-bold `body-sm` size. Focus states must use a 2px Action Blue ring with an offset to ensure accessibility.

### Dashboards
Use "KPI Cards" for high-level metrics. These feature a large value in Slate-900 and a descriptive label in Slate-500, with a small trend indicator or icon in the top right corner.