import type {
  FunLabFeedItem,
  FunLabLeaderboardBy,
  FunLabLeaderboardEntry,
  FunLabLevelReached,
  FunLabMetric,
  FunLabMetricLevel,
  FunLabMetricProgress,
  FunLabXpAwarded,
} from "./types";

export interface FunLabLevelProgress {
  /** 0..100, rounded. */
  pct: number;
  /** XP earned since the current level began. */
  into: number;
  /** XP the current level spans. */
  needed: number;
  /** XP still to go. */
  remaining: number;
  /** The next level's number, or null at the top. */
  nextLevel: number | null;
  atMax: boolean;
}

/** Progress through the current level of one metric. */
export function levelProgress(m: FunLabMetricProgress): FunLabLevelProgress {
  const from = m.current_level_xp ?? 0;
  const to = m.next_level_xp;
  if (to === null || to === undefined || to <= from) {
    return { pct: 100, into: 0, needed: 0, remaining: 0, nextLevel: null, atMax: true };
  }
  const needed = to - from;
  const into = Math.max(0, Math.min(needed, m.total_xp - from));
  return {
    pct: Math.round((into / needed) * 100),
    into,
    needed,
    remaining: needed - into,
    nextLevel: m.current_level + 1,
    atMax: false,
  };
}

/**
 * Build a `FunLabMetricProgress` from a metric, a profile's XP and level in
 * it, and the metric's levels as `GET /metric-levels/{metric}` returns them.
 */
export function metricProgressFromLevels(
  metric: FunLabMetric,
  standing: { total_xp: number; current_level: number },
  levels: FunLabMetricLevel[],
): FunLabMetricProgress {
  const sorted = [...levels].sort((a, b) => a.level - b.level);
  const current = sorted.find((l) => l.level === standing.current_level);
  const next = sorted.find((l) => l.level > standing.current_level);
  return {
    slug: metric.slug,
    name: metric.name,
    total_xp: standing.total_xp,
    current_level: standing.current_level,
    level_name: current?.name ?? null,
    current_level_xp: current?.xp_threshold ?? 0,
    next_level_xp: next?.xp_threshold ?? null,
  };
}

/**
 * The figure an entry is ranked on: the period score on a period board, else
 * the metric's XP on a metric board, else the profile total; or the count for
 * `achievements` / `prizes`.
 */
export function scoreFor(entry: FunLabLeaderboardEntry, by: FunLabLeaderboardBy): number {
  if (by === "achievements") return entry.achievement_count;
  if (by === "prizes") return entry.prize_count;
  return entry.period_xp ?? entry.metric?.total_xp ?? entry.total_xp;
}

/**
 * Turn an Echo event into a feed item, or null for an event the feed does not
 * show. Accepts `.xp.awarded` (as passed to Echo's `listen`) or `xp.awarded`.
 *
 * The id is stable per award and per level: an award is identified by the
 * metric's running total after it (which only grows), a level by its number
 * (announced once). A redelivered broadcast therefore maps to the same row.
 */
export function feedItemFromEcho(event: string, payload: unknown): FunLabFeedItem | null {
  const name = event.startsWith(".") ? event.slice(1) : event;
  if (payload === null || typeof payload !== "object") return null;
  if (name === "xp.awarded") {
    const p = payload as FunLabXpAwarded;
    return { ...p, type: "xp.awarded", id: `xp:${p.profile_id}:${p.gamed_metric_id}:${p.total_xp}` };
  }
  if (name === "metric.level-reached") {
    const p = payload as FunLabLevelReached;
    return { ...p, type: "metric.level-reached", id: `level:${p.profile_id}:${p.gamed_metric_id}:${p.level}` };
  }
  return null;
}

/** Prepend `item` to `items`, dropping an existing row with the same id, keeping at most `max`. */
export function mergeFeed(items: FunLabFeedItem[], item: FunLabFeedItem, max = 50): FunLabFeedItem[] {
  return [item, ...items.filter((i) => i.id !== item.id)].slice(0, max);
}
