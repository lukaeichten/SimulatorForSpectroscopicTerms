/** Formatting of physical quantities for display. */
import type { Occupancy, TermInfo } from "../simulation/simulator-service";
import { el, fragment, type Child } from "./dom";

/** Arrow glyphs of the orbital occupations. */
export const OCCUPANCY_SYMBOLS: Readonly<Record<Occupancy, string>> = {
  empty: "",
  up: "↿",
  down: "⇂",
  paired: "⥮",
};

/** Screen reader labels of the orbital occupations. */
export const OCCUPANCY_LABELS: Readonly<Record<Occupancy, string>> = {
  empty: "empty",
  up: "spin up",
  down: "spin down",
  paired: "paired",
};

/** A number that is an integer or an odd multiple of ½, split for display. */
export interface HalfIntegerParts {
  readonly negative: boolean;
  /** Numerator of the absolute value. */
  readonly numerator: number;
  /** `1` for integers, `2` for odd multiples of ½. */
  readonly denominator: 1 | 2;
}

/** Splits a multiple of ½ into sign, numerator and denominator. */
export function halfIntegerParts(value: number): HalfIntegerParts {
  const twice = Math.round(Math.abs(value) * 2);
  const negative = value < 0;
  return twice % 2 === 0
    ? { negative, numerator: twice / 2, denominator: 1 }
    : { negative, numerator: twice, denominator: 2 };
}

/** Formats an integer with a typographic minus sign, e.g. `−2`. */
export function signed(value: number): string {
  return value < 0 ? `\u2212${Math.abs(value)}` : String(value);
}

/** Formats a multiple of ½ as plain text, e.g. `−3/2`. */
export function halfIntegerText(value: number): string {
  const { negative, numerator, denominator } = halfIntegerParts(value);
  const sign = negative ? "−" : "";
  return denominator === 1 ? `${sign}${numerator}` : `${sign}${numerator}/2`;
}

/** Renders a multiple of ½, using a stacked fraction for odd multiples. */
export function halfInteger(value: number): Node {
  const { negative, numerator, denominator } = halfIntegerParts(value);
  const sign = negative ? "−" : "";
  if (denominator === 1) {
    return document.createTextNode(`${sign}${numerator}`);
  }
  return el(
    "span",
    { class: "fraction", "aria-label": halfIntegerText(value) },
    sign,
    el("sup", {}, numerator),
    "⁄",
    el("sub", {}, 2),
  );
}

/** Formats a term symbol without `J`, e.g. `3P`, for plain text contexts. */
export function termText(term: TermInfo): string {
  return `${term.multiplicity}${term.letter}`;
}

/** Renders the term symbols `^{2S+1}L_J` for every possible `J`, separated by commas. */
export function termSymbols(term: TermInfo): Node {
  const symbols: Child[] = [];
  term.totalAngularMomenta.forEach((j, index) => {
    if (index > 0) {
      symbols.push(", ");
    }
    symbols.push(
      el(
        "span",
        { class: "term-symbol" },
        el("sup", {}, term.multiplicity),
        term.letter,
        el("sub", {}, halfInteger(j)),
      ),
    );
  });
  return fragment(...symbols);
}

const integerFormat = new Intl.NumberFormat("en-US");

/** Formats a count with thousands separators. */
export function count(value: number): string {
  return integerFormat.format(value);
}
