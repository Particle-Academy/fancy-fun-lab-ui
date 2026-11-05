/*
 * Data shapes. Field names are snake_case on purpose: they are the shapes
 * laravel-fun-lab's REST API (`api/lfl`) and its broadcasts already emit, so a
 * host passes a response straight through without mapping it.
 */

/** `GET /profiles/{type}/{id}`, `GET /me/profile` (`data`). */
export interface FunLabProfile {
  id: number;
  awardable_type: string;
  awardable_id: number | string;
  is_opted_in: boolean;
  total_xp: number;
  achievement_count: number;
  prize_count: number;
  last_activity_at?: string | null;
}

/**
 * One gamed metric (an "XP type") for one profile, with the thresholds needed
 * to draw progress. The REST API has no endpoint that returns this in one call
 * yet; a host assembles it from its own `ProfileMetric` rows and
 * `GET /metric-levels/{metric}` (see `metricProgressFromLevels`).
 */
export interface FunLabMetricProgress {
  slug: string;
  name: string;
  total_xp: number;
  current_level: number;
  /** Name of the current level, if levels are named. */
  level_name?: string | null;
  /** XP at which the current level began. Default 0. */
  current_level_xp?: number | null;
  /** XP at which the next level begins; null or absent at the top level. */
  next_level_xp?: number | null;
}

/** `GET /metric-levels/{metric}` (`data[]`). */
export interface FunLabMetricLevel {
  level: number;
  xp_threshold: number;
  name?: string | null;
  gamed_metric_slug?: string | null;
}

/** `GET /gamed-metrics` (`data[]`), or any `{ slug, name }`. */
export interface FunLabMetric {
  slug: string;
  name: string;
}

export type FunLabLeaderboardBy = "xp" | "achievements" | "prizes";
export type FunLabLeaderboardPeriod = "daily" | "weekly" | "monthly" | "all-time";

/** `GET /leaderboards/{type}` (`data[]`). */
export interface FunLabLeaderboardEntry {
  rank: number | null;
  id: number;
  awardable_type: string;
  awardable_id: number | string;
  total_xp: number;
  achievement_count: number;
  prize_count: number;
  last_activity_at?: string | null;
  /** Present when the board is ranked on one gamed metric (`?metric=`). */
  metric?: { slug: string; total_xp: number; current_level: number };
  /** Present on a daily, weekly or monthly board. */
  period_xp?: number;
}

/** `GET /leaderboards/{type}` (`meta`). */
export interface FunLabPageMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/** `GET /achievements` (`data[]`). */
export interface FunLabAchievement {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
}

/** The `xp.awarded` broadcast payload. */
export interface FunLabXpAwarded {
  profile_id: number;
  gamed_metric_id: number;
  gamed_metric_slug: string;
  gamed_metric_name: string;
  amount: number;
  total_xp: number;
  current_level: number;
  reason?: string | null;
  source?: string | null;
  occurred_at: string;
}

/** The `metric.level-reached` broadcast payload. */
export interface FunLabLevelReached {
  profile_id: number;
  gamed_metric_id: number;
  gamed_metric_slug: string;
  gamed_metric_name: string;
  level: number;
  level_name?: string | null;
  xp_threshold: number;
  total_xp: number;
  achievements: Array<{ id: number; slug: string; name: string; icon?: string | null }>;
  occurred_at: string;
}

/** One row of the XP feed: a broadcast payload tagged with its event name and a stable id. */
export type FunLabFeedItem =
  | ({ id: string; type: "xp.awarded" } & FunLabXpAwarded)
  | ({ id: string; type: "metric.level-reached" } & FunLabLevelReached);
