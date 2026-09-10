# Product

## Register

product

## Platform

web

Mobile web, installed as a home-screen PWA on iPhone and iPad via Safari. It
must *feel* native on iOS — bottom tab bar, safe areas, bottom sheets, 44pt
targets, no browser-isms — while remaining a web app. No App Store, no signing,
no expiry; that is the whole reason it is a PWA.

## What it is

Signal Desk Mobile: the phone client for Signal Desk, a bot that reads trade
signals from Telegram channels and places matching MetaTrader 5 orders on an
FxPro account. The engine runs on a Windows machine (later a Windows VPS); this
app is a remote control and window onto it over a token-authenticated HTTP API.

## Who uses it

One person: the account owner. He is in Canada, the engine is elsewhere, and he
is not at a desk. He checks the app the way you check a thermostat — several
short glances a day, occasionally one urgent interaction:

- "Is it on? Is it connected? What is it holding right now?"
- "What did it do while I wasn't looking, and why did it skip that one?"
- "Close that. Move that stop. Turn it off."

Often in low light, one-handed, on a mobile connection that drops. Sometimes
anxious. The app's job is to make the state of a live-money system legible in
under two seconds and make every irreversible action deliberate.

## Primary task per screen

- **Home**: confirm the bot is alive and armed as expected; arm/disarm.
- **Positions**: see exposure and P&L; close or edit SL/TP on one position.
- **Signals**: understand what arrived and what happened to it.
- **Channels**: which sources are on, and whether a source can actually be read.
- **Settings**: pair with the engine, symbol mapping, reporting.

## Personality

Instrument panel, not dashboard. Three words: **sober, legible, decisive.**

The feeling is a cockpit at night: dark surfaces so the indicators carry the
information, numbers you can read at arm's length, and controls that make it
physically hard to do the wrong thing. Trust comes from restraint — nothing on
screen exists to impress; everything exists to be read.

## References

- **Linear (dark)** — for the discipline: one accent, tinted-neutral surfaces,
  type that does the hierarchy, motion that only ever conveys state.
- **Apple Stocks / Wallet** — for how a native iOS list of money-bearing rows
  should feel: rows not cards, tabular numbers, colour only where it means
  profit, loss, or live.
- **The existing Signal Desk desktop app** (`D:\t bot\desktop`) — for identity:
  dark, Inter + JetBrains Mono, the same domain vocabulary. Match its
  character; do not copy its 1400px layout.

## Anti-references

- **Crypto-exchange apps** — neon gradients, glowing candles, animated tickers,
  a dozen competing colours. Excitement is the opposite of what a bot owner
  wants to feel.
- **SaaS analytics dashboards** — hero stat cards ("$10,023.20" huge with a
  tiny label and a sparkline), identical KPI tiles, decorative charts. The
  account balance is a ledger line, not a trophy.
- **Generic admin templates** — side-stripe alerts, card grids, glass panels,
  eyebrows over every section.

## Accessibility

- Body text ≥ 4.5:1 on its surface, including muted labels. Numbers that carry
  money must be readable in bright daylight on a phone: no low-contrast grey.
- Profit/loss never encoded by colour alone — always a sign and, where
  ambiguous, a word.
- Every animation has a `prefers-reduced-motion` alternative.
- All controls ≥ 44×44pt. Destructive actions confirm with the concrete
  consequence spelled out; a mis-tap must never send an order.

## Design principles

1. **State first.** Armed vs disarmed, connected vs not, live vs stale — these
   are the most important pixels on every screen and are never ambiguous.
2. **Rows, not cards.** Positions, signals, and channels are lists. Density is
   a feature; decoration is not.
3. **Colour means something.** Teal = selected/primary/live. Green = profit.
   Red = loss. Amber = armed for live trading. Nothing else gets colour.
4. **Honest about time.** Data shows its age when it cannot be current. No
   spinner that never resolves; no fake "live".
5. **Friction where money moves.** Arming, closing, placing, and editing use
   bottom sheets that name the exact consequence, and require a deliberate
   confirm — never a modal with "Are you sure?".
