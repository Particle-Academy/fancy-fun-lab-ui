import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  FunLabProfileSummary,
  FunLabLeaderboard,
  FunLabAchievementGrid,
  FunLabXpFeed,
  FunLabLevelUp,
  FunLabLiveRegionProvider,
  feedItemFromEcho,
} from "./index";
import type { FunLabLeaderboardEntry, FunLabFeedItem } from "./types";

/*
 * No DOM library in this repo (as in fancy-mlm-ui), so these render on the
 * server and read the markup. Interaction, live-region timing, reduced motion
 * and RTL layout are checked in a real headless browser before a release (see
 * AGENTS.md), not here.
 */
const html = (el: React.ReactElement) => renderToStaticMarkup(el);
const count = (s: string, needle: string) => s.split(needle).length - 1;

const profile = { id: 7, awardable_type: "App\\Models\\User", awardable_id: 7, is_opted_in: true, total_xp: 1500, achievement_count: 3, prize_count: 1 };
const metrics = [
  { slug: "combat", name: "Combat", total_xp: 150, current_level: 2, level_name: "Apprentice", current_level_xp: 100, next_level_xp: 200 },
  { slug: "crafting", name: "Crafting", total_xp: 999, current_level: 5, current_level_xp: 800, next_level_xp: null },
];

describe("FunLabProfileSummary", () => {
  it("shows totals and per-metric progress with stable handles", () => {
    const out = html(<FunLabProfileSummary profile={profile} metrics={metrics} locale="en" />);

    expect(out).toContain('data-fancy-fun-lab="profile-summary"');
    expect(out).toContain('data-fancy-fun-lab-profile-id="7"');
    expect(out).toContain('data-fancy-fun-lab-stat="total_xp"');
    expect(out).toContain('data-fancy-fun-lab-metric="combat"');
    expect(out).toContain('data-fancy-fun-lab-level="2"');
    expect(out).toContain('data-fancy-fun-lab-progress="50"');
    expect(out).toContain('<bdi dir="ltr">1,500</bdi>');
  });

  it("says progress in words, not only as a bar", () => {
    const out = html(<FunLabProfileSummary profile={profile} metrics={metrics} locale="en" />);

    expect(out).toContain('<bdi dir="ltr">50</bdi> of <bdi dir="ltr">100</bdi> XP to level <bdi dir="ltr">3</bdi>');
    expect(out).toContain('aria-valuetext="50 of 100 XP to level 3"');
    expect(out).toContain("Top level reached");
  });

  it("takes translated labels", () => {
    const out = html(
      <FunLabProfileSummary profile={profile} metrics={metrics} locale="fr" labels={{ totalXp: "XP totale", maxLevel: "Niveau maximal" }} />,
    );
    expect(out).toContain("XP totale");
    expect(out).toContain("Niveau maximal");
    // French groups with a narrow no-break space (U+202F).
    expect(out).toContain(`<bdi dir="ltr">1${String.fromCharCode(0x202f)}500</bdi>`);
  });

  it("marks the selected metric when the host drives selection", () => {
    const out = html(<FunLabProfileSummary profile={profile} metrics={metrics} selectedMetric="crafting" onSelectMetric={() => {}} />);
    expect(out).toContain('data-fancy-fun-lab-selected-metric="crafting"');
    expect(count(out, 'aria-pressed="true"')).toBe(1);
  });
});

const entries: FunLabLeaderboardEntry[] = [
  { rank: 1, id: 11, awardable_type: "user", awardable_id: 11, total_xp: 900, achievement_count: 1, prize_count: 0, metric: { slug: "combat", total_xp: 300, current_level: 3 } },
  { rank: 2, id: 7, awardable_type: "user", awardable_id: 7, total_xp: 1500, achievement_count: 3, prize_count: 1, metric: { slug: "combat", total_xp: 150, current_level: 2 } },
];

describe("FunLabLeaderboard", () => {
  const board = (extra: Partial<React.ComponentProps<typeof FunLabLeaderboard>> = {}) =>
    html(
      <FunLabLeaderboard
        entries={entries}
        by="xp"
        metric="combat"
        period="weekly"
        page={1}
        lastPage={3}
        names={{ "11": "Ada", "7": "Bo" }}
        currentProfileId={7}
        locale="en"
        {...extra}
      />,
    );

  it("mirrors its controlled state on the root", () => {
    const out = board();
    expect(out).toContain('data-fancy-fun-lab="leaderboard"');
    expect(out).toContain('data-fancy-fun-lab-by="xp"');
    expect(out).toContain('data-fancy-fun-lab-metric="combat"');
    expect(out).toContain('data-fancy-fun-lab-period="weekly"');
    expect(out).toContain('data-fancy-fun-lab-page="1"');
  });

  it("is a real table: column headers and a row header per entry", () => {
    const out = board();
    expect(out).toContain("<table");
    expect(count(out, 'scope="col"')).toBe(4);
    expect(count(out, 'scope="row"')).toBe(2);
    // react-fancy's Table cannot take a <caption> (only Head/Body go inside
    // <table>), so the board is a region named by its visible heading.
    expect(out).toContain('role="region"');
    expect(out).toMatch(/aria-labelledby="[^"]+"/);
    expect(out).toContain("Leaderboard");
  });

  it("gives every row a handle and ranks on the metric's XP", () => {
    const out = board();
    expect(out).toContain('data-fancy-fun-lab-entry-id="11"');
    expect(out).toContain('data-fancy-fun-lab-rank="1"');
    expect(out).toContain('data-fancy-fun-lab-score="300"');
    expect(out).toContain('data-fancy-fun-lab-score="150"');
    expect(out).toContain("Ada");
  });

  it("marks the viewer's own row in text and in ARIA, not only in colour", () => {
    const out = board();
    expect(count(out, 'aria-current="true"')).toBe(1);
    expect(out).toContain("(You)");
  });

  it("shows controls only when the host can change them", () => {
    expect(board()).not.toContain('data-fancy-fun-lab-control="by"');
    const out = board({ onByChange: () => {}, onPeriodChange: () => {}, onMetricChange: () => {}, metrics: [{ slug: "combat", name: "Combat" }] });
    expect(out).toContain('data-fancy-fun-lab-control="by"');
    expect(out).toContain('data-fancy-fun-lab-control="period"');
    expect(out).toContain('data-fancy-fun-lab-control="metric"');
  });

  it("pages only when the host can page", () => {
    expect(board()).not.toContain('data-fancy-fun-lab-control="page"');
    expect(board({ onPageChange: () => {} })).toContain('data-fancy-fun-lab-control="page"');
  });

  it("says so when the board is empty", () => {
    const out = board({ entries: [] });
    expect(out).toContain("No one on this board yet.");
  });
});

describe("FunLabAchievementGrid", () => {
  const achievements = [
    { id: 1, slug: "first", name: "First steps", description: "Earn any XP" },
    { id: 2, slug: "adept", name: "Adept" },
  ];

  it("says earned or locked in text and gives each tile a handle", () => {
    const out = html(<FunLabAchievementGrid achievements={achievements} earned={["first"]} />);
    expect(out).toContain('data-fancy-fun-lab="achievement-grid"');
    expect(out).toContain('data-fancy-fun-lab-achievement="first"');
    expect(out).toContain('data-fancy-fun-lab-earned="true"');
    expect(out).toContain('data-fancy-fun-lab-earned="false"');
    expect(out).toContain("Earned");
    expect(out).toContain("Locked");
    expect(out).toContain('role="list"');
    expect(count(out, 'role="listitem"')).toBe(2);
  });

  it("filters under host control", () => {
    const out = html(<FunLabAchievementGrid achievements={achievements} earned={["first"]} filter="locked" />);
    expect(out).not.toContain('data-fancy-fun-lab-achievement="first"');
    expect(out).toContain('data-fancy-fun-lab-achievement="adept"');
    expect(out).toContain('data-fancy-fun-lab-filter="locked"');
  });
});

describe("FunLabXpFeed", () => {
  const items: FunLabFeedItem[] = [
    feedItemFromEcho("metric.level-reached", {
      profile_id: 7, gamed_metric_id: 3, gamed_metric_slug: "combat", gamed_metric_name: "Combat", level: 2, level_name: "Apprentice",
      xp_threshold: 100, total_xp: 150, achievements: [{ id: 2, slug: "adept", name: "Adept" }], occurred_at: "2026-11-05T12:00:00Z",
    })!,
    feedItemFromEcho("xp.awarded", {
      profile_id: 7, gamed_metric_id: 3, gamed_metric_slug: "combat", gamed_metric_name: "Combat", amount: 50, total_xp: 150,
      current_level: 2, occurred_at: "2026-11-05T11:59:00Z",
    })!,
  ];

  it("lists awards and levels with handles, in the order given", () => {
    const out = html(<FunLabXpFeed items={items} locale="en" />);
    expect(out).toContain('data-fancy-fun-lab="xp-feed"');
    expect(out).toContain("<ol");
    expect(out.indexOf('data-fancy-fun-lab-feed-type="metric.level-reached"')).toBeLessThan(out.indexOf('data-fancy-fun-lab-feed-type="xp.awarded"'));
    expect(out).toContain('<bdi dir="ltr">+50</bdi> XP in Combat');
    expect(out).toContain("Adept");
    expect(out).toContain('dateTime="2026-11-05T11:59:00Z"');
  });

  it("renders its own polite live region when no provider is present", () => {
    const out = html(<FunLabXpFeed items={items} />);
    expect(out).toContain('role="status"');
    expect(out).toContain('aria-live="polite"');
  });

  it("uses the shared region under a provider instead of adding another", () => {
    const out = html(
      <FunLabLiveRegionProvider>
        <FunLabXpFeed items={items} />
        <FunLabLevelUp event={null} />
      </FunLabLiveRegionProvider>,
    );
    expect(count(out, 'aria-live="polite"')).toBe(1);
  });

  it("caps the list at max", () => {
    const out = html(<FunLabXpFeed items={items} max={1} />);
    expect(count(out, "data-fancy-fun-lab-feed-id=")).toBe(1);
  });
});

describe("FunLabLevelUp", () => {
  const event = {
    profile_id: 7, gamed_metric_id: 3, gamed_metric_slug: "combat", gamed_metric_name: "Combat", level: 3, level_name: "Adept",
    xp_threshold: 200, total_xp: 250, achievements: [{ id: 2, slug: "adept", name: "Adept badge" }], occurred_at: "2026-11-05T12:00:00Z",
  };

  it("renders nothing visible without an event", () => {
    const out = html(<FunLabLevelUp event={null} announce={false} />);
    expect(out).toBe("");
  });

  it("announces the level and what it unlocked, with handles", () => {
    const out = html(<FunLabLevelUp event={event} onDismiss={() => {}} locale="en" announce={false} />);
    expect(out).toContain('data-fancy-fun-lab="level-up"');
    expect(out).toContain('data-fancy-fun-lab-metric="combat"');
    expect(out).toContain('data-fancy-fun-lab-level="3"');
    expect(out).toContain('role="group"');
    expect(out).toContain("Level up");
    expect(out).toContain("Adept badge");
    expect(out).toContain('data-fancy-fun-lab-control="dismiss"');
  });

  it("only celebrates through a class the stylesheet gates on prefers-reduced-motion", () => {
    expect(html(<FunLabLevelUp event={event} announce={false} />)).toContain("fancy-fun-lab-levelup--celebrate");
    expect(html(<FunLabLevelUp event={event} celebrate={false} announce={false} />)).not.toContain("fancy-fun-lab-levelup--celebrate");
  });
});
