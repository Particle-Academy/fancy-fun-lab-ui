import { createElement, type ReactNode } from "react";

/**
 * A label: a plain template, or one template per CLDR plural category
 * (`zero`, `one`, `two`, `few`, `many`, `other`). Templates use `{name}`
 * placeholders. Both forms are plain JSON, so a host can ship translations as
 * data.
 */
export type FunLabLabel = string | Partial<Record<Intl.LDMLPluralRule, string>>;

export type FunLabValues = Record<string, string | number | null | undefined>;

// One placeholder: `{`, an optional `+`, word characters, `}`. `{+name}` formats
// a number with its sign always shown. Fixed-width prefix and one character
// class, with no nesting or alternation, so matching is linear in the input.
const PLACEHOLDER = /\{(\+?)(\w+)\}/g;

const numberFormats = new Map<string, Intl.NumberFormat>();

/** Format a number for a locale (cached per locale). `signed` always shows the sign. */
export function formatNumber(value: number, locale?: string, signed = false): string {
  const key = `${locale ?? ""}|${signed ? "+" : ""}`;
  let fmt = numberFormats.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, signed ? { signDisplay: "exceptZero" } : undefined);
    numberFormats.set(key, fmt);
  }
  return fmt.format(value);
}

/** Pick the template for `count` from a plural label. A plain string is returned as-is. */
export function pickPlural(label: FunLabLabel, count: number, locale?: string): string {
  if (typeof label === "string") return label;
  const category = new Intl.PluralRules(locale).select(count);
  return label[category] ?? label.other ?? Object.values(label)[0] ?? "";
}

/** Fill `{name}` placeholders. Numbers are formatted for the locale; unknown names stay visible. */
export function interpolate(template: string, values: FunLabValues, locale?: string): string {
  return template.replace(PLACEHOLDER, (whole, sign: string, name: string) => {
    const v = values[name];
    if (v === undefined || v === null) return whole;
    return typeof v === "number" ? formatNumber(v, locale, sign === "+") : v;
  });
}

/**
 * As `interpolate`, but returns React nodes with every number isolated as
 * left-to-right (`<bdi dir="ltr">`). In an RTL page a number keeps its digit
 * order and cannot pull neighbouring punctuation across it, while the words
 * around it follow the page.
 */
export function interpolateNodes(template: string, values: FunLabValues, locale?: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of template.matchAll(PLACEHOLDER)) {
    const [whole, sign, name] = match;
    const at = match.index ?? 0;
    if (at > last) out.push(template.slice(last, at));
    const v = values[name!];
    if (v === undefined || v === null) {
      out.push(whole);
    } else if (typeof v === "number") {
      out.push(createElement("bdi", { key: key++, dir: "ltr" }, formatNumber(v, locale, sign === "+")));
    } else {
      out.push(v);
    }
    last = at + whole.length;
  }
  if (last < template.length) out.push(template.slice(last));
  return out;
}

/** A standalone number, isolated left-to-right. */
export function ltrNumber(value: number, locale?: string): ReactNode {
  return createElement("bdi", { dir: "ltr" }, formatNumber(value, locale));
}
