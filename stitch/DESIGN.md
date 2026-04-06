# Design System Documentation: The Intelligence Editorial

## 1. Overview & Creative North Star
**Creative North Star: The Quiet Authority**

This design system moves away from the aggressive, high-contrast layouts of traditional fintech and toward the sophisticated, calm atmosphere of a premium editorial publication. We are building "The Intelligence Editorial"—a space where financial data is treated with the same reverence as a high-end investigative journal.

The system breaks the "template" look by prioritizing **intentional asymmetry** and **breathable white space**. We reject the standard "dashboard" grid in favor of a layout that feels curated. By mixing a sharp, modern serif for insights with a precise sans-serif for utility, we create a rhythmic tension between "reading" and "acting." This is a data-first environment that values clarity over clutter and trust over trends.

---

## 2. Color & Tonal Theory
Our palette is rooted in a calm, off-white foundation (`surface`) accented by a restrained, high-trust emerald (`primary`).

### The "No-Line" Rule
To achieve a premium, seamless feel, **designers are prohibited from using 1px solid borders for sectioning.** Structural boundaries must be defined exclusively through background color shifts.
*   **Example:** A `surface_container_low` section sitting against a `surface` background provides enough contrast to define a zone without the "cheapness" of a stroke.

### Surface Hierarchy & Nesting
Think of the UI as physical layers of fine paper. Depth is achieved by "stacking" surface-container tiers:
*   **Base:** `surface` (#f9f9fb)
*   **Subtle Recess:** `surface_container_low` (#f3f3f5) for large secondary background areas.
*   **Elevated Content:** `surface_container_lowest` (#ffffff) for primary cards and modules.
*   **Active Zones:** `surface_container_high` (#e8e8ea) for hover states or sidebar elements.

### The Glass & Signature Texture
For floating elements (modals, dropdowns), use **Glassmorphism**. Apply `surface` with 80% opacity and a 20px `backdrop-blur`. 
To add "soul" to our emerald green, primary CTAs should utilize a subtle vertical gradient from `primary` (#006c49) to `primary_container` (#10b981). This prevents the green from feeling "flat" or institutional.

---

## 3. Typography
We use a dual-typeface system to balance editorial elegance with financial precision.

*   **Editorial (Newsreader):** Used for `display`, `headline`, and `title-lg`. The serif nature of Newsreader lends an air of historical trust and intellectual depth. It is for the "why"—the insights and intelligence.
*   **Utility (Inter):** Used for `body`, `label`, and `title-sm/md`. The clean, neutral sans-serif is for the "what"—the data points, button labels, and input fields.

**Typography Strategy:**
Use high-contrast scales. A `display-lg` headline in Newsreader should often sit near a `label-md` in Inter. This "Large/Small" pairing creates an authoritative hierarchy that guides the eye immediately to the most important narrative.

---

## 4. Elevation & Depth
Traditional drop shadows are too "software-standard." We use **Tonal Layering** and **Ambient Light**.

*   **The Layering Principle:** Place a `surface_container_lowest` card on a `surface_container_low` background. The slight shift in hex value creates a soft, natural "lift" without visual noise.
*   **Ambient Shadows:** If a card must float (e.g., a dragged element), use a shadow with a 40px blur, 0% spread, and 6% opacity. The shadow color should be a tinted version of `on_surface` (a deep grey-blue) rather than pure black.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use `outline_variant` at **15% opacity**. It should be felt, not seen.
*   **Backdrop Blurs:** Use blurs on all overlays to ensure the UI feels integrated into the environment, allowing colors from the data visualizations below to bleed through softly.

---

## 5. Components

### Cards & Modules
*   **Rule:** No dividers. Use vertical spacing (1.5rem to 3rem) to separate content sections within a card.
*   **Styling:** Use `surface_container_lowest` with a `DEFAULT` (0.25rem) or `md` (0.375rem) corner radius. The small radius keeps the aesthetic "sharp" and professional.

### Buttons
*   **Primary:** Gradient of `primary` to `primary_container`. White text (`on_primary`). No border.
*   **Secondary:** `surface_container_highest` background. Dark text (`on_surface`).
*   **Tertiary:** Text-only in `primary` weight 600. No background except on hover (5% `primary` tint).

### Data Inputs
*   **Minimalist Fields:** Inputs should not be heavy boxes. Use a `surface_container_low` background with a 1px `outline_variant` (20% opacity) at the bottom only, or a very light full ghost-border.
*   **Focus State:** Shift the bottom border to `primary` (#006c49) and add a subtle 2px glow.

### Financial Modules (Custom)
*   **The "Insight Ribbon":** A thin, full-width `surface_container_low` strip with `label-sm` metadata to separate major editorial sections.
*   **Data Density:** Lists must use `surface_container_lowest` for rows with a `surface` background on hover. Forbid line dividers; use `0.5rem` of vertical gap instead.

---

## 6. Do’s and Don’ts

### Do
*   **DO** use asymmetric layouts (e.g., a wide 8-column content area paired with a narrow 3-column "insight" sidebar).
*   **DO** use the `primary` emerald green sparingly. It is a "surgical" accent to draw attention to success states or critical action points.
*   **DO** embrace white space. If you think there is enough space, add 20% more.
*   **DO** use Newsreader for large numeric data points (e.g., a Portfolio Total) to give them weight and prestige.

### Don't
*   **DON'T** use 100% opaque, high-contrast borders.
*   **DON'T** use generic "Blue" for links. Use `primary` or `on_surface` with an underline.
*   **DON'T** use standard "cards on a grey background" layouts. Use varying shades of off-white to create "zones" of information.
*   **DON'T** use portraits or stock photography. Focus on the beauty of the structured typography and data.