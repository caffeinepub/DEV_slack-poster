# Design Brief

## Direction

Aubergine Iris — a calm, editorial Slack-posting tool with a two-tone purple brand system on a warm-neutral base.

## Tone

Refined productivity restraint — the dual aubergine/iris palette borrows Slack's own brand DNA without the loud gradient cliché, keeping density high and decoration low.

## Differentiation

Aubergine as primary (not the obvious bright iris) paired with iris as accent gives a branded-but-quiet two-tone purple system no AI defaults to.

## Color Palette

| Token      | OKLCH (light)       | OKLCH (dark)        | Role                              |
| ---------- | ------------------- | ------------------- | --------------------------------- |
| background | 0.985 0.004 320     | 0.155 0.02 320      | warm-neutral canvas / deep aubergine-charcoal |
| foreground | 0.18 0.02 305       | 0.94 0.012 305      | primary text                      |
| card       | 1.0 0.0 0           | 0.195 0.025 320     | elevated surfaces                 |
| primary    | 0.42 0.18 322       | 0.72 0.2 322        | Slack aubergine — CTAs, active    |
| accent     | 0.6 0.22 300        | 0.7 0.22 300        | Slack iris — highlights, focus   |
| secondary  | 0.95 0.012 320      | 0.24 0.03 320       | secondary controls                |
| muted      | 0.955 0.008 320     | 0.24 0.025 320      | quiet backgrounds                 |
| destructive| 0.55 0.22 25        | 0.62 0.21 25        | errors                            |

## Typography

- Display: Space Grotesk — headings, app title, channel selector
- Body: DM Sans — UI labels, message textarea, body copy
- Mono: Geist Mono — bearer token field, channel IDs
- Scale: hero `text-4xl md:text-5xl font-bold tracking-tight`, h2 `text-2xl font-semibold tracking-tight`, label `text-xs font-semibold tracking-widest uppercase text-muted-foreground`, body `text-base`

## Elevation & Depth

Two-tier shadow hierarchy (`shadow-subtle`, `shadow-elevated`) tinted aubergine instead of pure black; cards lift subtly off the warm-neutral base, popovers use `shadow-elevated`.

## Structural Zones

| Zone    | Background                          | Border            | Notes                                  |
| ------- | ----------------------------------- | ----------------- | -------------------------------------- |
| Header  | `bg-card`                           | `border-b`        | app title left, identity + sign-out right |
| Content | `bg-background`                     | —                 | centered single-column, max-w-2xl      |
| Footer  | `bg-muted/40`                       | `border-t`        | minimal, status + brand line            |

## Spacing & Rhythm

Section gaps `space-y-8`, content grouping `space-y-4`, micro-spacing `gap-2` between label and control; generous breathing room around the composer card.

## Component Patterns

- Buttons: primary `bg-primary text-primary-foreground rounded-lg`, hover lifts L; secondary `bg-secondary`; accent reserved for active nav + focus ring
- Cards: `rounded-lg bg-card border shadow-subtle`, composer card uses `shadow-elevated` as the focal surface
- Badges: channel pills `rounded-full bg-secondary text-secondary-foreground text-xs`
- Inputs: `rounded-md border-input`, focus ring uses `--ring` (iris)

## Motion

- Entrance: `animate-fade-in` 0.3s on view mount, staggered for cards
- Hover: `transition-smooth` on all interactive elements, subtle L lift on buttons
- Decorative: `animate-pulse-soft` on posting/send-in-progress indicator only

## Constraints

- No bright-purple full-bleed gradients — aubergine is dominant, iris is sparing accent only
- No glow/neon shadows; shadows are aubergine-tinted and subtle
- Max 3 font families; mono used only for token/code surfaces
- Token-only styling — no raw hex or arbitrary color classes in components
- Light and dark both fully tuned (not inverted); AA+ contrast in both

## Signature Detail

The composer card sits as the single elevated focal surface on an otherwise flat canvas — the aubergine-to-iris gradient primary button is the only saturated moment, making "send to Slack" feel like the deliberate, branded act it is.
