# Design System Documentation: Resource Management Excellence

## 1. Overview & Creative North Star: "The Architectural Curator"

This design system moves beyond the standard "SaaS dashboard" aesthetic to embrace the role of **The Architectural Curator**. In the high-stakes world of resource management, users aren’t just looking at data; they are managing human capital and high-value assets. 

Our North Star is a commitment to **Editorial Professionalism**. We replace rigid, boxy grids with intentional white space, sophisticated tonal layering, and high-contrast typography. The goal is to make the interface feel like a premium physical workspace—where depth is created through light and material rather than lines and borders. By leveraging asymmetrical layouts and "breathable" components, we transform complex logistics into a serene, authoritative experience.

---

## 2. Colors: Tonal Depth & Narrative

Our palette is anchored in trust and stability, using deep teals and blues to provide a sense of institutional permanence.

### The Palette (Material Logic)
*   **Primary Hierarchy:** Use `primary` (#002045) for core brand moments and `primary_container` (#1A365D) for meaningful background blocks.
*   **Secondary/Tertiary:** `secondary` (#3b6090) provides functional clarity, while `tertiary` (#321b00) and its containers offer a warm "human" counterpoint for highlights or alerts.

### The "No-Line" Rule
To achieve a high-end editorial feel, **1px solid borders are prohibited for sectioning.** We do not "box in" our data. Instead, boundaries are defined by:
1.  **Background Shifts:** Transitioning from `surface` (#f6fafe) to `surface_container_low` (#f0f4f8).
2.  **Tonal Transitions:** Using subtle color blocks to anchor content.

### Surface Hierarchy & Nesting
Think of the UI as a series of stacked, premium materials.
*   **Base:** `surface`
*   **Sectioning:** `surface_container`
*   **Actionable Elements:** `surface_container_lowest` (pure white) cards placed on `surface_container_low` backgrounds create an effortless, high-contrast lift.

### The "Glass & Gradient" Rule
Standard flat colors lack soul. For CTAs and hero states, utilize a subtle gradient from `primary` (#002045) to `primary_container` (#1A365D). For floating navigation or modal overlays, apply **Glassmorphism**: use `surface_container_lowest` with 80% opacity and a `20px` backdrop-blur to allow the rich primary colors of the app to bleed through softly.

---

## 3. Typography: Authority Through Scale

We utilize **Inter** to ensure maximum legibility, but we treat it with editorial intent.

*   **Display (lg/md/sm):** Reserved for high-level dashboard summaries or empty state "hero" moments. These should feel intentional and spacious.
*   **Headline (lg/md/sm):** The primary narrative tool. Use `headline-lg` for section titles to establish a clear starting point for the eye.
*   **Body (lg/md):** Our workhorse. `body-lg` is preferred for resource descriptions to maintain an air of premium accessibility.
*   **Label (md/sm):** Used for metadata and overline text. Always uppercase with slight letter-spacing (0.05rem) when used as an overline.

**Hierarchy Note:** Always pair a `headline-sm` with a `body-md` in a different color token (e.g., `on_surface` vs `on_surface_variant`) to create depth without needing dividers.

---

## 4. Elevation & Depth: Tonal Layering

We reject the "drop shadow" defaults of the early web. Depth in this design system is organic.

### The Layering Principle
Instead of a shadow, place a `surface_container_lowest` (#ffffff) card on a `surface_container` (#eaeef2) background. This "Tonal Lift" is cleaner and more professional.

### Ambient Shadows
Where physical lift is required (e.g., a floating Action Button), use an **Ambient Shadow**:
*   **Color:** `on_surface` (#171c1f) at 6% opacity.
*   **Blur:** 24px - 32px.
*   **Spread:** -4px (to keep the shadow "tucked" under the element).

### The "Ghost Border" Fallback
If a border is required for accessibility (e.g., in a high-density data grid), use a **Ghost Border**: `outline_variant` at 15% opacity. It should be felt, not seen.

---

## 5. Components: Refined Interaction

### Buttons
*   **Primary:** High-contrast `primary` background with `on_primary` text. Apply a subtle `0.5rem` (8px) corner radius.
*   **Secondary:** `secondary_container` background. No border.
*   **Tertiary:** No background; use `primary` text. Subtle hover state using `primary_container` at 8% opacity.

### Input Fields
*   **Surface:** Use `surface_container_highest` (#dfe3e7) to create a "well" effect. 
*   **Active State:** Transition the "Ghost Border" to `primary` at 100% opacity. Forbid the use of heavy shadows on focus.

### Cards & Resource Lists
*   **No Dividers:** Lists are separated by `1.5rem` (xl) vertical spacing and alternating `surface_container_low` backgrounds if density is high.
*   **Rounding:** Containers use `0.75rem` (md) to `1rem` (lg). Smaller inner chips use `0.25rem` (sm).

### Additional Components: The "Timeline Scale"
For resource management, use a **Fluid Timeline Component**. Avoid vertical lines; use a `surface_container_high` horizontal track with `primary` colored "pills" representing allocated time. 

---

## 6. Do’s and Don’ts

### Do:
*   **Use Asymmetry:** Balance a heavy data table with a large, airy `headline-lg` on the left and a "Glass" summary card on the right.
*   **Embrace the Void:** Use `xl` spacing tokens to separate major functional groups.
*   **Tone over Line:** Use a background color shift before you ever reach for a divider line.

### Don't:
*   **Don't use 100% Black:** Always use `on_surface` (#171c1f) for text to maintain the premium, soft-corporate feel.
*   **Don't Over-round:** Keep the "Architectural" feel by staying within the `0.5rem` to `1rem` range for main containers. Avoid "Pill" shapes for everything except status chips.
*   **Don't use standard Drop Shadows:** If a shadow looks like a "glow" or a "smudge," it is too heavy. It should look like natural light hitting a raised surface.