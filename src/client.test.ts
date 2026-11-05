import { describe, it, expect } from "vitest";
import { createFunLabClient, FunLabHttpError } from "./client";

function fakeFetch(body: unknown = { data: [] }, status = 200) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetch = async (url: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  };
  return { fetch: fetch as typeof globalThis.fetch, calls };
}

describe("createFunLabClient", () => {
  it("builds the leaderboard URL with the metric, period and page, encoding the type", async () => {
    const { fetch, calls } = fakeFetch({ data: [], meta: { current_page: 2, last_page: 3, per_page: 10, total: 25 } });
    const client = createFunLabClient({ baseUrl: "https://app.example.com/api/lfl/", fetch });

    const res = await client.leaderboard("App\\Models\\User", { by: "xp", metric: "combat", period: "weekly", page: 2, perPage: 10 });

    expect(calls[0]!.url).toBe(
      "https://app.example.com/api/lfl/leaderboards/App%5CModels%5CUser?by=xp&metric=combat&period=weekly&page=2&per_page=10",
    );
    expect(res.meta.last_page).toBe(3);
  });

  it("omits options that are not set", async () => {
    const { fetch, calls } = fakeFetch();
    await createFunLabClient({ baseUrl: "/api/lfl", fetch }).leaderboard("user");
    expect(calls[0]!.url).toBe("/api/lfl/leaderboards/user");
  });

  it("sends the host's headers, from an object or a function, and asks for JSON", async () => {
    const { fetch, calls } = fakeFetch({ data: {} });
    let token = "a";
    const client = createFunLabClient({ baseUrl: "/api/lfl", fetch, headers: () => ({ Authorization: `Bearer ${token}` }) });

    await client.meProfile();
    token = "b";
    await client.meProfile();

    const h0 = new Headers(calls[0]!.init.headers);
    const h1 = new Headers(calls[1]!.init.headers);
    expect(h0.get("Authorization")).toBe("Bearer a");
    expect(h1.get("Authorization")).toBe("Bearer b");
    expect(h0.get("Accept")).toBe("application/json");
    expect(calls[0]!.url).toBe("/api/lfl/me/profile");
  });

  it("encodes path segments so a slug cannot change the path", async () => {
    const { fetch, calls } = fakeFetch();
    await createFunLabClient({ baseUrl: "/api/lfl", fetch }).metricLevels("../me/profile");
    expect(calls[0]!.url).toBe("/api/lfl/metric-levels/..%2Fme%2Fprofile");
  });

  it("throws a typed error carrying the status and body on a non-2xx", async () => {
    const { fetch } = fakeFetch({ message: "The selected metric is invalid." }, 422);
    const err = await createFunLabClient({ baseUrl: "/api/lfl", fetch })
      .leaderboard("user", { metric: "nope" })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(FunLabHttpError);
    expect((err as FunLabHttpError).status).toBe(422);
    expect((err as FunLabHttpError).body).toEqual({ message: "The selected metric is invalid." });
  });
});
