import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createAnnouncer, type FunLabAnnouncer } from "./announcer";
import { interpolate, pickPlural } from "./format";
import { mergeLabels, type FunLabLabels } from "./labels";

type Push = (text: string) => void;

const AnnounceContext = createContext<Push | null>(null);

/**
 * A polite live region and its rate-limited announcer.
 *
 * Status text is only ever spoken politely (`role="status"`): an XP award is
 * never worth interrupting someone. Text set on the region is swapped into a
 * fresh node each time, so the same sentence twice is still spoken twice.
 */
function useRegion(minIntervalMs: number, labels: FunLabLabels, locale?: string) {
  const [said, setSaid] = useState<{ text: string; seq: number }>({ text: "", seq: 0 });
  const announcer = useRef<FunLabAnnouncer | null>(null);
  const labelsRef = useRef(labels);
  const localeRef = useRef(locale);

  useEffect(() => {
    labelsRef.current = labels;
    localeRef.current = locale;
  });

  useEffect(() => {
    const a = createAnnouncer({
      minIntervalMs,
      onAnnounce: (text) => setSaid((s) => ({ text, seq: s.seq + 1 })),
      summarize: (count, latest) =>
        interpolate(pickPlural(labelsRef.current.burst, count, localeRef.current), { count, latest }, localeRef.current),
    });
    announcer.current = a;
    return () => {
      a.dispose();
      if (announcer.current === a) announcer.current = null;
    };
  }, [minIntervalMs]);

  const push = useCallback<Push>((text) => announcer.current?.push(text), []);

  const region = (
    <div role="status" aria-live="polite" aria-atomic="true" className="fancy-fun-lab-sr-only" data-fancy-fun-lab="live-region">
      {said.text === "" ? null : <span key={said.seq}>{said.text}</span>}
    </div>
  );

  return { push, region };
}

export interface FunLabLiveRegionProviderProps {
  children?: ReactNode;
  /** Minimum gap between two announcements, in ms. Default 2000. */
  minIntervalMs?: number;
  labels?: Partial<FunLabLabels>;
  locale?: string;
}

/**
 * One live region for every fun-lab component beneath it. Put it once near the
 * root when a page shows several (a feed AND a level-up), so their
 * announcements share one rate limit instead of talking over each other.
 */
export function FunLabLiveRegionProvider({ children, minIntervalMs = 2000, labels, locale }: FunLabLiveRegionProviderProps) {
  const merged = useMemo(() => mergeLabels(labels), [labels]);
  const { push, region } = useRegion(minIntervalMs, merged, locale);
  return (
    <AnnounceContext.Provider value={push}>
      {children}
      {region}
    </AnnounceContext.Provider>
  );
}

/**
 * The announcer for a component: the provider's when there is one (and no
 * region of its own), else a region it renders itself. Always calls the same
 * hooks, so whether a provider is present can change without breaking hook
 * order.
 */
export function useFunLabAnnounce(labels: FunLabLabels, locale?: string, minIntervalMs = 2000): { push: Push; region: ReactNode } {
  const shared = useContext(AnnounceContext);
  const own = useRegion(minIntervalMs, labels, locale);
  return shared ? { push: shared, region: null } : own;
}
