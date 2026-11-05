import { useId, useMemo } from "react";
import { cn, Badge, Card, Heading, MultiSwitch, Pagination, Select, Table, Text } from "@particle-academy/react-fancy";
import { ltrNumber } from "./format";
import { mergeLabels, translator, type FunLabLabels } from "./labels";
import { scoreFor } from "./model";
import type { FunLabLeaderboardBy, FunLabLeaderboardEntry, FunLabLeaderboardPeriod, FunLabMetric } from "./types";

export interface FunLabLeaderboardProps {
  /** One page of entries, as `GET /leaderboards/{type}` returns them (`data`). */
  entries: FunLabLeaderboardEntry[];
  /** What the board ranks on (controlled). Shown as a switch only when `onByChange` is set. */
  by?: FunLabLeaderboardBy;
  onByChange?: (by: FunLabLeaderboardBy) => void;
  /** The gamed metric slug ranked on, or null for all XP (controlled). */
  metric?: string | null;
  /** Metrics to offer in the metric picker. The picker shows when this and `onMetricChange` are set. */
  metrics?: FunLabMetric[];
  onMetricChange?: (metric: string | null) => void;
  /** Period (controlled). Shown as a picker only when `onPeriodChange` is set. */
  period?: FunLabLeaderboardPeriod;
  onPeriodChange?: (period: FunLabLeaderboardPeriod) => void;
  /** 1-based page (controlled), and the last page from `meta.last_page`. */
  page?: number;
  lastPage?: number;
  onPageChange?: (page: number) => void;
  /** Display names keyed by profile id (`entry.id`). The API carries ids only. */
  names?: Record<string, string>;
  /** The viewer's profile id; that row is marked in text and with `aria-current`. */
  currentProfileId?: number | null;
  /** Heading. Default from labels. */
  title?: string;
  locale?: string;
  labels?: Partial<FunLabLabels>;
  className?: string;
}

/**
 * A leaderboard by XP, achievements or prizes, overall or for one gamed metric,
 * over a period, a page at a time.
 *
 * Fully controlled: `by`, `metric`, `period` and `page` are props, mirrored as
 * `data-fancy-fun-lab-*` on the root, and each control sits in a
 * `data-fancy-fun-lab-control` wrapper. Each row carries its entry id, rank
 * and score. Rank is always a number in text, and the viewer's own row says so
 * in words, so nothing relies on colour.
 */
export function FunLabLeaderboard({
  entries,
  by = "xp",
  onByChange,
  metric = null,
  metrics,
  onMetricChange,
  period = "all-time",
  onPeriodChange,
  page = 1,
  lastPage = 1,
  onPageChange,
  names,
  currentProfileId = null,
  title,
  locale,
  labels,
  className,
}: FunLabLeaderboardProps) {
  const l = useMemo(() => mergeLabels(labels), [labels]);
  const t = translator(l, locale);
  const headingId = useId();
  const showLevel = metric !== null && metric !== "";

  const byList = [
    { value: "xp", label: t.text("byXp") },
    { value: "achievements", label: t.text("byAchievements") },
    { value: "prizes", label: t.text("byPrizes") },
  ];
  const periodList = [
    { value: "all-time", label: t.text("periodAllTime") },
    { value: "monthly", label: t.text("periodMonthly") },
    { value: "weekly", label: t.text("periodWeekly") },
    { value: "daily", label: t.text("periodDaily") },
  ];
  const scoreLabel = by === "achievements" ? t.text("byAchievements") : by === "prizes" ? t.text("byPrizes") : t.text("byXp");

  return (
    <Card
      role="region"
      aria-labelledby={headingId}
      data-fancy-fun-lab="leaderboard"
      data-fancy-fun-lab-by={by}
      data-fancy-fun-lab-metric={metric ?? ""}
      data-fancy-fun-lab-period={period}
      data-fancy-fun-lab-page={page}
      data-fancy-fun-lab-last-page={lastPage}
      className={cn("fancy-fun-lab-board", className)}
    >
      <Card.Body>
        <div className="fancy-fun-lab-board__head">
          <Heading as="h2" size="md" id={headingId}>
            {title ?? t.text("leaderboard")}
          </Heading>
          {lastPage > 1 ? (
            <Text as="span" size="sm" color="muted">
              {t.nodes("pageOf", { page, pages: lastPage })}
            </Text>
          ) : null}
        </div>

        {onByChange || (onMetricChange && metrics) || onPeriodChange ? (
          <div className="fancy-fun-lab-board__controls">
            {onByChange ? (
              <div data-fancy-fun-lab-control="by">
                <MultiSwitch
                  list={byList}
                  value={by}
                  onValueChange={(v) => onByChange(v as FunLabLeaderboardBy)}
                  label={t.text("rankBy")}
                  size="sm"
                />
              </div>
            ) : null}
            {onMetricChange && metrics ? (
              <div data-fancy-fun-lab-control="metric">
                <Select
                  list={[{ value: "", label: t.text("allMetrics") }, ...metrics.map((m) => ({ value: m.slug, label: m.name }))]}
                  value={metric ?? ""}
                  onValueChange={(v) => onMetricChange(v === "" ? null : v)}
                  label={t.text("metric")}
                  size="sm"
                />
              </div>
            ) : null}
            {onPeriodChange ? (
              <div data-fancy-fun-lab-control="period">
                <Select
                  list={periodList}
                  value={period}
                  onValueChange={(v) => onPeriodChange(v as FunLabLeaderboardPeriod)}
                  label={t.text("period")}
                  size="sm"
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {entries.length === 0 ? (
          <Text as="p" color="muted" data-fancy-fun-lab-empty="true">
            {t.text("emptyBoard")}
          </Text>
        ) : (
          <Table className="fancy-fun-lab-board__table">
            <Table.Head>
              <tr>
                <Table.Column scope="col" label={t.text("rank")} />
                <Table.Column scope="col" label={t.text("name")} />
                {showLevel ? <Table.Column scope="col" label={t.text("levelColumn")} /> : null}
                <Table.Column scope="col" label={scoreLabel} className="fancy-fun-lab-board__num" />
              </tr>
            </Table.Head>
            <Table.Body>
              {entries.map((e, i) => {
                const rank = e.rank ?? (page - 1) * entries.length + i + 1;
                const score = scoreFor(e, by);
                const mine = currentProfileId !== null && e.id === currentProfileId;
                const name = names?.[String(e.id)] ?? t.text("unnamed", { id: String(e.awardable_id) });
                return (
                  <Table.Row
                    key={e.id}
                    data-fancy-fun-lab-entry-id={e.id}
                    data-fancy-fun-lab-rank={rank}
                    data-fancy-fun-lab-score={score}
                    data-fancy-fun-lab-mine={mine ? "true" : undefined}
                    aria-current={mine ? "true" : undefined}
                    className={cn(mine && "fancy-fun-lab-board__row--mine")}
                  >
                    <Table.Cell header scope="row" className="fancy-fun-lab-board__rank">
                      {rank <= 3 ? (
                        <Badge variant={mine ? "solid" : "soft"} size="sm">
                          {ltrNumber(rank, locale)}
                        </Badge>
                      ) : (
                        ltrNumber(rank, locale)
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {name}
                      {mine ? <Text as="span" size="sm" weight="semibold">{` (${t.text("you")})`}</Text> : null}
                    </Table.Cell>
                    {showLevel ? <Table.Cell>{e.metric ? ltrNumber(e.metric.current_level, locale) : null}</Table.Cell> : null}
                    <Table.Cell className="fancy-fun-lab-board__num">{ltrNumber(score, locale)}</Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>
        )}

        {onPageChange ? (
          <div data-fancy-fun-lab-control="page" className="fancy-fun-lab-board__pager">
            <Pagination page={page} totalPages={lastPage} onPageChange={onPageChange} />
          </div>
        ) : null}
      </Card.Body>
    </Card>
  );
}
