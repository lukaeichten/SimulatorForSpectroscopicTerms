import { describe, expect, it } from "vitest";

import {
  defaultQuery,
  formatQuery,
  parseQuery,
  restrictTerms,
  toggleTerm,
  type SubshellLimit,
} from "./query";

const SUBSHELLS: SubshellLimit[] = [
  { symbol: "s", capacity: 2 },
  { symbol: "p", capacity: 6 },
  { symbol: "d", capacity: 10 },
  { symbol: "f", capacity: 14 },
];

describe("parseQuery", () => {
  it("treats missing subshells as empty", () => {
    const { query, problems } = parseQuery("s=0&p=1&d=3", SUBSHELLS);
    expect(query).toEqual({ electrons: [0, 1, 3, 0], terms: [], page: 1 });
    expect(problems).toEqual([]);
  });

  it("returns the default query for an empty string", () => {
    expect(parseQuery("", SUBSHELLS).query).toEqual(defaultQuery(SUBSHELLS));
  });

  it("reads terms and the page", () => {
    const { query } = parseQuery("?d=2&term=3&term=1&term=3&page=4", SUBSHELLS);
    expect(query).toEqual({ electrons: [0, 0, 2, 0], terms: [1, 3], page: 4 });
  });

  it("reports and ignores invalid values", () => {
    const { query, problems } = parseQuery("p=7&d=-1&f=x&term=0&page=abc", SUBSHELLS);
    expect(query).toEqual(defaultQuery(SUBSHELLS));
    expect(problems).toHaveLength(5);
    expect(problems[0]).toContain("p=7");
  });
});

describe("formatQuery", () => {
  it("omits default values", () => {
    expect(formatQuery({ electrons: [0, 1, 3, 0], terms: [], page: 1 }, SUBSHELLS)).toBe("p=1&d=3");
    expect(formatQuery(defaultQuery(SUBSHELLS), SUBSHELLS)).toBe("");
  });

  it("round-trips through parseQuery", () => {
    const query = { electrons: [2, 0, 5, 1], terms: [2, 7], page: 3 };
    const encoded = formatQuery(query, SUBSHELLS);
    expect(encoded).toBe("s=2&d=5&f=1&term=2&term=7&page=3");
    expect(parseQuery(encoded, SUBSHELLS).query).toEqual(query);
  });
});

describe("term selection", () => {
  it("toggles terms and resets the page", () => {
    const query = { electrons: [0, 2, 0, 0], terms: [1], page: 5 };
    expect(toggleTerm(query, 3)).toEqual({ ...query, terms: [1, 3], page: 1 });
    expect(toggleTerm(query, 1)).toEqual({ ...query, terms: [], page: 1 });
  });

  it("drops terms that do not exist", () => {
    const { query, problems } = restrictTerms(
      { electrons: [0, 2, 0, 0], terms: [1, 4], page: 1 },
      3,
    );
    expect(query.terms).toEqual([1]);
    expect(problems).toHaveLength(1);
  });
});
