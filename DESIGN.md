---
name: EduElderly Design System
description: Warm Immersive Learning — elderly-first e-learning UI contract for AI agents and developers.
tokens:
  color:
    primary: "#1B5E6B"
    primary_dark: "#134652"
    accent: "#E8A838"
    accent_soft: "#FFF4E0"
    surface: "#F7FAFB"
    text: "#1A2B32"
    text_muted: "#4A6270"
    border: "#D4E2E8"
    danger: "#B42318"
    success: "#2D6A4F"
    warning: "#B45309"
    hero_bg: "#0d2a32"
  type:
    display: "Fraunces"
    body: "DM Sans"
    base_px: 18
  motion:
    hero_max_ms: 800
    calm_max_ms: 200
    learning_motion: none
  a11y:
    touch_min_px: 44
    contrast: AA
---

# EduElderly Design System

**Personality:** A trusted community learning center with a welcoming window. Warm, calm, and dignified — never playful to the point of confusion, never dark-terminal SaaS.

**Tagline:** Learning made welcoming.

## Page zones

### Immersive zone (landing marketing only)

- Soft 3D hero (R3F), deep teal gradient background, gold accent orbs
- GSAP / BlurText entrance on hero copy only
- Staggered scroll reveals on feature cards
- **Forbidden:** WebGL in auth, learning, quiz, admin

### Calm zone (all app UI)

- White cards on `--color-surface` background
- Single shadow level: `0 4px 24px rgba(26,43,50,0.08)`
- CSS transitions ≤ 200ms only
- No parallax, no cursor effects

## Typography

| Role | Font | Size (large default) |
|------|------|---------------------|
| Display | Fraunces | hero 36–48px |
| H1 | Fraunces | 28–32px |
| H2 | DM Sans 600 | 22–24px |
| Body | DM Sans | 18px, line-height 1.65 |
| Caption | DM Sans | 14px minimum |

Icons must always appear with text labels. No hamburger-only navigation.

## Spacing

8px grid. Section gaps: 64px desktop, 40px mobile. Card padding: 24px. Button/input min height: 44px.

## Component recipes

### Button

Primary: `bg-brand-primary text-white`, radius 10px, min-height 44px. Secondary: outline with 2px border. Never icon-only without `aria-label`.

### Card

White background, `border-brand-border`, radius 16px, soft shadow. Use `CardHeader` + `CardTitle` + `CardDescription` + `CardContent`.

### Alert

Use `<Alert variant="error|success|info|warning">` — never inline red divs.

### Form field

`<FormField label hint error>` wrapping Label + Input + helper text.

### Breadcrumbs

Learning flows: `My Learning → Course → Lesson`. Use `<Breadcrumbs>` with links.

## Motion budget

| Zone | Allowed | Forbidden |
|------|---------|-----------|
| Landing hero | BlurText, GSAP stagger ≤800ms, slow R3F | scroll-jacking, autoplay video |
| Marketing sections | IntersectionObserver stagger | infinite loops |
| Calm zone | CSS transition ≤200ms | GSAP, 3D |
| prefers-reduced-motion | static hero, instant state | all animation |

## Accessibility

- WCAG 2.2 AA contrast on calm-zone text
- `fontSizePref` and `highContrast` from user profile → `data-font-size` / `data-high-contrast` on `<html>`
- OTP: no countdown pressure; persistent error messages
- Quiz submit: confirm dialog before irreversible submit
- Video lessons: note about captions when available

## Before writing UI

1. Read this file and `packages/client/src/styles/tokens.css`
2. Identify zone: Immersive or Calm
3. Use components from `packages/client/src/components/ui/`
4. Match brand teal/gold — do not use generic purple gradients
