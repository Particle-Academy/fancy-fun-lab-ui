import { useEffect, useId, useMemo, useRef } from "react";
import { cn, Badge, Button, Card, Heading, Text } from "@particle-academy/react-fancy";
import { useFunLabAnnounce } from "./LiveRegion";
import { mergeLabels, translator, type FunLabLabels } from "./labels";
import type { FunLabLevelReached } from "./types";

export interface FunLabLevelUpProps {
  /** The `metric.level-reached` payload to show, or null for none (controlled). */
  event: FunLabLevelReached | null;
  /** Called by the dismiss button. The button shows only when this is set. */
  onDismiss?: () => void;
  /**
   * Play the celebration. Default true. It is a CSS animation that only runs
   * under `prefers-reduced-motion: no-preference`, so a user who asked for less
   * motion gets none whatever this says.
   */
  celebrate?: boolean;
  /**
   * Speak the level-up through a polite live region. Default true. Turn it off
   * when an `FunLabXpFeed` on the same page already speaks level rows.
   */
  announce?: boolean;
  locale?: string;
  labels?: Partial<FunLabLabels>;
  className?: string;
}

/**
 * A level-up announcement. It never takes focus and never interrupts: the
 * card appears in place, and the news is spoken politely. Rendering
 * nothing visible while `event` is null, it keeps its live region mounted so
 * the first level-up is spoken too.
 */
export function FunLabLevelUp({ event, onDismiss, celebrate = true, announce = true, locale, labels, className }: FunLabLevelUpProps) {
  const l = useMemo(() => mergeLabels(labels), [labels]);
  const t = translator(l, locale);
  const headingId = useId();
  const { push, region } = useFunLabAnnounce(l, locale);
  const lastKey = useRef<string | null>(null);

  const key = event ? `${event.profile_id}:${event.gamed_metric_id}:${event.level}` : null;

  useEffect(() => {
    if (key === lastKey.current) return;
    lastKey.current = key;
    if (!event || !announce) return;
    const head = t.text("levelReached", { level: event.level, metric: event.gamed_metric_name, name: event.level_name ?? "" });
    const names = event.achievements.map((a) => a.name).join(", ");
    push(names ? `${t.text("levelUp")}. ${head}. ${t.text("unlocked", { achievements: names }, event.achievements.length)}` : `${t.text("levelUp")}. ${head}`);
  });

  if (!event) return announce ? <>{region}</> : null;

  return (
    <>
      <Card
        role="group"
        aria-labelledby={headingId}
        data-fancy-fun-lab="level-up"
        data-fancy-fun-lab-metric={event.gamed_metric_slug}
        data-fancy-fun-lab-level={event.level}
        variant="elevated"
        className={cn("fancy-fun-lab-levelup", celebrate && "fancy-fun-lab-levelup--celebrate", className)}
      >
        <Card.Body>
          <div className="fancy-fun-lab-levelup__head">
            <Heading as="h2" size="md" id={headingId}>
              {t.text("levelUp")}
            </Heading>
            {onDismiss ? (
              <Button size="sm" variant="ghost" data-fancy-fun-lab-control="dismiss" onClick={onDismiss}>
                {t.text("dismiss")}
              </Button>
            ) : null}
          </div>
          <Text as="p" size="lg" weight="semibold">
            {t.nodes("levelReached", { level: event.level, metric: event.gamed_metric_name, name: event.level_name ?? "" })}
            {event.level_name ? <span className="fancy-fun-lab-levelup__name"> · {event.level_name}</span> : null}
          </Text>
          {event.achievements.length > 0 ? (
            <ul className="fancy-fun-lab-levelup__unlocked" aria-label={t.text("unlockedList", {}, event.achievements.length)}>
              {event.achievements.map((a) => (
                <li key={a.slug} data-fancy-fun-lab-achievement={a.slug}>
                  <Badge variant="soft" color="green">
                    {a.name}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </Card.Body>
      </Card>
      {announce ? region : null}
    </>
  );
}
