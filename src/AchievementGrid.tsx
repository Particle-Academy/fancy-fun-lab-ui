import { useId, useMemo } from "react";
import { cn, Badge, Card, Grid, Heading, MultiSwitch, Text } from "@particle-academy/react-fancy";
import { mergeLabels, translator, type FunLabLabels } from "./labels";
import type { FunLabAchievement } from "./types";

export type FunLabAchievementFilter = "all" | "earned" | "locked";

export interface FunLabAchievementGridProps {
  /** The catalog, as `GET /achievements` returns it (`data`). Hidden achievements are already left out by the API until earned. */
  achievements: FunLabAchievement[];
  /** Slugs the profile has earned, e.g. from `GET /me/achievements`. */
  earned?: string[];
  /** Which tiles to show (controlled). Shown as a switch only when `onFilterChange` is set. */
  filter?: FunLabAchievementFilter;
  onFilterChange?: (filter: FunLabAchievementFilter) => void;
  /** Columns at the widest breakpoint. Default 3. */
  cols?: number;
  title?: string;
  locale?: string;
  labels?: Partial<FunLabLabels>;
  className?: string;
}

/**
 * Achievements as a grid of tiles, each saying "Earned" or "Locked" in words
 * (a locked tile is also dimmed, but never only dimmed). A list to assistive
 * tech, with a handle per tile.
 */
export function FunLabAchievementGrid({
  achievements,
  earned = [],
  filter = "all",
  onFilterChange,
  cols = 3,
  title,
  locale,
  labels,
  className,
}: FunLabAchievementGridProps) {
  const l = useMemo(() => mergeLabels(labels), [labels]);
  const t = translator(l, locale);
  const headingId = useId();
  const have = useMemo(() => new Set(earned), [earned]);

  const shown = achievements.filter((a) =>
    filter === "earned" ? have.has(a.slug) : filter === "locked" ? !have.has(a.slug) : true,
  );

  return (
    <section
      aria-labelledby={headingId}
      data-fancy-fun-lab="achievement-grid"
      data-fancy-fun-lab-filter={filter}
      data-fancy-fun-lab-earned-count={have.size}
      className={cn("fancy-fun-lab-achievements", className)}
    >
      <div className="fancy-fun-lab-achievements__head">
        <Heading as="h2" size="md" id={headingId}>
          {title ?? t.text("achievements")}
        </Heading>
        {onFilterChange ? (
          <div data-fancy-fun-lab-control="filter">
            <MultiSwitch
              list={[
                { value: "all", label: t.text("filterAll") },
                { value: "earned", label: t.text("filterEarned") },
                { value: "locked", label: t.text("filterLocked") },
              ]}
              value={filter}
              onValueChange={(v) => onFilterChange(v as FunLabAchievementFilter)}
              label={t.text("filter")}
              labelHidden
              size="sm"
            />
          </div>
        ) : null}
      </div>

      {shown.length === 0 ? (
        <Text as="p" color="muted">
          {t.text("noAchievements")}
        </Text>
      ) : (
        <Grid role="list" cols={cols} gap="md">
          {shown.map((a) => {
            const isEarned = have.has(a.slug);
            return (
              <Card
                key={a.slug}
                role="listitem"
                variant={isEarned ? "outlined" : "muted"}
                data-fancy-fun-lab-achievement={a.slug}
                data-fancy-fun-lab-earned={isEarned ? "true" : "false"}
                className={cn("fancy-fun-lab-achievement", !isEarned && "is-locked")}
              >
                <Card.Body>
                  <div className="fancy-fun-lab-achievement__head">
                    <Text as="span" weight="semibold">
                      {a.name}
                    </Text>
                    <Badge variant={isEarned ? "solid" : "outline"} color={isEarned ? "green" : "zinc"} size="sm">
                      {isEarned ? t.text("earned") : t.text("locked")}
                    </Badge>
                  </div>
                  {a.description ? (
                    <Text
                      as="p"
                      size="sm"
                      color="muted"
                      // A locked tile is a muted card, and muted text on it is
                      // 4.39:1 (zinc-500 on zinc-100), under AA. The soft token
                      // keeps it secondary and readable.
                      className={cn(
                        !isEarned &&
                          "text-[color:var(--fancy-text-soft,var(--color-zinc-700))] dark:text-[color:var(--fancy-text-soft-dark,var(--color-zinc-300))]",
                      )}
                    >
                      {a.description}
                    </Text>
                  ) : null}
                </Card.Body>
              </Card>
            );
          })}
        </Grid>
      )}
    </section>
  );
}
