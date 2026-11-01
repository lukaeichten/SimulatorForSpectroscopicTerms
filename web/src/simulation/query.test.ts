import { describe, expect, it } from "vitest";

import {
  defaultQuery,
  formatQuery,
  parseQuery,
  restrictTerms,
  setMatch,
  setView,
  toggleTerm,
  type SimulationQuery,
  type SubshellLimit,
} from "./query";

/** Display settings of the default query, to keep the expectations short. */
const DEFAULTS = { view: "filter", match: "exact" } as const;

const SUBSHELLS: SubshellLimit[] = [
  { symbol: "s", capacity: 2 },
  { symbol: "p", capacity: 6 },
  { symbol: "d", capacity: 10 },
  { symbol: "f", capacity: 14 },
];

describe("parseQuery", () => {
  it("treats missing subshells as empty", () => {
    const { query, problems } = parseQuery("s=0&p=1&d=3", SUBSHELLS);
    expect(query).toEqual({ electrons: [0, 1, 3, 0], terms: [], ...DEFAULTS, page: 1 });
    expect(problems).toEqual([]);
  });

  it("returns the default query for an empty string", () => {
    expect(parseQuery("", SUBSHELLS).query).toEqual(defaultQuery(SUBSHELLS));
  });

  it("reads terms and the page", () => {
    const { query } = parseQuery("?d=2&term=3&term=1&term=3&page=4", SUBSHELLS);
    expect(query).toEqual({ electrons: [0, 0, 2, 0], terms: [1, 3], ...DEFAULTS, page: 4 });
  });

  it("reports and ignores invalid values", () => {
    const { query, problems } = parseQuery("p=7&d=-1&f=x&term=0&page=abc", SUBSHELLS);
    expect(query).toEqual(defaultQuery(SUBSHELLS));
    expect(problems).toHaveLength(5);
    expect(problems[0]).toContain("p=7");
  });

  it("reads the view and the match mode", () => {
    const { query, problems } = parseQuery("s=1&p=1&view=colour&match=box", SUBSHELLS);
    expect(query).toMatchObject({ view: "colour", match: "box" });
    expect(problems).toEqual([]);
  });

  it("reports and ignores an invalid view or match mode", () => {
    const { query, problems } = parseQuery("view=x&match=y", SUBSHELLS);
    expect(query).toEqual(defaultQuery(SUBSHELLS));
    expect(problems).toEqual([
      "Ignored view=x: expected filter or colour.",
      "Ignored match=y: expected exact or box.",
    ]);
  });
});

describe("formatQuery", () => {
  it("omits default values", () => {
    expect(
      formatQuery({ electrons: [0, 1, 3, 0], terms: [], ...DEFAULTS, page: 1 }, SUBSHELLS),
    ).toBe("p=1&d=3");
    expect(formatQuery(defaultQuery(SUBSHELLS), SUBSHELLS)).toBe("");
  });

  it("round-trips through parseQuery", () => {
    const query: SimulationQuery = {
      electrons: [2, 0, 5, 1],
      terms: [2, 7],
      view: "colour",
      match: "box",
      page: 3,
    };
    const encoded = formatQuery(query, SUBSHELLS);
    expect(encoded).toBe("s=2&d=5&f=1&term=2&term=7&view=colour&match=box&page=3");
    expect(parseQuery(encoded, SUBSHELLS).query).toEqual(query);
  });
});

describe("term selection", () => {
  const query: SimulationQuery = { electrons: [0, 2, 0, 0], terms: [1], ...DEFAULTS, page: 5 };

  it("toggles terms and resets the page in the filter view", () => {
    expect(toggleTerm(query, 3)).toEqual({ ...query, terms: [1, 3], page: 1 });
    expect(toggleTerm(query, 1)).toEqual({ ...query, terms: [], page: 1 });
  });

  it("keeps the page when toggling terms in the colour view", () => {
    const colour: SimulationQuery = { ...query, view: "colour" };
    expect(toggleTerm(colour, 2)).toEqual({ ...colour, terms: [1, 2], page: 5 });
  });

  it("resets the page when the view or the match mode changes", () => {
    expect(setView(query, "colour")).toEqual({ ...query, view: "colour", page: 1 });
    expect(setMatch(query, "box")).toEqual({ ...query, match: "box", page: 1 });
  });

  it("drops terms that do not exist", () => {
    const { query, problems } = restrictTerms(
      { electrons: [0, 2, 0, 0], terms: [1, 4], ...DEFAULTS, page: 1 },
      3,
    );
    expect(query.terms).toEqual([1]);
    expect(problems).toHaveLength(1);
  });
});
