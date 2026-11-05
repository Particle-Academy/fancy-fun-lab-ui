import { describe, it, expect } from "vitest";
import { levelProgress, metricProgressFromLevels, scoreFor, feedItemFromEcho, mergeFeed } from "./model";
import type { FunLabLeaderboardEntry, FunLabXpAwarded, FunLabLevelReached } from "./types";

describe("levelProgress", () => {
  it("measures progress from the current level's threshold to the next", () => {
    expect(levelProgress({ slug: "c", name: "C", total_xp: 150, current_level: 2, current_level_xp: 100, next_level_xp: 200 })).toEqual({
      pct: 50,
      into: 50,
      needed: 100,
      remaining: 50,
      nextLevel: 3,
      atMax: false,
    });
  });

  it("reports the top level as complete", () => {
    const p = levelProgress({ slug: "c", name: "C", total_xp: 999, current_level: 5, current_level_xp: 400, next_level_xp: null });
    expect(p.atMax).toBe(true);
    expect(p.pct).toBe(100);
    expect(p.nextLevel).toBeNull();
  });

  it("clamps rather than overflowing when XP runs ahead of a stale level", () => {
    const p = levelProgress({ slug: "c", name: "C", total_xp: 500, current_level: 2, current_level_xp: 100, next_level_xp: 200 });
    expect(p.pct).toBe(100);
    expect(p.remaining).toBe(0);
  });
});

describe("metricProgressFromLevels", () => {
  it("derives thresholds from GET /metric-levels/{metric}", () => {
    const levels = [
      { level: 1, xp_threshold: 0, name: "Novice" },
      { level: 3, xp_threshold: 200, name: "Adept" },
      { level: 2, xp_threshold: 100, name: "Apprentice" },
    ];
    expect(metricProgressFromLevels({ slug: "c", name: "C" }, { total_xp: 150, current_level: 2 }, levels)).toEqual({
      slug: "c",
      name: "C",
      total_xp: 150,
      current_level: 2,
      level_name: "Apprentice",
      current_level_xp: 100,
      next_level_xp: 200,
    });
  });
});

const entry = (over: Partial<FunLabLeaderboardEntry> = {}): FunLabLeaderboardEntry => ({
  rank: 1,
  id: 1,
  awardable_type: "App\\Models\\User",
  awardable_id: 1,
  total_xp: 900,
  achievement_count: 4,
  prize_count: 2,
  ...over,
});

describe("scoreFor", () => {
  it("uses the period score, then the metric's XP, then the profile total", () => {
    expect(scoreFor(entry(), "xp")).toBe(900);
    expect(scoreFor(entry({ metric: { slug: "c", total_xp: 120, current_level: 2 } }), "xp")).toBe(120);
    expect(scoreFor(entry({ metric: { slug: "c", total_xp: 120, current_level: 2 }, period_xp: 40 }), "xp")).toBe(40);
  });

  it("uses the counts for achievements and prizes", () => {
    expect(scoreFor(entry(), "achievements")).toBe(4);
    expect(scoreFor(entry(), "prizes")).toBe(2);
  });
});

const xp = (total: number): FunLabXpAwarded => ({
  profile_id: 7,
  gamed_metric_id: 3,
  gamed_metric_slug: "combat",
  gamed_metric_name: "Combat",
  amount: 50,
  total_xp: total,
  current_level: 1,
  occurred_at: "2026-11-05T12:00:00Z",
});

const lvl = (level: number): FunLabLevelReached => ({
  profile_id: 7,
  gamed_metric_id: 3,
  gamed_metric_slug: "combat",
  gamed_metric_name: "Combat",
  level,
  xp_threshold: 100,
  total_xp: 150,
  achievements: [],
  occurred_at: "2026-11-05T12:00:00Z",
});

describe("feedItemFromEcho", () => {
  it("accepts Echo's dotted event name with or without the leading dot", () => {
    expect(feedItemFromEcho(".xp.awarded", xp(150))?.type).toBe("xp.awarded");
    expect(feedItemFromEcho("metric.level-reached", lvl(2))?.type).toBe("metric.level-reached");
    expect(feedItemFromEcho("prize.awarded", {})).toBeNull();
  });

  it("gives each award and each level a stable id, so a redelivery is the same row", () => {
    expect(feedItemFromEcho("xp.awarded", xp(150))?.id).toBe(feedItemFromEcho("xp.awarded", xp(150))?.id);
    expect(feedItemFromEcho("xp.awarded", xp(150))?.id).not.toBe(feedItemFromEcho("xp.awarded", xp(200))?.id);
    expect(feedItemFromEcho("metric.level-reached", lvl(2))?.id).not.toBe(feedItemFromEcho("metric.level-reached", lvl(3))?.id);
  });
});

describe("mergeFeed", () => {
  it("puts new items first, drops duplicates and caps the length", () => {
    const a = feedItemFromEcho("xp.awarded", xp(100))!;
    const b = feedItemFromEcho("xp.awarded", xp(150))!;
    const c = feedItemFromEcho("metric.level-reached", lvl(2))!;
    expect(mergeFeed([a], b).map((i) => i.id)).toEqual([b.id, a.id]);
    expect(mergeFeed([b, a], b)).toHaveLength(2);
    expect(mergeFeed([b, a], c, 2).map((i) => i.id)).toEqual([c.id, b.id]);
  });
});
