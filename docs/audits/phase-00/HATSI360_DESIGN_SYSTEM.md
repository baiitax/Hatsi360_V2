# Hatsi360 Markets — Proposed Design System

**Phase 0 recommendation only. No tokens have been applied to the application.**  
Source basis: `src/app/globals.css`, `src/lib/brand.ts`, `src/lib/chart-colours.ts`, `docs/design-system/hatsi360-markets/`.

## Direction

Retain the specific identity already present: **African Agricultural Intelligence Terminal**. Use a deep green-charcoal market surface for frequent data reading, a warm-light editorial surface for reports, Inter/Manrope typography, tabular financial figures, and a restrained harvest-gold highlight. Do not apply a generic SaaS palette or replace the dual environment with a blanket dark-mode toggle.

Current application support is two surface contexts (`.terminal` dark and `.editorial`/light pages), not a user-selectable theme preference. Keep that distinction explicit. Light and dark token sets below describe surface-aware components, not an unapproved theme switch.

## Color tokens

### Brand and neutral foundation

| Role/token | Recommended HEX | Purpose |
|---|---:|---|
| Brand primary | `#174D35` | Primary action, active state on light canvas, links on white. Existing brand-700. |
| Brand deep | `#123B2A` | Brand identity / dark structure, not small text on dark surfaces. |
| Brand supporting | `#26734B` | Strong green for actions and light-canvas positive movement. Existing brand-600. |
| Brand highlight | `#E9C97E` | Focus and selected accent on dark surface; gold remains subordinate. Existing harvest-300. |
| Harvest accent | `#D5A441` | Decorative highlights and chart series, not small text on white. |
| Terminal background | `#101713` | Dark reading canvas. Existing. |
| Terminal primary surface | `#17211B` | Panels. Existing. |
| Terminal elevated surface | `#1C2921` | Popovers, raised panels. Existing. |
| Terminal control outline | `#637166` | Visible boundary when a control outline is necessary; ≈3.22:1 on terminal surface. Separate from decorative dividers. |
| Terminal divider | `#2C3A31` | Decorative hairline only. Existing. |
| Editorial background | `#F7F8F5` | Warm page canvas. Existing. |
| Editorial surface | `#FFFFFF` | Cards and forms. Existing. |
| Editorial inset | `#F0F3EE` | Subtle inset/surface differentiation. Existing. |
| Light control outline | `#8B9790` | Input/interactive boundary; ≈3.03:1 on white. |
| Light divider | `#E3E9E2` | Decorative separator only. Existing. |

### Text colors

| Role | HEX | Where it is safe |
|---|---:|---|
| Terminal primary | `#F3F6F2` | Terminal bg/surface; calculated 16.70:1 on bg. |
| Terminal secondary | `#A8B5AA` | Terminal surfaces; calculated 8.54:1 on bg. |
| Terminal muted, revised | `#85938A` | Terminal bg/surface/elevated; 5.67/5.15/4.71:1 respectively. Do not use the current `#748278` for normal text on surface/elevated. |
| Editorial primary | `#202923` | Light background; 14.04:1. |
| Editorial secondary | `#59665E` | Light background; 5.65:1. |
| Editorial muted | `#5A6760` | Light surfaces; verify on each exact background (≥5:1 target). |
| Inverse | `#FFFFFF` | Text on tested dark brand action surfaces. |
| Disabled | `#7C8780` | Disabled controls only, with disabled semantics and shape/state cue; not as the sole carrier of information. |

### Semantics and market movement

Do not imply that price increase is universally good. Pair sign, glyph, text and value. Meaning cannot be carried by color alone.

| Meaning | Light-surface text | Dark-terminal text | Background/treatment | Rule |
|---|---:|---:|---|---|
| Success / positive movement | `#1C6E45` | `#50B77A` | Pale green on light; dark green chip on terminal | Use `▲ +x%` and period. Positive is a direction, not a recommendation. |
| Warning / delayed | `#8A6520` | `#E9C97E` | `#FDF6E6` / dark gold tint | Always include word state (Delayed, Review). |
| Danger / negative movement | `#A63E39` | `#EB7770` | `#FDF0EF` / dark red tint | Use `▼ −x%`, not color only. |
| Information | `#2C628F` | `#78B7E7` | `#EEF4FB` / dark blue tint | Use explicit label/icon. |
| Neutral movement | `#59665E` | `#A8B5AA` | Neutral surface | Use `—` and “No comparable move” only when supported. |
| Data series 1 | `#2F8257` | `#50B77A` | none | Brand green. |
| Data series 2 | `#D5A441` | `#E9C97E` | none | Grain gold. |
| Data series 3 | `#3478B8` | `#78B7E7` | none | Blue, only as a distinct series. |
| Data series 4 | `#85735C` | `#B9A1F2` | none | Earth/alternate line; pair color with dash/marker differences. |

The semantic HEX choices reuse existing brand semantics where they already pass; brighter dark-terminal counterparts are recommended because existing movement green/red are near the 4.5:1 text threshold on the page background and fall to about 4.1:1 on the panel surface.

### WCAG 2.2 AA contrast check (code-derived)

The following values were computed from the current exact CSS colors. Text thresholds: 4.5:1 for normal text; 3:1 for large text. UI boundaries/graphics that are necessary to identify a control should target 3:1. Contrast checks do not replace browser review of opacity, overlays, antialiasing, or image backgrounds.

| Current pair | Ratio | Result |
|---|---:|---|
| terminal primary `#F3F6F2` / bg `#101713` | 16.70:1 | AAA |
| terminal secondary `#A8B5AA` / bg `#101713` | 8.54:1 | AAA |
| terminal muted `#748278` / bg `#101713` | 4.51:1 | AA, very near threshold |
| terminal muted `#748278` / surface `#17211B` | 4.10:1 | Fails normal text AA |
| terminal muted `#748278` / elevated `#1C2921` | 3.75:1 | Fails normal text AA |
| focus ring brand-700 `#174D35` / terminal bg `#101713` | 1.86:1 | Insufficient focus contrast |
| terminal border `#2C3A31` / terminal bg | 1.52:1 | Decorative only, not sufficient alone as a meaningful control edge |
| editorial primary `#202923` / bg `#F7F8F5` | 14.04:1 | AAA |
| editorial secondary `#59665E` / bg `#F7F8F5` | 5.65:1 | AA |
| brand-500 `#2F8257` / white | 4.72:1 | AA |
| success-500 `#228B55` / white | 4.29:1 | Fails normal text AA |
| warning-500 `#D69E2E` / white | 2.39:1 | Fails normal text AA |
| warning-700 `#8A6520` / warning-50 `#FDF6E6` | 4.92:1 | AA |
| error-700 `#A63E39` / error-50 `#FDF0EF` | 5.61:1 | AA |
| info-700 `#2C628F` / info-50 `#EEF4FB` | 5.84:1 | AA |

The current `COLOR_SYSTEM.md` published ratios should be recalculated before any color change: its editorial text-secondary figure (≈6.4:1) does not match the independent CSS-based calculation (5.65:1), and its terminal muted-on-bg figure (≈4.7:1) calculates to 4.51:1.

## Typography scale

Keep Inter and Manrope; use a scale that prioritizes the reading of prices and evidence.

| Role | Proposed size / line-height | Weight | Notes |
|---|---|---:|---|
| Micro, decorative | 10 / 14px | 600 | Not for a date, state or control label. |
| Metadata | 12 / 16px | 400–500 | Timestamps, source, secondary data. |
| Compact body | 13 / 20px | 400 | Dense table cells only. |
| Body | 14 / 22px | 400 | Default terminal explanatory text. |
| Editorial body | 16 / 26px | 400 | Comfortable long-form reading measure. |
| Figure/table price | 15–18 / 22–26px | 600 | Tabular figures, right-aligned. |
| Page title | 24–32 / 1.15 | 700 | 24 mobile, 28 tablet, 32 desktop; smaller dense-page exception only. |
| Section title | 18–20 / 1.3 | 650–700 | Consistent section hierarchy. |
| Card title | 15–16 / 1.35 | 600–700 | Avoid oversized card headings. |
| KPI figure | 24–32 / 1.1 | 600–700 | Use only for decision-critical data. |
| Chart axis/legend | 12 / 16px minimum | 400–500 | Full date/value available in tooltip/data summary. |

Use `font-variant-numeric: tabular-nums` for money, counts, quantities and percentages; do not use tabular alignment to compensate for inconsistent currency/unit formatting. Avoid 9px navigation labels.

## Spacing, radius, shadow and containers

| System | Recommended values |
|---|---|
| Base spacing | 4px unit: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. |
| Terminal rhythm | 8px row inner gap; 12–16px panel padding; 20–24px section gap; 16px mobile gutter, 24px tablet, 32px desktop. |
| Editorial rhythm | 24–32px paragraph/section separation; 60–70ch measure; 16px mobile edge. |
| Radius | Control 4px; data panel 6–8px; editorial card 10–12px; badge 999px. Avoid 16–24px on dense terminal cards. |
| Shadow | Default none/one-pixel border; one restrained overlay shadow; one modal shadow. No ambient card shadow on every terminal row. |
| Terminal container | Fluid, max 1760px (current 110rem), 16–32px gutter; allow dense price tables to use width. |
| Editorial container | 1120px max for page; prose 65–70ch. Current `.container-page` is 1280px and `.PageContainer` is 1760px; name these semantics explicitly. |

## Responsive breakpoints and grids

Use existing Tailwind v4 breakpoints where possible: `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`. Do not add a new breakpoint until browser evidence requires it. Explicitly test the requested widths 320, 375, 430, 768, 1024, 1280, 1440 and 1920.

| Width | Grid/content rule |
|---|---|
| 320–639 | 4-column conceptual grid, one-column page content, 16px gutters; only high-frequency bottom navigation. |
| 640–767 | 4/8-column hybrid, form fields stack or use 2 columns only if labels fit. |
| 768–1023 | 8-column tablet; drawer navigation; price rows use deliberate card/table decision. |
| 1024–1279 | 12-column desktop but narrow terminal chrome; prevent header/dropdown collision. |
| 1280–1919 | 12 columns, 24px gutters; denser tables can expand. |
| ≥1920 | Cap main terminal width; center content rather than expanding line length indefinitely. |

## Component standards

| Component | Recommended variants / contract |
|---|---|
| Button | Primary filled, secondary outlined, tertiary/quiet, destructive. 40px desktop; 44px touch target. Explicit loading/disabled, focus-visible, pressed state. |
| Input/select/date | 44px target on touch, 40px desktop; persistent label; visible error/help association; surface-aware focus ring; preserve browser-native input affordance. |
| Card/panel | `data-panel`, `summary`, `interactive`, `empty`; avoid nested cards; title and action stay outside table bodies where possible. |
| Table | `dense` and `comfortable`; semantic caption/header/scope/aria-sort; numeric alignment; row min 44px touch; sticky header; explicit mobile scroll cue or alternate card form. |
| Badge | Status + text; semantic pair by environment; never color alone; stable size and no truncation for essential state. |
| Navigation | Terminal module nav, mobile drawer + bottom actions, role-filtered admin sidebar, field bottom navigation. Shared interaction/a11y contract, not one visual layout. |
| Modal/drawer | Focus entry, focus containment, Escape, return focus, scroll lock, safe area, visible close button, tested small-height fit. |
| Chart frame | Title, unit/currency, date range, series meaning, legend, empty/loading/error, tooltip and accessible table/data alternative. |

## Tailwind/CSS mapping (recommendation only)

```css
:root {
  --hatsi-brand: #174d35;
  --hatsi-brand-strong: #26734b;
  --hatsi-highlight: #e9c97e;
  --surface-terminal: #101713;
  --surface-terminal-panel: #17211b;
  --surface-terminal-raised: #1c2921;
  --text-terminal: #f3f6f2;
  --text-terminal-secondary: #a8b5aa;
  --text-terminal-muted: #85938a;
  --outline-terminal-control: #637166;
  --focus-terminal: #e9c97e;
  --surface-editorial: #f7f8f5;
  --text-editorial: #202923;
  --text-editorial-secondary: #59665e;
  --outline-editorial-control: #8b9790;
  --focus-editorial: #174d35;
  --market-up-dark: #50b77a;
  --market-down-dark: #eb7770;
}
```

Map to named `@theme` utilities (e.g. `terminal-muted`, `focus-terminal`, `market-up`), not ad-hoc arbitrary hex or opacity. Treat the code block as an implementation sketch, not permission to modify CSS now.

## Acceptance criteria for Phase 1 design foundation

1. Token source is authoritative and docs/tests match computed contrast values.
2. Normal text ≥4.5:1 on its actual surface; large text ≥3:1; meaningful control boundaries and focus indicators ≥3:1.
3. No semantic or market movement state is communicated by color alone.
4. Minimum text-size rules apply to prices, dates, chart axes, labels and navigation.
5. Light editorial and dark terminal contexts are tested separately, including forms and charts.
6. All eight target viewports have screenshot and overflow evidence; no implementation approval based on static classes alone.
