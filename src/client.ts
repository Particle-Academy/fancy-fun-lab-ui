import type {
  FunLabAchievement,
  FunLabLeaderboardBy,
  FunLabLeaderboardEntry,
  FunLabLeaderboardPeriod,
  FunLabMetric,
  FunLabMetricLevel,
  FunLabPageMeta,
  FunLabProfile,
} from "./types";

export interface FunLabClientOptions {
  /** Where the API is mounted, e.g. `https://app.example.com/api/lfl`. */
  baseUrl: string;
  /** Extra headers (auth, CSRF), or a function returning them per request. */
  headers?: Record<string, string> | (() => Record<string, string>);
  /** Fetch credentials mode. Default `same-origin`. */
  credentials?: RequestCredentials;
  /** A fetch implementation. Default `globalThis.fetch`. */
  fetch?: typeof globalThis.fetch;
}

export interface FunLabLeaderboardQuery {
  by?: FunLabLeaderboardBy;
  metric?: string | null;
  period?: FunLabLeaderboardPeriod;
  page?: number;
  perPage?: number;
}

export interface FunLabLeaderboardPage {
  data: FunLabLeaderboardEntry[];
  meta: FunLabPageMeta;
}

/** A non-2xx response. `body` is the parsed JSON when there was any. */
export class FunLabHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    url: string,
  ) {
    super(`laravel-fun-lab API ${status} for ${url}`);
    this.name = "FunLabHttpError";
  }
}

/**
 * A thin, read-only client for laravel-fun-lab's REST API. Fetch only: no
 * dependency, no cache, no auth of its own. The host supplies the base URL and
 * whatever headers its API needs, and owns caching (fancy-query, for one).
 */
export function createFunLabClient(options: FunLabClientOptions) {
  let end = options.baseUrl.length;
  while (end > 0 && options.baseUrl.charCodeAt(end - 1) === 47 /* "/" */) end--;
  const base = options.baseUrl.slice(0, end);
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);

  async function get<T>(path: string, query: Record<string, string | number | null | undefined> = {}): Promise<T> {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
    }
    const qs = params.toString();
    const url = `${base}${path}${qs ? `?${qs}` : ""}`;
    const extra = typeof options.headers === "function" ? options.headers() : (options.headers ?? {});
    const res = await doFetch(url, {
      method: "GET",
      credentials: options.credentials ?? "same-origin",
      headers: { Accept: "application/json", ...extra },
    });
    const text = await res.text();
    let body: unknown = null;
    if (text !== "") {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
    if (!res.ok) throw new FunLabHttpError(res.status, body, url);
    return body as T;
  }

  const seg = encodeURIComponent;

  return {
    leaderboard(type: string, q: FunLabLeaderboardQuery = {}) {
      return get<FunLabLeaderboardPage>(`/leaderboards/${seg(type)}`, {
        by: q.by,
        metric: q.metric,
        period: q.period,
        page: q.page,
        per_page: q.perPage,
      });
    },
    profile(type: string, id: string | number) {
      return get<{ data: FunLabProfile }>(`/profiles/${seg(type)}/${seg(String(id))}`);
    },
    meProfile() {
      return get<{ data: FunLabProfile }>("/me/profile");
    },
    meAchievements() {
      return get<{ data: FunLabAchievement[] }>("/me/achievements");
    },
    achievements() {
      return get<{ data: FunLabAchievement[] }>("/achievements");
    },
    gamedMetrics() {
      return get<{ data: FunLabMetric[] }>("/gamed-metrics");
    },
    metricLevels(metric: string) {
      return get<{ data: FunLabMetricLevel[] }>(`/metric-levels/${seg(metric)}`);
    },
  };
}

export type FunLabClient = ReturnType<typeof createFunLabClient>;
