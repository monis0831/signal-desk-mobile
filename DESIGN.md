# Design

Visual system for Signal Desk Mobile. Read PRODUCT.md first; this file answers
"how it looks", that one answers "why".

## Theme

**Dark, always.** Scene: a trader glancing at his phone at 23:00 in a dim room,
or during the day between other things, to confirm a live-money bot is alive.
Dark surfaces let profit/loss and armed-state colours carry meaning without
shouting, and match the desktop app's identity. There is no light mode; the
`color-scheme` is `dark` and the status bar style is `black-translucent`.

Colour strategy: **Restrained.** Pure near-black surfaces at zero chroma; one
teal accent; semantic colours only where they mean money or risk.

## Palette (OKLCH)

Mood phrase: *instrument panel in a dark cockpit at night — mineral teal
indicators, nothing decorative, everything readable at a glance.*

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `oklch(0.10 0 0)` | Page ground. Zero chroma; the tint lives in the accent. |
| `--surface` | `oklch(0.145 0 0)` | Sheets, tab bar, grouped list backgrounds. |
| `--surface-2` | `oklch(0.19 0 0)` | Pressed rows, inputs, secondary panels. |
| `--line` | `oklch(0.26 0 0)` | Hairline separators (1px). Never thicker as an accent. |
| `--ink` | `oklch(0.96 0 0)` | Primary text. |
| `--ink-2` | `oklch(0.74 0 0)` | Secondary text and labels. ≥ 7:1 on `--bg`. |
| `--ink-3` | `oklch(0.58 0 0)` | Tertiary: timestamps, hints. ≥ 4.5:1 on `--bg`; never for money. |
| `--primary` | `oklch(0.76 0.11 200)` | Selection, primary actions, live indicator, links. |
| `--primary-ink` | `oklch(0.12 0.03 200)` | Text on a `--primary` fill. |
| `--profit` | `oklch(0.78 0.15 150)` | Positive P&L. Paired with a `+` sign always. |
| `--loss` | `oklch(0.70 0.19 25)` | Negative P&L, errors, destructive confirms. |
| `--armed` | `oklch(0.80 0.15 70)` | Live-trading armed state and its confirmations. Used nowhere else. |
| `--focus` | `oklch(0.76 0.11 200 / 0.55)` | Focus ring, 2px outside offset. |

Semantic states standardised across every component: default, hover (pointer
only), focus-visible, active/pressed, disabled (`--ink-3`, no colour),
selected (`--primary` text or 1px `--primary` line), loading (skeleton, never a
centred spinner), error (`--loss`), warning (`--armed`), success (`--profit`).

Inactive states never carry saturated colour. A disarmed bot is `--ink-2`; an
armed one is `--armed`. A closed position has no colour at all.

## Typography

One family for UI: **Inter** (`@fontsource/inter`, matching the desktop app),
falling back to `-apple-system, system-ui`. **JetBrains Mono** for prices,
tickets, lot sizes and anything that must align in columns; otherwise Inter
with `font-variant-numeric: tabular-nums`.

Fixed rem scale, ratio 1.2, no fluid clamps:

| Step | Size | Use |
| --- | --- | --- |
| `--t-xs` | 0.75rem / 12px | Timestamps, hints |
| `--t-sm` | 0.875rem / 14px | Secondary labels |
| `--t-md` | 1rem / 16px | Body, rows, inputs (16px prevents iOS zoom) |
| `--t-lg` | 1.25rem / 20px | Section headings |
| `--t-xl` | 1.5rem / 24px | View titles |
| `--t-2xl` | 2rem / 32px | Only the account equity on Home |

Weights: 400 body, 500 labels and row titles, 600 headings and amounts. No
display fonts anywhere. `text-wrap: balance` on headings.

## Spacing and radius

4px base: `--s-1` 4, `--s-2` 8, `--s-3` 12, `--s-4` 16, `--s-5` 24, `--s-6` 32.
Screen horizontal padding 16px plus `env(safe-area-inset-left/right)`.

Radius: `--r-sm` 6px controls, `--r-md` 10px grouped lists and inputs,
`--r-lg` 16px bottom sheets (top corners only). No pill buttons except the
segmented arm/dry-run control.

## Layout

- **Bottom tab bar**, fixed, `--surface`, 1px `--line` on top, padded by
  `env(safe-area-inset-bottom)`. Tabs: Home · Positions · Signals · Channels ·
  More. Active tab in `--primary`, inactive in `--ink-2`.
- **View header**: title at `--t-xl`, a persistent connection/staleness
  indicator on the right. Sticks on scroll with a `--surface` background.
- **Grouped lists** (iOS inset style): `--surface` container, `--r-md`, 1px
  `--line` between rows, rows ≥ 52px tall, chevron only where a row navigates.
- **Bottom sheets** for edit SL/TP, close position, arm/disarm confirmation,
  and pairing. Never a centred modal. Drag handle, `--r-lg` top corners,
  backdrop `oklch(0 0 0 / 0.6)`.
- iPad landscape: tab bar becomes a left rail; lists gain a max-width of 720px
  and centre. Nothing else changes.
- No horizontal page scroll, ever. Wide content scrolls inside its container.

## Components

- **Arm control**: a segmented control (Off · Dry run · Live). Selecting Live
  opens a confirmation sheet stating the account, broker, and that real orders
  will be sent. Armed state renders the segment in `--armed` and puts an
  `--armed` dot in every view header.
- **Position row**: symbol + direction + lots on the left in Inter 500; P&L on
  the right in JetBrains Mono 600 with sign and colour; SL/TP beneath in
  `--ink-2` mono. Tapping opens a sheet; no swipe-to-close (too easy to
  mis-tap on money).
- **Signal row**: channel, time, and outcome badge (traded · skipped · rejected
  · unmapped) — badge is text on a `--surface-2` fill, coloured only for
  rejected (`--loss`). Expands inline to show the raw message and the parse.
- **Staleness pill**: appears in the header when data is older than 10s —
  "12s ago", `--ink-2`; after 60s, `--armed` and "stale". Disconnected is its
  own full-width banner under the header, not a toast.
- **Skeletons** on first load, shaped like the rows they replace.
- **Empty states** teach: "No open positions. The bot opens them when a
  watched channel posts a signal with a stop." — never just "Nothing here".

## Motion

150–250ms, `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quint). Motion conveys
state only: sheet slide-up, tab crossfade, row press, P&L value change
(colour flash 300ms, no scale). No page-load choreography, no bounce.

`@media (prefers-reduced-motion: reduce)`: sheets and tabs crossfade in 120ms,
value flashes become instant.

## Z-index scale

`--z-sticky` 10 · `--z-tabbar` 20 · `--z-backdrop` 30 · `--z-sheet` 40 ·
`--z-toast` 50. Nothing else.

## Bans (in force here)

Side-stripe borders as accents · gradient text · glass panels · the
big-number-small-label hero metric · identical card grids · uppercase tracked
eyebrows · numbered section markers · centred modals · custom scrollbars ·
saturated colour on inactive states · any spinner in the middle of content.
