import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement, Fragment } from "react";
import { interpolate, interpolateNodes, pickPlural, formatNumber } from "./format";

describe("interpolate", () => {
  it("fills named placeholders and leaves unknown ones visible", () => {
    expect(interpolate("+{amount} XP in {metric}", { amount: 50, metric: "Combat" })).toBe("+50 XP in Combat");
    expect(interpolate("{missing} stays", {})).toBe("{missing} stays");
  });

  it("formats numeric values for the locale", () => {
    expect(interpolate("{n} XP", { n: 12345 }, "en")).toBe("12,345 XP");
    expect(interpolate("{n} XP", { n: 12345 }, "de")).toBe("12.345 XP");
  });

  it("is linear on hostile input (no backtracking blow-up)", () => {
    const hostile = "{".repeat(50000) + "a";
    const t0 = performance.now();
    interpolate(hostile, { a: 1 });
    expect(performance.now() - t0).toBeLessThan(200);
  });
});

describe("pickPlural", () => {
  it("returns a plain string as-is", () => {
    expect(pickPlural("{count} more", 3, "en")).toBe("{count} more");
  });

  it("picks the CLDR category for the locale, falling back to other", () => {
    const label = { one: "{count} more update", other: "{count} more updates" };
    expect(pickPlural(label, 1, "en")).toBe("{count} more update");
    expect(pickPlural(label, 4, "en")).toBe("{count} more updates");
    // Arabic has "few" for 3; absent here, so "other".
    expect(pickPlural(label, 3, "ar")).toBe("{count} more updates");
    expect(pickPlural({ few: "few", other: "other" }, 3, "ar")).toBe("few");
  });
});

describe("numbers stay left-to-right", () => {
  it("formatNumber uses the locale", () => {
    expect(formatNumber(1500, "en")).toBe("1,500");
  });

  it("interpolateNodes isolates every number as LTR, text is left to the page", () => {
    const html = renderToStaticMarkup(
      createElement(Fragment, null, ...interpolateNodes("{into} of {needed} XP for {metric}", { into: 120, needed: 200, metric: "Combat" }, "en")),
    );
    expect(html).toBe('<bdi dir="ltr">120</bdi> of <bdi dir="ltr">200</bdi> XP for Combat');
  });

  it("{+name} signs the number INSIDE the isolate, so the sign cannot drift to the other side in RTL", () => {
    const html = renderToStaticMarkup(createElement(Fragment, null, ...interpolateNodes("{+amount} XP", { amount: 50 }, "en")));
    expect(html).toBe('<bdi dir="ltr">+50</bdi> XP');
    expect(interpolate("{+amount} XP", { amount: 50 }, "en")).toBe("+50 XP");
    expect(interpolate("{+amount}", { amount: -5 }, "en")).toBe("-5");
  });
});
