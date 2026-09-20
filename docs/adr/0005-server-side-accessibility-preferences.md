# ADR 0005 — Accessibility preferences stored on the user profile

**Status:** accepted

## Context
The product is for older adults. Text size and contrast are not cosmetic — a learner who sets "huge" text on a tablet expects it on the phone too, and a caregiver may set it once for them. Browser storage is per device and is cleared by "clear browsing data".

## Decision
`fontSizePref` (`default | large | xl | huge`, default `large`) and `highContrast` live on the user profile in the user service and are returned with the profile. The client's `AccessibilityContext` applies them as `data-font-size` / `data-high-contrast` attributes on `<html>`; `tokens.css` reacts to those attributes. Guests get the same controls backed by `localStorage`.

The header carries an A− / A+ stepper on every page so the control is never more than one tap away; the Settings page shows a live preview.

## Consequences
- The design system must work at every size: layouts are built with `rem`, `clamp()` and wrapping, and the Playwright walk runs the whole learner flow in `huge` and high-contrast modes with an axe scan.
- Reduced motion follows the OS setting (`prefers-reduced-motion`) rather than a stored preference; `lib/motion.js` collapses every animation to an instant transition when it is set.
- One more field on a profile endpoint; no new service.
