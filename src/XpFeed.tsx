import { useEffect, useId, useMemo, useRef } from "react";
import { cn, Badge, Heading, Text } from "@particle-academy/react-fancy";
import { useFunLabAnnounce } from "./LiveRegion";
import { mergeLabels, translator, type FunLabLabels } from "./labels";
import type { FunLabFeedItem } from "./types";

export interface FunLabXpFeedProps {
  /** Feed rows, newest first (controlled). Build them with `feedItemFromEcho` + `mergeFeed`. */
  items: FunLabFeedItem[];
  /** Show at most this many. Default 20. */
  max?: number;
  /**
   * Speak new rows through a polite live region, rate-limited so a burst is
   * one summary rather than a stream. Default true. Rows present on first
   * render are never spoken.
   */
  announce?: boolean;
  /** Minimum gap between announcements, in ms, when this feed owns its region. Default 2000. */
  announceIntervalMs?: number;
  title?: string;
  locale?: string;
  labels?: Partial<FunLabLabels>;
  className?: string;
}

/** What a row says, in one string: used for the live region. */
export function describeFeedItem(item: FunLabFeedItem, labels: FunLabLabels, locale?: string): string {
  const t = translator(labels, locale);
  if (item.type === "xp.awarded") {
    return t.text("xpAwarded", { amount: item.amount, metric: item.gamed_metric_name, total: item.total_xp }, item.amount);
  }
  const head = t.text("levelReached", { level: item.level, metric: item.gamed_metric_name, name: item.level_name ?? "" });
  if (item.achievements.length === 0) return head;
  const names = item.achievements.map((a) => a.name).join(", ");
  return `${head}. ${t.text("unlocked", { achievements: names }, item.achievements.length)}`;
}

/**
 * A running list of XP awards and level-ups, fed by the `xp.awarded` and
 * `metric.level-reached` broadcasts. Fully controlled: the host owns the
 * array. Each row carries `data-fancy-fun-lab-feed-id` and `-feed-type`.
 */
export function FunLabXpFeed({
  items,
  max = 20,
  announce = true,
  announceIntervalMs = 2000,
  title,
  locale,
  labels,
  className,
}: FunLabXpFeedProps) {
  const l = useMemo(() => mergeLabels(labels), [labels]);
  const t = translator(l, locale);
  const headingId = useId();
  const { push, region } = useFunLabAnnounce(l, locale, announceIntervalMs);
  const seen = useRef<Set<string> | null>(null);
  const time = useMemo(() => new Intl.DateTimeFormat(locale, { timeStyle: "short" }), [locale]);

  useEffect(() => {
    if (seen.current === null) {
      // First render: what is already there is history, not news.
      seen.current = new Set(items.map((i) => i.id));
      return;
    }
    const fresh = items.filter((i) => !seen.current!.has(i.id));
    for (const i of fresh) seen.current.add(i.id);
    if (!announce) return;
    // Oldest first, so a summary's "latest" really is the latest.
    for (const i of [...fresh].reverse()) push(describeFeedItem(i, l, locale));
  }, [items, announce, push, l, locale]);

  const shown = items.slice(0, max);

  return (
    <section aria-labelledby={headingId} data-fancy-fun-lab="xp-feed" data-fancy-fun-lab-count={shown.length} className={cn("fancy-fun-lab-feed", className)}>
      <Heading as="h2" size="sm" id={headingId}>
        {title ?? t.text("feed")}
      </Heading>
      {shown.length === 0 ? (
        <Text as="p" size="sm" color="muted">
          {t.text("feedEmpty")}
        </Text>
      ) : (
        <ol className="fancy-fun-lab-feed__list">
          {shown.map((i) => (
            <li key={i.id} className="fancy-fun-lab-feed__row" data-fancy-fun-lab-feed-id={i.id} data-fancy-fun-lab-feed-type={i.type} data-fancy-fun-lab-metric={i.gamed_metric_slug}>
              {i.type === "xp.awarded" ? (
                <Text as="span" size="sm">
                  {t.nodes("xpAwarded", { amount: i.amount, metric: i.gamed_metric_name, total: i.total_xp }, i.amount)}
                </Text>
              ) : (
                <span className="fancy-fun-lab-feed__level">
                  <Badge variant="soft" color="violet" size="sm">
                    {t.text("levelUp")}
                  </Badge>
                  <Text as="span" size="sm" weight="medium">
                    {t.nodes("levelReached", { level: i.level, metric: i.gamed_metric_name, name: i.level_name ?? "" })}
                  </Text>
                  {i.achievements.length > 0 ? (
                    <Text as="span" size="sm" color="muted">
                      {t.text("unlocked", { achievements: i.achievements.map((a) => a.name).join(", ") }, i.achievements.length)}
                    </Text>
                  ) : null}
                </span>
              )}
              <time dateTime={i.occurred_at} className="fancy-fun-lab-feed__time">
                {safeTime(time, i.occurred_at)}
              </time>
            </li>
          ))}
        </ol>
      )}
      {region}
    </section>
  );
}

function safeTime(fmt: Intl.DateTimeFormat, iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : fmt.format(d);
}
