# Changelog

Notable changes to `@particle-academy/fancy-fun-lab-ui`.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

**BREAKING** marks anything that can stop working on upgrade. This package is
pre-1.0, so breaking changes land in MINOR releases. Read those entries before
upgrading.

---

## [Unreleased]

## [0.1.0] - 2026-11-05

### Added

- **First release.** React surfaces for laravel-fun-lab, built only from react-fancy:
  - `FunLabProfileSummary`: total XP, achievements and prizes, and each gamed metric's level and progress, said in words and as `aria-valuetext`. Metric selection is controlled (`selectedMetric` / `onSelectMetric`).
  - `FunLabLeaderboard`: by XP, achievements or prizes, overall or for one gamed metric, over a period, paged. `by`, `metric`, `period` and `page` are controlled; each control shows only when its handler is set. A real table, with column headers and a row header per entry. The viewer's row says "(You)" and carries `aria-current`.
  - `FunLabAchievementGrid`: earned and locked tiles, each saying which in words, with a controlled `filter`.
  - `FunLabXpFeed`: rows from the `xp.awarded` and `metric.level-reached` broadcasts; `feedItemFromEcho` and `mergeFeed` build and de-duplicate them.
  - `FunLabLevelUp`: a level-up card that never takes focus; its celebration runs only under `prefers-reduced-motion: no-preference`.
  - `FunLabLiveRegionProvider` / `useFunLabAnnounce`: one polite live region, rate-limited so a burst is one summary.
  - `createFunLabClient`: a fetch-only, read-only client for `api/lfl`, with host-supplied base URL and headers.
  - Pure helpers `levelProgress`, `metricProgressFromLevels`, `scoreFor`, `interpolate`, `interpolateNodes`, `pickPlural`, `formatNumber`, `createAnnouncer`; `defaultLabels`.
- **Every string is a JSON label**, a `{name}` template or one per CLDR plural category; numbers and plurals follow `locale`. Numbers render left-to-right inside right-to-left text, and `{+name}` keeps a sign with its number.
- `data-fancy-fun-lab-*` handles on every root, row, tile and control.
- Peers: `@particle-academy/react-fancy >=6.9.0 <7.0.0`, React 19, Tailwind v4. Node 22 or newer.
- **Per-metric leaderboards need laravel-fun-lab's `?metric=`**, in its release after 0.6.0. On an older server, leave `metric` null.
