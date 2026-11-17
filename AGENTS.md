# Using @particle-academy/fancy-fun-lab-ui — guide for agents

How an agent installs and uses this package in a consumer app. What the package
is, is in [README.md](./README.md). Notes for working ON this repo's code are in
[CONTRIBUTING.md](./CONTRIBUTING.md).

## Install

```bash
npm install @particle-academy/fancy-fun-lab-ui @particle-academy/react-fancy
```

```css
/* app.css (Tailwind v4) */
@import "tailwindcss";
@import "@particle-academy/react-fancy/styles.css";
@import "@particle-academy/fancy-fun-lab-ui/styles.css";
@source "../node_modules/@particle-academy/react-fancy/dist";
@source "../node_modules/@particle-academy/fancy-fun-lab-ui/dist";
```

- **Peers:** `@particle-academy/react-fancy >=6.9.0 <7.0.0`, React 19, Tailwind v4.
- **Node:** `>=22` to build.
- The backend is the Composer package `particle-academy/laravel-fun-lab`; these
  components take its REST (`api/lfl`) and broadcast payloads as-is.

## Find it on the Fancy MCP server

The catalog server is `https://ui.particle.academy/mcp` (streamable HTTP, no API
key; MCP id `fancy-ui`). Registry entries for this package:

| Slug | Component |
|---|---|
| `fancy-fun-lab-ui` | The package itself |
| `fun-lab-profile-summary` | `FunLabProfileSummary` |
| `fun-lab-leaderboard` | `FunLabLeaderboard` |
| `fun-lab-achievement-grid` | `FunLabAchievementGrid` |
| `fun-lab-xp-feed` | `FunLabXpFeed` |
| `fun-lab-level-up` | `FunLabLevelUp` |

Use `search-components` ("leaderboard", "achievements") and
`install-instructions` with a slug. These are package entries; install the npm
package.

## API essentials

- **Client:** `createFunLabClient({ baseUrl: "/api/lfl", headers })` is a
  fetch-only, read-only client: `leaderboard(type, query)`, `profile(type, id)`,
  `meProfile()`, `meAchievements()`, `achievements()`, `gamedMetrics()`,
  `metricLevels(metric)`.
- **Controlled components.** `FunLabLeaderboard` takes `by`, `metric`,
  `period`, `page` with `onByChange` / `onMetricChange` / `onPeriodChange` /
  `onPageChange`; hold that state in the app.
- **Live updates:** turn Echo events into feed items with
  `feedItemFromEcho(event, payload)` and `mergeFeed(feed, item)`; listen for
  `.xp.awarded` and `.metric.level-reached` on
  `lfl.profile.<type>.<id>`.
- **Announcements:** put one `FunLabLiveRegionProvider` near the root so every
  component shares one rate-limited polite live region.
- **Per-metric rows** for `FunLabProfileSummary`:
  `metricProgressFromLevels(metric, { total_xp, current_level }, levels)`.
- **Labels:** every string is a JSON label (`{name}` templates or CLDR plural
  maps), with `locale` driving `Intl`. `defaultLabels` lists every key.
- **Stable handles:** state is mirrored on the root as `data-fancy-fun-lab-*`
  (`-by`, `-metric`, `-period`, `-page`, `-filter`, `-selected-metric`); rows and
  tiles carry `-entry-id`, `-rank`, `-score`, `-achievement`, `-earned`,
  `-feed-id`, `-feed-type`; every control sits in a
  `data-fancy-fun-lab-control` wrapper.

## Traps

- **Payloads stay snake_case.** Pass API and broadcast responses straight in; do
  not camelCase them.
- **Missing `@source` lines** leave the components unstyled.
- `metric` on the leaderboard needs a laravel-fun-lab release with per-metric
  leaderboards (after 0.6.0). On older servers leave `metric` null.
- The XP feed already announces level rows; give `FunLabLevelUp`
  `announce={false}` when both are on the page.
- Write a signed number as `{+name}` in a label, never a literal `+`, or RTL
  layouts move the sign.
- Rows present on first render are never announced, and nothing takes focus.
