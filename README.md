# @particle-academy/fancy-fun-lab-ui

React surfaces for [Laravel Fun Lab](https://github.com/Particle-Academy/laravel-fun-lab):

- **`FunLabProfileSummary`**: total XP, achievements and prizes, and each gamed metric's level and progress to the next
- **`FunLabLeaderboard`**: by XP, achievements or prizes, overall or for one gamed metric, over a period, a page at a time
- **`FunLabAchievementGrid`**: earned and locked achievements, filterable
- **`FunLabXpFeed`**: a running list fed by the `xp.awarded` and `metric.level-reached` broadcasts
- **`FunLabLevelUp`**: a level-up announcement

Built entirely from [react-fancy](https://github.com/Particle-Academy/react-fancy) components. Every component is controlled, and takes the shapes the Fun Lab REST API (`api/lfl`) and its broadcasts already emit, so a response goes straight in.

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

Peers: `@particle-academy/react-fancy >=6.9.0 <7.0.0`, React 19, Tailwind v4. Node 22 or newer to build.

## A leaderboard for one XP type

```tsx
import { useEffect, useState } from "react";
import { FunLabLeaderboard, createFunLabClient, type FunLabLeaderboardPage } from "@particle-academy/fancy-fun-lab-ui";

const lfl = createFunLabClient({ baseUrl: "/api/lfl", headers: () => ({ "X-XSRF-TOKEN": readXsrf() }) });

export function CombatBoard({ me }: { me: number }) {
  const [state, setState] = useState({ by: "xp" as const, metric: "combat-xp" as string | null, period: "weekly" as const, page: 1 });
  const [data, setData] = useState<FunLabLeaderboardPage | null>(null);

  useEffect(() => {
    lfl.leaderboard("App\\Models\\User", { ...state, perPage: 10 }).then(setData);
  }, [state]);

  return (
    <FunLabLeaderboard
      entries={data?.data ?? []}
      lastPage={data?.meta.last_page ?? 1}
      {...state}
      onByChange={(by) => setState((s) => ({ ...s, by, page: 1 }))}
      onMetricChange={(metric) => setState((s) => ({ ...s, metric, page: 1 }))}
      onPeriodChange={(period) => setState((s) => ({ ...s, period, page: 1 }))}
      onPageChange={(page) => setState((s) => ({ ...s, page }))}
      metrics={[{ slug: "combat-xp", name: "Combat" }, { slug: "crafting-xp", name: "Crafting" }]}
      currentProfileId={me}
    />
  );
}
```

`?metric=` needs laravel-fun-lab with per-metric leaderboards (the release after 0.6.0). On older servers, leave `metric` null.

## Live XP and level-ups

```tsx
import { FunLabLiveRegionProvider, FunLabXpFeed, FunLabLevelUp, feedItemFromEcho, mergeFeed } from "@particle-academy/fancy-fun-lab-ui";

const [feed, setFeed] = useState<FunLabFeedItem[]>([]);
const [levelUp, setLevelUp] = useState<FunLabLevelReached | null>(null);

useEffect(() => {
  const channel = Echo.private(`lfl.profile.App.Models.User.${userId}`);
  const add = (event: string) => (payload: unknown) => {
    const item = feedItemFromEcho(event, payload);
    if (item) setFeed((f) => mergeFeed(f, item));
  };
  channel.listen(".xp.awarded", add(".xp.awarded"));
  channel.listen(".metric.level-reached", (p: FunLabLevelReached) => {
    add(".metric.level-reached")(p);
    setLevelUp(p);
  });
  return () => Echo.leave(`lfl.profile.App.Models.User.${userId}`);
}, [userId]);

<FunLabLiveRegionProvider>
  <FunLabLevelUp event={levelUp} onDismiss={() => setLevelUp(null)} announce={false} />
  <FunLabXpFeed items={feed} />
</FunLabLiveRegionProvider>;
```

The feed already speaks level rows, so the level-up card above has `announce={false}`.

## Accessibility

- **Announcements are polite and rate-limited.** New feed rows and level-ups are spoken through one `role="status"` region. The first is spoken at once; anything in the next two seconds is held and spoken as one summary ("9 new updates. Latest: …"). Rows present on first render are never spoken. Put one `FunLabLiveRegionProvider` near the root so every component shares the rate limit; without it, each component keeps its own region.
- **Nothing takes focus.** A level-up appears in place.
- **Tables are tables**: column headers, a row header per entry, and the region is named by its heading.
- **No colour-only meaning.** Ranks are numbers, the viewer's row says "(You)" and carries `aria-current`, achievements say "Earned" or "Locked", and progress is said in words beside every bar and as its `aria-valuetext`.
- **Right-to-left**: layout is logical, so it mirrors under `dir="rtl"`. Numbers stay left-to-right, isolated in `<bdi dir="ltr">`; a signed number written `{+amount}` keeps its sign inside the isolate. In Arabic-script languages the stat captions drop the letter-spacing and monospace face that would break their joins.
- **Reduced motion**: the level-up celebration only runs under `prefers-reduced-motion: no-preference`.

## Translation

Every string is a label, passed as plain JSON. A label is a template with `{name}` placeholders, or one template per CLDR plural category:

```tsx
<FunLabXpFeed
  items={feed}
  locale="ar"
  labels={{
    xpAwarded: "{+amount} نقطة خبرة في {metric}",
    burst: { one: "تحديث جديد واحد", two: "تحديثان جديدان", few: "{count} تحديثات جديدة", many: "{count} تحديثًا جديدًا", other: "{count} تحديث جديد" },
  }}
/>
```

Numbers and plurals follow `locale` through `Intl`. See `defaultLabels` for every key.

## Human+

Every component is controlled, and its state is mirrored on the root as `data-fancy-fun-lab-*` attributes (`-by`, `-metric`, `-period`, `-page`, `-filter`, `-selected-metric`). Every row and tile carries a handle (`-entry-id`, `-rank`, `-score`, `-achievement`, `-earned`, `-feed-id`, `-feed-type`), and every control sits in a `data-fancy-fun-lab-control` wrapper. Inputs are JSON, so an agent can render them, read them back from the DOM and drive the same props a person does.

## Data you assemble yourself

`FunLabProfileSummary`'s per-metric rows (`FunLabMetricProgress`) need a profile's XP and level in each metric, which the REST API does not return in one call. `metricProgressFromLevels(metric, { total_xp, current_level }, levels)` builds a row from `GET /metric-levels/{metric}` and your own `ProfileMetric` data.

## License

MIT
