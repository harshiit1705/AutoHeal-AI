---
name: Autonomous Reliability Studio
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#bcc9cd'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#869397'
  outline-variant: '#3d494c'
  surface-tint: '#4cd7f6'
  primary: '#4cd7f6'
  on-primary: '#003640'
  primary-container: '#06b6d4'
  on-primary-container: '#00424f'
  inverse-primary: '#00687a'
  secondary: '#d0bcff'
  on-secondary: '#3c0091'
  secondary-container: '#571bc1'
  on-secondary-container: '#c4abff'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#1bbd85'
  on-tertiary-container: '#00452e'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#acedff'
  primary-fixed-dim: '#4cd7f6'
  on-primary-fixed: '#001f26'
  on-primary-fixed-variant: '#004e5c'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-xl:
    fontFamily: Inter
    fontSize: 3rem
    fontWeight: '700'
    lineHeight: 3.5rem
    letterSpacing: -0.025em
  display-xl-mobile:
    fontFamily: Inter
    fontSize: 2rem
    fontWeight: '700'
    lineHeight: 2.5rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 2rem
    fontWeight: '600'
    lineHeight: 2.5rem
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: 1.625rem
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.5rem
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.25rem
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: 1.25rem
    letterSpacing: -0.005em
  label-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.01em
  label-xs:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: '600'
    lineHeight: 0.875rem
    letterSpacing: 0.04em
  code-md:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.25rem
    letterSpacing: 0em
  code-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
    letterSpacing: 0em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system is engineered for mission-critical operations, reliability engineering, and autonomous software healing. The brand communicates unflinching precision, machine-speed intelligence, and profound control. The visual direction balances developer-grade utility with executive-level polish—drawing from the structured efficiency of Linear, the optical clarity of Vercel, the metric density of Datadog, and the typographic restraint of Stripe.

The design movement is **Technical Minimalism with Atmospheric Depth**:
- **Atmospheric Obsidian Foundation:** Layered deep navy and obsidian surfaces create a low-fatigue workspace optimized for multi-monitor command centers and high-focus incident resolution.
- **Precision Luminescence:** Color is deployed as operational telemetry rather than ornamentation. Electric cyan/teal signals active execution paths, kinetic AI surfaces pulse with soft violet, and strict semantic indicators govern operational truth.
- **Micro-Structured Geometry:** Surfaces are separated by hairline precision boundaries, deliberate 1px inset highlights, and ultra-subtle atmospheric backdrops rather than clumsy dropshadows.
- **High Signal-to-Noise Ratio:** Information density is elevated without cognitive clutter. Content hierarchy relies on rigorous typography scales, monospace telemetry alignments, and purposeful spatial rhythms.

## Colors

The palette employs a multi-tiered surface system anchored by deep midnight navy, punctuated by luminous semantic signals that communicate operational status instantaneously.

### Base Surface Architecture
- **Canvas Base (`#0B0F17`):** The foundational substrate for root viewport backgrounds and outer workspace canvases.
- **Surface Layer 1 (`#0F172A`):** Structural backdrops, navigation rails, and persistent header bars.
- **Surface Layer 2 (`#131C2E`):** Standard data cards, metrics widgets, log containers, and table rows.
- **Surface Layer 3 (`#1A243B`):** Hover states, active row selections, floating flyouts, and dialog overlays.
- **Surface Layer 4 (`#1E293B`):** Active popovers, nested code blocks, and highest-tier interactive states.
- **Hairline Border Substrate (`#24304A`):** Uniform division rule for dividers, panels, and card frames. In subtle states, use `rgba(36, 48, 74, 0.6)`.

### Semantic & Domain Signals
- **Primary Teal (`#06B6D4`, Hover `#22D3EE`, Deep Accent `#0E7490`):** Represents healthy system autonomy, user actions, primary interactive triggers, and deterministic automated execution.
- **Intelligence Violet (`#8B5CF6`, Highlight `#A78BFA`, Deep Glow `rgba(139, 92, 246, 0.15)`):** Reserved for autonomous reasoning engines, root-cause syntheses, generative runbooks, and anomaly classification.
- **Verification Emerald (`#10B981`, Deep Background `rgba(16, 185, 129, 0.12)`):** Signifies closed incidents, validated automated self-heals, system consensus, and healthy infrastructure nodes.
- **Gate Amber (`#F59E0B`, Deep Background `rgba(245, 158, 11, 0.12)`):** Demands operator oversight, pending approval thresholds, rate-limiting alarms, and degraded latency warnings.
- **Severity Crimson (`#EF4444`, Deep Background `rgba(239, 68, 68, 0.14)`):** Denotes pipeline failure, data degradation, critical service disruption, and automated remediation timeouts.

### Contrast Text System
- **Text High-Contrast:** `#F8FAFC` (Titles, operational metrics, critical telemetry)
- **Text Medium-Contrast:** `#94A3B8` (Descriptions, secondary labels, metadata tags)
- **Text Muted:** `#64748B` (Inactive states, structural icons, log line numbers)

## Typography

The typographic hierarchy prioritizes rapid scanning, dense data legibility, and zero visual ambiguity under stress.

- **Tabular Alignment & OpenType Features:** Enable `font-feature-settings: "cv02", "cv03", "cv04", "cv11", "tnum"` globally across tables, metric displays, telemetry streams, and runbook timers. Tabular figures eliminate layout jitter during high-frequency live metric recalculations.
- **Monospace Environments:** For execution stack traces, terminal streams, and infrastructure identifiers (e.g., Pod IDs, commit SHAs), fallback strictly to system developer monospaces (`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas`) while preserving standard line-height ratios.
- **Micro-Caps & Metadata Labels:** The `label-xs` style is styled uppercase with `0.04em` letter spacing for section kickers, table column headers, and audit timestamps.

## Layout & Spacing

The layout is built upon an adaptive 12-column structural grid designed for continuous data density and deep pane partitioning.

### Grid & Density Dynamics
- **Desktop (>= 1280px):** 12-column fluid grid system with `gutter-lg` (1.5rem) and `margin-lg` (2rem). Supports multi-pane workflows: collapsible navigation rail (fixed at 240px / 64px compact), incident stream canvas, and a context-aware telemetry drawer (fixed at 420px).
- **Tablet (768px - 1279px):** 8-column layout with `gutter` (1rem) and `margin-md` (1.5rem). The contextual inspector transitions to an absolute slide-over panel.
- **Mobile (< 768px):** 4-column single-stack layout with `gutter` (1rem) and `margin` (1rem). Navigation folds into a persistent bottom dock or off-canvas sheet; diagnostic tables switch to card-based ledger rows.

### Rhythmic Discipline
- Internal component spacing leverages tight, systematic increments: `space-xs` (4px) for micro-gap pill badge interiors, `space-sm` (8px) for compact toolbars and field padding, `space-md` (12px) for form groupings and list items, `space-lg` (20px) for card interiors, and `space-xl` (32px) for major layout segmentations.

## Elevation & Depth

Visual depth is achieved through high-precision luminance tiering and subtle luminescence rather than diffuse real-world shadows.

### Surface Tiers
- **Level 0 (Canvas):** Pure base `#0B0F17`. Flat, zero elevation.
- **Level 1 (Panels & Tables):** Surface `#0F172A` with a 1px border of `#24304A`.
- **Level 2 (Active Cards & Floating Menus):** Surface `#131C2E`, 1px border of `#24304A`, augmented by a subtle inset highlight: `box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.05)`.
- **Level 3 (Modal Overlays & System Flyouts):** Surface `#1A243B`, crisp border of `#24304A`, combined with a directional dark shadow: `box-shadow: 0 16px 36px -8px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08)`.

### Operational Glows & Luminous States
- **Teal Focus/Active Glow:** Used on focused form controls and primary executing states: `box-shadow: 0 0 0 2px #0B0F17, 0 0 0 4px #06B6D4, 0 0 16px -2px rgba(6, 182, 212, 0.45)`.
- **AI Diagnostics Glow:** Applied to AI-synthesized root-cause summaries and automated recovery diffs: `box-shadow: 0 0 24px -4px rgba(139, 92, 246, 0.25), inset 0 1px 0 rgba(167, 139, 250, 0.2)`.
- **Incident Critical Aura:** Low-frequency pulsing glow applied to critical incident headers: `box-shadow: 0 0 20px -2px rgba(239, 68, 68, 0.3)`.

## Shapes

The design system maintains an intentional, engineered shape profile (`roundedness: 1` / Soft). This avoids both the brutalism of 0px razor edges and the consumer-app softness of pill shapes, delivering an enterprise cockpit feel.

- **Base Radius (0.25rem / 4px):** Form controls, buttons, tooltips, segmented control tabs, code snippets, status badges.
- **Large Radius (0.5rem / 8px):** Primary content cards, telemetry panels, modal containers, and nested workflow viewports.
- **Full Radius (9999px):** Live state dot indicators, avatar avatars, and standalone numeric micro-counter chips.

## Components

### Buttons
- **Primary (Action/Heal):** Background `#06B6D4`, text `#0B0F17` (bold weight for contrast), border `1px solid #22D3EE`. On hover: background `#22D3EE` with a cyan ambient aura.
- **Secondary (Inspect/Configure):** Background `#131C2E`, text `#F8FAFC`, border `1px solid #24304A`. Hover: background `#1A243B`, border-color `#334155`.
- **AI Assist / Autonomous:** Gradient background `linear-gradient(135deg, #131C2E 0%, #1A243B 100%)`, text `#A78BFA`, border `1px solid rgba(139, 92, 246, 0.4)`. Inset top highlight `rgba(167, 139, 250, 0.2)`.
- **Destructive / Rollback:** Background `rgba(239, 68, 68, 0.1)`, text `#EF4444`, border `1px solid rgba(239, 68, 68, 0.3)`. Hover: background `rgba(239, 68, 68, 0.2)`.

### Status Badges & Chips
- Compact horizontal layout (`height: 22px`, `padding: 0 8px`, `border-radius: 4px`).
- Includes a 6px circular indicator dot on the left.
- **Healthy/Recovered:** Background `rgba(16, 185, 129, 0.1)`, text `#10B981`, border `1px solid rgba(16, 185, 129, 0.25)`. Dot is solid `#10B981`.
- **Investigating (AI):** Background `rgba(139, 92, 246, 0.12)`, text `#A78BFA`, border `1px solid rgba(139, 92, 246, 0.3)`. Dot pulses via keyframe animation.
- **Awaiting Approval:** Background `rgba(245, 158, 11, 0.12)`, text `#F59E0B`, border `1px solid rgba(245, 158, 11, 0.3)`.
- **Failed / Degraded:** Background `rgba(239, 68, 68, 0.14)`, text `#EF4444`, border `1px solid rgba(239, 68, 68, 0.35)`.

### Input Fields & Search Bars
- Background `#0F172A`, border `1px solid #24304A`, text `#F8FAFC`, placeholder `#64748B`.
- Integrated monospace command shortcut indicator (e.g., `⌘K`) rendered in `#64748B` with subtle border `rgba(255, 255, 255, 0.1)`.
- Focus state: border-color `#06B6D4`, outline none, cyan shadow ring.

### Checkboxes & Toggle Switches
- **Checkboxes:** 16x16px, border `1px solid #24304A`, background `#0B0F17`. Checked: background `#06B6D4`, check icon `#0B0F17`.
- **Switches (Autonomous Triggers):** Track 36x20px in `#1E293B`, border `1px solid #24304A`. Active track switches to `#06B6D4` with a sliding thumb in `#0B0F17` or `#FFFFFF`.

### Cards & Telemetry Panels
- Surface `#131C2E`, border `1px solid #24304A`, border-radius `8px`.
- Card Header: Separated by a 1px border `#24304A`, containing metadata tags, uptime percentages in tabular numerals, and quick action icons.

### Specialized Incident & Remediation Components
- **Console & Log Stream:** Background `#080C14`, border `1px solid #1E293B`, monospace typography (`code-sm`), row height 20px, left gutter with line numbers in `#475569`, error text highlighted with background `rgba(239, 68, 68, 0.08)`.
- **Self-Healing Runbook Diff View:** Dual-column or unified split view showcasing code/config drift. Remediation additions highlighted in emerald tones, deletions in crimson, and AI-predicted outcomes framed in violet luminescence.