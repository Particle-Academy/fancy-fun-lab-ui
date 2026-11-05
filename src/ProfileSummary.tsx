import { useMemo } from "react";
import { cn, Badge, Button, Card, Heading, Progress, Stat, StatBand, Text } from "@particle-academy/react-fancy";
import { ltrNumber } from "./format";
import { mergeLabels, translator, type FunLabLabels } from "./labels";
import { levelProgress } from "./model";
import type { FunLabMetricProgress, FunLabProfile } from "./types";

export interface FunLabProfileSummaryProps {
  /** The profile, as `GET /me/profile` returns it (`data`). */
  profile: FunLabProfile;
  /** One row per gamed metric (XP type), in display order. */
  metrics?: FunLabMetricProgress[];
  /** Highlighted metric slug (controlled). Metric names become buttons only when `onSelectMetric` is set. */
  selectedMetric?: string | null;
  onSelectMetric?: (slug: string) => void;
  /** Optional heading. */
  title?: string;
  /** BCP 47 locale for numbers and plurals. Default: the runtime's. */
  locale?: string;
  labels?: Partial<FunLabLabels>;
  className?: string;
}

/**
 * Total XP, achievements and prizes, then each gamed metric's level and
 * progress to the next.
 *
 * Progress is said in words beside every bar and as the bar's
 * `aria-valuetext`, so nothing depends on seeing the bar or its colour.
 * Human+: state is mirrored as `data-fancy-fun-lab-*` on the root and on each
 * metric row.
 */
export function FunLabProfileSummary({
  profile,
  metrics = [],
  selectedMetric = null,
  onSelectMetric,
  title,
  locale,
  labels,
  className,
}: FunLabProfileSummaryProps) {
  const l = useMemo(() => mergeLabels(labels), [labels]);
  const t = translator(l, locale);

  return (
    <Card
      data-fancy-fun-lab="profile-summary"
      data-fancy-fun-lab-profile-id={profile.id}
      data-fancy-fun-lab-selected-metric={selectedMetric ?? undefined}
      className={cn("fancy-fun-lab-profile", className)}
    >
      <Card.Body>
        {title ? (
          <Heading as="h2" size="md" className="fancy-fun-lab-profile__title">
            {title}
          </Heading>
        ) : null}

        <StatBand columns={3}>
          <Stat data-fancy-fun-lab-stat="total_xp" value={ltrNumber(profile.total_xp, locale)} label={t.text("totalXp")} size="sm" />
          <Stat
            data-fancy-fun-lab-stat="achievement_count"
            value={ltrNumber(profile.achievement_count, locale)}
            label={t.text("achievements")}
            size="sm"
          />
          <Stat data-fancy-fun-lab-stat="prize_count" value={ltrNumber(profile.prize_count, locale)} label={t.text("prizes")} size="sm" />
        </StatBand>

        {metrics.length > 0 ? (
          <ul className="fancy-fun-lab-metrics">
            {metrics.map((m) => {
              const p = levelProgress(m);
              const selected = selectedMetric === m.slug;
              const words = p.atMax
                ? t.text("maxLevel")
                : t.text("progressToNext", { into: p.into, needed: p.needed, next: p.nextLevel, remaining: p.remaining });
              return (
                <li
                  key={m.slug}
                  className={cn("fancy-fun-lab-metrics__row", selected && "is-selected")}
                  data-fancy-fun-lab-metric={m.slug}
                  data-fancy-fun-lab-level={m.current_level}
                  data-fancy-fun-lab-progress={p.pct}
                  data-fancy-fun-lab-selected={selected ? "true" : undefined}
                >
                  <div className="fancy-fun-lab-metrics__head">
                    {onSelectMetric ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-pressed={selected}
                        data-fancy-fun-lab-control="select-metric"
                        onClick={() => onSelectMetric(m.slug)}
                      >
                        {m.name}
                      </Button>
                    ) : (
                      <Text as="span" weight="medium">
                        {m.name}
                      </Text>
                    )}
                    <Badge variant="soft" size="sm">
                      {t.nodes("level", { level: m.current_level })}
                      {m.level_name ? <span className="fancy-fun-lab-metrics__level-name"> · {m.level_name}</span> : null}
                    </Badge>
                  </div>
                  <Progress value={p.pct} max={100} size="sm" aria-label={t.text("progressOf", { metric: m.name })} aria-valuetext={words} />
                  <Text as="p" size="sm" color="muted" className="fancy-fun-lab-metrics__words">
                    {p.atMax
                      ? t.nodes("maxLevel")
                      : t.nodes("progressToNext", { into: p.into, needed: p.needed, next: p.nextLevel, remaining: p.remaining })}
                  </Text>
                </li>
              );
            })}
          </ul>
        ) : null}
      </Card.Body>
    </Card>
  );
}
