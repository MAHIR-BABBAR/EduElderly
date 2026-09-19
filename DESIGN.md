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

White background, `border-brand-border`, radius 16px, soft shadow. Use `CardHeader` + `CardTitle` + `CardDescription` + `CardContent` + `CardFooter`. Add `interactive` only when the whole card leads somewhere; it lifts 2px on hover and focus.

Course cards use `<CourseCover>`, which falls back to a per-course branded gradient when there is no thumbnail, so a catalog never shows grey boxes.

### Feedback and state

| Need | Component |
|------|-----------|
| Result of an action | `useToast()` — top-center, 8s, errors persist |
| Loading | `Skeleton` and its shaped variants — never a bare "Loading…" |
| Nothing here yet | `EmptyState` with an action |
| A number worth noticing | `StatTile` (counts up once, ≤700ms) |
| Course progress | `Progress` (bar) or `ProgressRing` (circular) |
| Position in a sequence | `Stepper` |
| Tabular admin data | `DataTable` — stacks into cards below `md` |

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
| Celebration moment | one entrance ≤2s, see below | repeats, confetti loops |
| prefers-reduced-motion | static hero, instant state | all animation |

### Celebration exception

The calm zone allows exactly one flourish: the moment a learner finishes a
course or earns a certificate. Finishing something after weeks of lessons
should feel like an occasion, and a page that changes nothing reads as though
nothing happened.

Rules, so it stays an exception:

- **Once per achievement.** Triggered by the transition into the earned state,
  never on re-visiting a page that is already complete.
- **Under two seconds**, then fully at rest. No loops, no lingering particles.
- **Reduced motion gets a static badge** with the same wording. Nothing moves.
- **Never blocks.** The learner can read, click, or navigate straight through it.
- Implemented with `celebrate()` in `src/lib/motion.js`. Do not hand-roll it.

## Accessibility

- WCAG 2.2 AA contrast on calm-zone text
- `fontSizePref` and `highContrast` from user profile → `data-font-size` / `data-high-contrast` on `<html>`
- OTP: no countdown pressure; persistent error messages
- Quiz submit: confirm dialog before irreversible submit
- Video lessons: note about captions when available

## Type scale

Named Tailwind sizes map to the tokens; prefer `text-xl` over `text-[length:var(--font-size-xl)]`.

| Class | Use |
|-------|-----|
| `text-display` | Landing hero only |
| `text-2xl` | Page title (`h1`) |
| `text-xl` | Section heading (`h2`), card title |
| `text-lg` | Lead paragraph, lesson body |
| `text-base` | Body — 18px by default |
| `text-sm` | Metadata, captions — never below 14px |

Fraunces is for display and `h1` only. Everything else is DM Sans.

## Before writing UI

1. Read this file and `packages/client/src/styles/tokens.css`
2. Identify zone: Immersive or Calm
3. Use components from `packages/client/src/components/ui/` and variants from `src/lib/motion.js`
4. Match brand teal/gold — do not use generic purple gradients
5. Check it at 400px wide and at `data-font-size="huge"` before calling it done
