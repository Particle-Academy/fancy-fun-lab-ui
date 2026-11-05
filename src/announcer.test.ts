import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAnnouncer } from "./announcer";

describe("createAnnouncer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const make = (minIntervalMs = 2000) => {
    const said: string[] = [];
    const a = createAnnouncer({
      minIntervalMs,
      onAnnounce: (t) => said.push(t),
      summarize: (count, latest) => `${count} updates, latest: ${latest}`,
    });
    return { a, said };
  };

  it("announces the first message at once", () => {
    const { a, said } = make();
    a.push("+50 XP");
    expect(said).toEqual(["+50 XP"]);
  });

  it("holds a burst and speaks it once, as a summary, when the interval ends", () => {
    const { a, said } = make();
    a.push("one");
    for (let i = 0; i < 20; i++) a.push(`m${i}`);
    expect(said).toEqual(["one"]);

    vi.advanceTimersByTime(1999);
    expect(said).toEqual(["one"]);

    vi.advanceTimersByTime(1);
    expect(said).toEqual(["one", "20 updates, latest: m19"]);

    // Nothing left: the interval passes in silence.
    vi.advanceTimersByTime(5000);
    expect(said).toHaveLength(2);
  });

  it("speaks a single held message as itself, not a summary", () => {
    const { a, said } = make();
    a.push("one");
    a.push("two");
    vi.advanceTimersByTime(2000);
    expect(said).toEqual(["one", "two"]);
  });

  it("never speaks more than once per interval however long the burst lasts", () => {
    const { a, said } = make(1000);
    for (let t = 0; t < 10000; t += 100) {
      a.push(`at ${t}`);
      vi.advanceTimersByTime(100);
    }
    vi.advanceTimersByTime(1000);
    // 10 s of pushes every 100 ms, one utterance per 1000 ms window at most.
    expect(said.length).toBeLessThanOrEqual(11);
    expect(said.length).toBeGreaterThanOrEqual(10);
  });

  it("goes idle again after a quiet interval", () => {
    const { a, said } = make();
    a.push("one");
    vi.advanceTimersByTime(2500);
    a.push("two");
    expect(said).toEqual(["one", "two"]);
  });

  it("dispose drops anything held", () => {
    const { a, said } = make();
    a.push("one");
    a.push("two");
    a.dispose();
    vi.advanceTimersByTime(5000);
    expect(said).toEqual(["one"]);
  });
});
