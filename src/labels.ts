import type { ReactNode } from "react";
import { interpolate, interpolateNodes, pickPlural, type FunLabLabel, type FunLabValues } from "./format";

/**
 * Every visible or spoken string. English defaults; pass a partial object to
 * translate. Plain JSON: a template with `{name}` placeholders, or one per
 * plural category (`{ one: "...", other: "..." }`). A number placeholder is
 * rendered isolated left-to-right; write `{+name}` for a signed number, so the
 * sign is inside the isolate rather than a separate character the bidi
 * algorithm can move to the far side in a right-to-left page.
 */
export interface FunLabLabels {
  totalXp: FunLabLabel;
  achievements: FunLabLabel;
  prizes: FunLabLabel;
  /** `{level}` */
  level: FunLabLabel;
  /** `{into}`, `{needed}`, `{next}`, `{remaining}` */
  progressToNext: FunLabLabel;
  maxLevel: FunLabLabel;
  /** Accessible name of a metric's progress bar. `{metric}` */
  progressOf: FunLabLabel;

  leaderboard: FunLabLabel;
  rank: FunLabLabel;
  name: FunLabLabel;
  score: FunLabLabel;
  levelColumn: FunLabLabel;
  rankBy: FunLabLabel;
  byXp: FunLabLabel;
  byAchievements: FunLabLabel;
  byPrizes: FunLabLabel;
  period: FunLabLabel;
  periodDaily: FunLabLabel;
  periodWeekly: FunLabLabel;
  periodMonthly: FunLabLabel;
  periodAllTime: FunLabLabel;
  metric: FunLabLabel;
  allMetrics: FunLabLabel;
  you: FunLabLabel;
  /** Shown for an entry the host gave no name for. `{id}` */
  unnamed: FunLabLabel;
  emptyBoard: FunLabLabel;
  /** Caption. `{page}`, `{pages}` */
  pageOf: FunLabLabel;

  earned: FunLabLabel;
  locked: FunLabLabel;
  filter: FunLabLabel;
  filterAll: FunLabLabel;
  filterEarned: FunLabLabel;
  filterLocked: FunLabLabel;
  noAchievements: FunLabLabel;

  feed: FunLabLabel;
  feedEmpty: FunLabLabel;
  /** `{amount}` (or `{+amount}`, signed), `{metric}`, `{total}` — plural on `amount` */
  xpAwarded: FunLabLabel;
  /** `{level}`, `{metric}`, `{name}` (the level's name, may be empty) */
  levelReached: FunLabLabel;
  /** `{achievements}` (comma-separated names) — plural on the count */
  unlocked: FunLabLabel;
  /** Accessible name of the list of what a level unlocked — plural on the count */
  unlockedList: FunLabLabel;
  /** A held burst, spoken once. `{count}`, `{latest}` — plural on `count` */
  burst: FunLabLabel;

  levelUp: FunLabLabel;
  dismiss: FunLabLabel;
}

export const defaultLabels: FunLabLabels = {
  totalXp: "Total XP",
  achievements: "Achievements",
  prizes: "Prizes",
  level: "Level {level}",
  progressToNext: "{into} of {needed} XP to level {next}",
  maxLevel: "Top level reached",
  progressOf: "{metric} progress",

  leaderboard: "Leaderboard",
  rank: "Rank",
  name: "Name",
  score: "Score",
  levelColumn: "Level",
  rankBy: "Rank by",
  byXp: "XP",
  byAchievements: "Achievements",
  byPrizes: "Prizes",
  period: "Period",
  periodDaily: "Today",
  periodWeekly: "This week",
  periodMonthly: "This month",
  periodAllTime: "All time",
  metric: "XP type",
  allMetrics: "All XP",
  you: "You",
  unnamed: "Player {id}",
  emptyBoard: "No one on this board yet.",
  pageOf: "Page {page} of {pages}",

  earned: "Earned",
  locked: "Locked",
  filter: "Show",
  filterAll: "All",
  filterEarned: "Earned",
  filterLocked: "Locked",
  noAchievements: "No achievements to show.",

  feed: "Recent XP",
  feedEmpty: "No XP yet.",
  xpAwarded: "{+amount} XP in {metric}",
  levelReached: "Level {level} in {metric}",
  unlocked: "Unlocked: {achievements}",
  unlockedList: { one: "Achievement unlocked", other: "Achievements unlocked" },
  burst: { one: "{count} new update. Latest: {latest}", other: "{count} new updates. Latest: {latest}" },

  levelUp: "Level up",
  dismiss: "Dismiss",
};

export function mergeLabels(labels?: Partial<FunLabLabels>): FunLabLabels {
  return labels ? { ...defaultLabels, ...labels } : defaultLabels;
}

/** A translator bound to labels and a locale: `text` for strings, `nodes` for JSX with LTR-isolated numbers. */
export function translator(labels: FunLabLabels, locale?: string) {
  return {
    text: (key: keyof FunLabLabels, values: FunLabValues = {}, count = 0) =>
      interpolate(pickPlural(labels[key], count, locale), values, locale),
    nodes: (key: keyof FunLabLabels, values: FunLabValues = {}, count = 0): ReactNode[] =>
      interpolateNodes(pickPlural(labels[key], count, locale), values, locale),
  };
}
