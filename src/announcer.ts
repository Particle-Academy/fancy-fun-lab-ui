export interface FunLabAnnouncerOptions {
  /** Minimum gap between two announcements, in ms. Default 2000. */
  minIntervalMs?: number;
  /** Receives each utterance. */
  onAnnounce: (text: string) => void;
  /** Turns a held burst into one utterance. `count` is how many were held; `latest` the newest. */
  summarize: (count: number, latest: string) => string;
}

export interface FunLabAnnouncer {
  push: (text: string) => void;
  dispose: () => void;
}

/**
 * Rate-limits what a live region says.
 *
 * The first message is spoken at once. Anything arriving in the next
 * `minIntervalMs` is held; when the interval ends, one held message is spoken
 * as itself and several are spoken as ONE summary. So a burst of twenty awards
 * is two utterances, not twenty, and a screen-reader user is never talked over
 * by a scoreboard. At most one utterance per interval, however long the burst.
 */
export function createAnnouncer({ minIntervalMs = 2000, onAnnounce, summarize }: FunLabAnnouncerOptions): FunLabAnnouncer {
  let held: string[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const cool = () => {
    timer = setTimeout(() => {
      timer = null;
      if (disposed || held.length === 0) return;
      const latest = held[held.length - 1]!;
      const text = held.length === 1 ? latest : summarize(held.length, latest);
      held = [];
      onAnnounce(text);
      cool();
    }, minIntervalMs);
  };

  return {
    push(text) {
      if (disposed || text === "") return;
      if (timer === null) {
        onAnnounce(text);
        cool();
      } else {
        held.push(text);
      }
    },
    dispose() {
      disposed = true;
      held = [];
      if (timer !== null) clearTimeout(timer);
      timer = null;
    },
  };
}
