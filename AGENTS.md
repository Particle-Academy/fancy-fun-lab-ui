# fancy-fun-lab-ui

React surfaces for `particle-academy/laravel-fun-lab`. This file describes this
repo's code. Process (publishing, versions, changelog rules) lives in the
envelope's `RULES.md`.

## Layout

- `src/types.ts`: data shapes. **snake_case on purpose**: they are the REST
  (`api/lfl`) and broadcast payloads as laravel-fun-lab emits them. Do not
  camelCase them; a host passes responses straight in.
- `src/model.ts`: pure helpers (`levelProgress`, `scoreFor`,
  `feedItemFromEcho`, `mergeFeed`, `metricProgressFromLevels`).
- `src/format.ts`: `{name}` / `{+name}` templates, plurals, LTR-isolated numbers.
- `src/labels.ts`: every string, with English defaults.
- `src/announcer.ts` + `src/LiveRegion.tsx`: the rate-limited polite live region.
- `src/client.ts`: a fetch-only, read-only client. No dependency, no cache.
- One file per component.

## Invariants

- **Built only from react-fancy.** If a primitive is missing, that is a finding
  against react-fancy, not a reason to hand-roll one here.
- **Every number rendered in text goes through `interpolateNodes` / `ltrNumber`**,
  so it is isolated left-to-right. A signed number is `{+name}`, never a literal
  `+` in a template: outside the isolate, the bidi algorithm moves it to the far
  side in RTL.
- **Announcements only through `useFunLabAnnounce`**, never a second
  `aria-live` region, or a provider can no longer rate-limit the page.
- **A live region must be mounted before its text changes**, so `FunLabLevelUp`
  keeps its region mounted while `event` is null.
- **Rows present on first render are never announced** (`XpFeed`'s `seen` ref).
- **Regexes are single-pass and linear.** No `[...]+$` trims (quadratic on a long
  run); trim with a loop.
- `styles.css` is unlayered and uses logical properties only.

## Tests

`npm test`: vitest, server-rendered markup (`renderToStaticMarkup`) and pure
logic. There is no DOM library here, by design (same as fancy-mlm-ui).

What markup cannot show is checked in headless Chromium before a release:
every component in `dir="ltr"` and `dir="rtl"` (with Arabic labels and
`lang="ar"`), controls round-tripping through host state, a burst of ten
awards spoken as two utterances, a level-up not taking focus, the celebration
off under `prefers-reduced-motion: reduce`, a clean console, and a positive
control proving the console collector catches a planted error. Build the
package first and bundle against `dist`, as a consumer gets it.
