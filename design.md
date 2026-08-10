---
tags:
  - type/doc
  - project/nutrimind
  - status/active
type: doc
project: nutrimind
status: active
aliases: []
---
# Design — NutriMind Reserve

A locked design system for this app. Every page redesign reads this file before
emitting code. Do not regenerate per page — extend or amend this file when the
system needs to grow.

Produced by `hallmark redesign` (multi-page flow), 2026-08-09. Brand axis:
**restructure, keep the Vault.** The pre-existing "Vault" identity (statement
paper, brass foil, ledger rows, tabular mono figures) is the locked brand;
Hallmark owns macrostructure, rhythm, typography pairing, and interaction
discipline.

## Genre

editorial

## Macrostructure family

Pick one base macrostructure for marketing pages, one for app pages, one for
content pages. Pages within a family share the family's shape; they vary only
in component archetypes.

- Marketing pages: **Stat-Led** — hero is one giant engraved figure (the
  reserve balance) paired with a worded headline; the statement artifact and
  numbered terms qualify it. Archetypes that may vary: supporting-stat strip,
  ledger artifact placement.
- App pages: **Workbench** — function carries the page. Ledger-row language,
  metric-strip rhythm, tabbed workbench. Variation knobs: card composition,
  tab layout. No hero, no marketing sections.
- Content pages: **Long Document** — single column, one clause per screen,
  typography only (onboarding wizard, auth frames).

## Theme

Light (statement paper) — canonical:

- `--color-paper`      oklch(93.5% 0.021 88.7)   /* #EFE9DA statement paper */
- `--color-paper-2`    oklch(89.5% 0.028 88.8)   /* #E4DCC8 paper well */
- `--color-card`       oklch(97.9% 0.011 89.7)   /* #FBF8F0 engraved card */
- `--color-ink`        oklch(19.2% 0.014 87.5)   /* #17140D */
- `--color-ink-2`      oklch(50.1% 0.041 91.2)   /* #6C6349 aged-ink label */
- `--color-rule`       rgba hairline, ink @ 16%
- `--color-brass`      oklch(59.7% 0.109 88.4)   /* #9A7B23 decorative foil only */
- `--color-brass-ink`  oklch(48.4% 0.092 85.5)   /* #765A12 small-text brass */
- `--color-brass-foil` oklch(73.0% 0.114 85.6)   /* #C8A24B highlight */
- `--color-ledger-green` oklch(47.5% 0.080 159.3) /* #2E6A4C deposits */
- `--color-ledger-red`   oklch(45.1% 0.149 28.6)  /* #97271F withdrawals */
- `--color-focus`      = brass

Dark (vault after hours) pairs exist for every token — see `tokens.css`
`.dark` block. Ink-vault interior #14120C, brass card #C8A24B.

**Brass discipline (invariant, from CLAUDE.md):** decorative `--brass` is never
a small-text color. Small text uses `--brass-ink` / `.accent-text`.
Accent saturation ≤ 5% of any viewport — brass appears as hairlines, seals,
chips, and the focus ring, never as fills.

## Typography

- Display: Inter, weight 700, style normal, tracking −0.025em (loaded via
  `next/font/google`, variable `--font-inter`)
- Body: Inter, weight 400/500 (same face)
- Figures/mono: IBM Plex Mono, weight 500/600, tabular-nums (via
  `next/font/google`, variable `--font-plex-mono`). This is the Vault's second
  voice — every number reads like a statement. `.num`, `.num-display`,
  `.chip-*`, ledger rows consume it.
- Italic headers are banned; emphasis = weight, brass-ink, or the foil rule.
- Type scale anchor: hero figure `--text-figure: clamp(4rem, 14vw, 11rem)`;
  display headline `--text-display: clamp(2.25rem, 4.5vw, 3.75rem)`.
  Hero worded headline ≤ 50 chars gets `--text-display`; longer caps at
  `--text-2xl`.

## Spacing

4-point named scale. The values are in `tokens.css`. Pages must use named
tokens (`var(--space-md)`) or Tailwind's default 4-pt utilities, never raw
magic values in new CSS.

## Motion

- Motion-cut project. No scroll reveals; no library.
- Easings: `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)` (already the track-fill
  ease), `--ease-in: cubic-bezier(0.7, 0, 0.84, 0)`,
  `--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)`.
- Durations: `--dur-short: 150ms` (state changes), `--dur-med: 220ms`,
  `--dur-long: 500ms` (track fills, hero figure tick).
- Animate `transform` and `opacity` only.
- Reveal pattern: hero figure number-tick ≤ 500ms (Stat-Led signature);
  everything else instant.
- Reduced-motion fallback: opacity-only, ≤ 150ms; number-tick renders final
  value immediately.

## Microinteractions stance

- Silent success; celebratory toasts never.
- Hover transitions 150ms; tooltip hover delay 800ms, focus delay 0ms.
- `:focus-visible` brass ring, 2px, offset 2px, appears instantly (never animated).
- Buttons: `:active` translates 0.5px — the engraved press.

## CTA voice

- Primary CTA: the ink "black card" — `.btn-primary`: ink fill, paper text,
  brass hairline, sharp `--radius` (0.25rem), 13px semibold, tracked +0.02em.
  Copy pattern: account verbs ("Open an account").
- Secondary CTA: engraved ghost outline — `.btn-ghost`.
- Tertiary: brass-underlined small-caps link (landing sign-in pattern).

## Per-page allowances

- Marketing pages MAY use enrichment: Tier-A hand-built CSS artifacts only
  (the statement ledger is the canonical artifact). No stock photography, no
  Lottie, no re-drawn browser/phone chrome.
- App pages MUST NOT use enrichment — function carries the page.
- Content pages: typography only.

## What pages MUST share

- The wordmark (`/nutrimind-mark.svg` + "NutriMind" / "Reserve account" lockup
  in the sticky header — owned by `app/layout.tsx`, not per page).
- The brass accent and its placement discipline (≤ 5% per viewport).
- Inter display/body + IBM Plex Mono figures.
- The CTA voice (button shape, radius, padding rhythm).
- Section label language: `.smallcaps` (11px tracked uppercase) stacked above
  its heading — never the tag-left/heading-right hanging header.
- Ledger semantics: deposits `ledger-green`, withdrawals `ledger-red`,
  balances in `.num`.

## What pages MAY differ on

- Macrostructure within the page-type family.
- Supporting-stat composition on marketing pages.
- Card/tab composition on app pages.

## Exports

Drop-in formats for re-using this design system in other projects.

### tokens.css

Canonical token file lives at `tokens.css` (project root) and is imported by
`app/globals.css`. See that file for the full set including dark pairs.

### Tailwind v4 `@theme`

Already wired in `app/globals.css` (`@theme inline` maps Tailwind color
utilities onto the Vault variables). `--font-sans` → Inter,
`--font-mono` → IBM Plex Mono, `--font-heading` → Inter.

### DTCG `tokens.json`

```json
{
  "color": {
    "paper":      { "$value": "oklch(93.5% 0.021 88.7)", "$type": "color" },
    "paper2":     { "$value": "oklch(89.5% 0.028 88.8)", "$type": "color" },
    "card":       { "$value": "oklch(97.9% 0.011 89.7)", "$type": "color" },
    "ink":        { "$value": "oklch(19.2% 0.014 87.5)", "$type": "color" },
    "ink2":       { "$value": "oklch(50.1% 0.041 91.2)", "$type": "color" },
    "brass":      { "$value": "oklch(59.7% 0.109 88.4)", "$type": "color" },
    "brassInk":   { "$value": "oklch(48.4% 0.092 85.5)", "$type": "color" },
    "brassFoil":  { "$value": "oklch(73.0% 0.114 85.6)", "$type": "color" },
    "ledgerGreen": { "$value": "oklch(47.5% 0.080 159.3)", "$type": "color" },
    "ledgerRed":  { "$value": "oklch(45.1% 0.149 28.6)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Inter", "$type": "fontFamily" },
    "body":    { "$value": "Inter", "$type": "fontFamily" },
    "figures": { "$value": "IBM Plex Mono", "$type": "fontFamily" }
  },
  "space": {
    "sm": { "$value": "1rem", "$type": "dimension" },
    "md": { "$value": "1.5rem", "$type": "dimension" },
    "lg": { "$value": "2rem", "$type": "dimension" },
    "xl": { "$value": "3rem", "$type": "dimension" }
  }
}
```

### shadcn/ui CSS variables

Already mapped in `app/globals.css` `:root` / `.dark` (`--background`,
`--foreground`, `--primary`, `--accent`, `--ring`, `--radius: 0.25rem`, …).
The Vault hex values remain the runtime source for shadcn variables; OKLCH
tokens in `tokens.css` are the portable canonical form.
