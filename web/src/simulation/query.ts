/**
 * Encoding of a simulation run in the query string, e.g.
 * `?p=2&d=1&term=1&term=3&view=colour&match=box&page=2`.
 *
 * - One parameter per subshell symbol (`s`, `p`, `d`, `f`) holds its electron count; `0` is the
 *   default and is omitted.
 * - `term` (repeatable) selects terms by their one-based position in the term list.
 * - `view` is `filter` (default: the selected terms filter the configuration list) or `colour`
 *   (every configuration is listed and tinted by its term; the selected terms are highlighted).
 * - `match` is `exact` (default: the configurations assigned to the selected terms) or `box`
 *   (every configuration that can belong to them). Only the filter view uses it.
 * - `page` is the one-based page of the configuration list; `1` is the default and is omitted.
 *
 * The module is pure (no DOM access) so it can be unit tested and reused.
 */

/** How the selected terms affect the configuration list. */
export type TermView = "filter" | "colour";

/** Which configurations the filter view lists for the selected terms. */
export type TermMatch = "exact" | "box";

export const TERM_VIEWS: readonly TermView[] = ["filter", "colour"];
export const TERM_MATCHES: readonly TermMatch[] = ["exact", "box"];

/** The parameters of one simulation run. */
export interface SimulationQuery {
  /** Electron count per subshell, in the order of the subshell kinds. */
  readonly electrons: readonly number[];
  /** Selected terms as one-based indices into the term list, ascending and unique. */
  readonly terms: readonly number[];
  readonly view: TermView;
  /** Kept in the colour view (where it has no effect) so switching back restores it. */
  readonly match: TermMatch;
  /** One-based page of the configuration list. */
  readonly page: number;
}

/** What the query encoding needs to know about a subshell kind. */
export interface SubshellLimit {
  readonly symbol: string;
  readonly capacity: number;
}

/** A parsed query together with the problems found in the input. */
export interface ParsedQuery {
  readonly query: SimulationQuery;
  /** Human readable descriptions of ignored or corrected parameters. */
  readonly problems: readonly string[];
}

export const TERM_PARAMETER = "term";
export const VIEW_PARAMETER = "view";
export const MATCH_PARAMETER = "match";
export const PAGE_PARAMETER = "page";

const DEFAULT_VIEW: TermView = "filter";
const DEFAULT_MATCH: TermMatch = "exact";

/** Returns the query of an empty configuration. */
export function defaultQuery(subshells: readonly SubshellLimit[]): SimulationQuery {
  return {
    electrons: subshells.map(() => 0),
    terms: [],
    view: DEFAULT_VIEW,
    match: DEFAULT_MATCH,
    page: 1,
  };
}

/**
 * Parses a query string. Invalid values never fail the parsing: they fall back to their
 * defaults and are reported in {@link ParsedQuery.problems}.
 */
export function parseQuery(
  search: string | URLSearchParams,
  subshells: readonly SubshellLimit[],
): ParsedQuery {
  const parameters = typeof search === "string" ? new URLSearchParams(search) : search;
  const problems: string[] = [];

  const electrons = subshells.map(({ symbol, capacity }) => {
    const raw = parameters.get(symbol);
    if (raw === null || raw === "") {
      return 0;
    }
    const value = parseNonNegativeInteger(raw);
    if (value === undefined || value > capacity) {
      problems.push(`Ignored ${symbol}=${raw}: expected a whole number from 0 to ${capacity}.`);
      return 0;
    }
    return value;
  });

  const terms = new Set<number>();
  for (const raw of parameters.getAll(TERM_PARAMETER)) {
    const value = parseNonNegativeInteger(raw);
    if (value === undefined || value === 0) {
      problems.push(`Ignored ${TERM_PARAMETER}=${raw}: expected a term number starting at 1.`);
    } else {
      terms.add(value);
    }
  }

  const view = parseChoice(parameters, VIEW_PARAMETER, TERM_VIEWS, DEFAULT_VIEW, problems);
  const match = parseChoice(parameters, MATCH_PARAMETER, TERM_MATCHES, DEFAULT_MATCH, problems);

  let page = 1;
  const rawPage = parameters.get(PAGE_PARAMETER);
  if (rawPage !== null && rawPage !== "") {
    const value = parseNonNegativeInteger(rawPage);
    if (value === undefined || value === 0) {
      problems.push(`Ignored ${PAGE_PARAMETER}=${rawPage}: expected a page number starting at 1.`);
    } else {
      page = value;
    }
  }

  return { query: { electrons, terms: sortedUnique(terms), view, match, page }, problems };
}

/** Encodes a query as a query string without the leading `?`, omitting default values. */
export function formatQuery(query: SimulationQuery, subshells: readonly SubshellLimit[]): string {
  const parameters = new URLSearchParams();
  subshells.forEach(({ symbol }, index) => {
    const electrons = query.electrons[index] ?? 0;
    if (electrons !== 0) {
      parameters.set(symbol, String(electrons));
    }
  });
  for (const term of sortedUnique(query.terms)) {
    parameters.append(TERM_PARAMETER, String(term));
  }
  if (query.view !== DEFAULT_VIEW) {
    parameters.set(VIEW_PARAMETER, query.view);
  }
  if (query.match !== DEFAULT_MATCH) {
    parameters.set(MATCH_PARAMETER, query.match);
  }
  if (query.page !== 1) {
    parameters.set(PAGE_PARAMETER, String(query.page));
  }
  return parameters.toString();
}

/** Removes the selected terms that do not exist in a term list of length `termCount`. */
export function restrictTerms(query: SimulationQuery, termCount: number): ParsedQuery {
  const valid = query.terms.filter((term) => term <= termCount);
  const problems = query.terms
    .filter((term) => term > termCount)
    .map((term) => `Ignored ${TERM_PARAMETER}=${term}: the configuration has ${termCount} terms.`);
  return { query: { ...query, terms: valid }, problems };
}

/**
 * Returns the query with the term toggled. In the filter view the list changes, so the page is
 * reset to the first one; in the colour view only the highlighting changes, so the page is kept.
 */
export function toggleTerm(query: SimulationQuery, term: number): SimulationQuery {
  const terms = query.terms.includes(term)
    ? query.terms.filter((selected) => selected !== term)
    : [...query.terms, term];
  const page = query.view === "filter" ? 1 : query.page;
  return { ...query, terms: sortedUnique(terms), page };
}

/** Returns the query with another view, keeping the selected terms, on the first page. */
export function setView(query: SimulationQuery, view: TermView): SimulationQuery {
  return { ...query, view, page: 1 };
}

/** Returns the query with another match mode, on the first page. */
export function setMatch(query: SimulationQuery, match: TermMatch): SimulationQuery {
  return { ...query, match, page: 1 };
}

/** Reads a parameter that must be one of `choices`; missing and invalid values yield `fallback`. */
function parseChoice<T extends string>(
  parameters: URLSearchParams,
  name: string,
  choices: readonly T[],
  fallback: T,
  problems: string[],
): T {
  const raw = parameters.get(name);
  if (raw === null || raw === "") {
    return fallback;
  }
  const choice = choices.find((candidate) => candidate === raw);
  if (choice === undefined) {
    problems.push(`Ignored ${name}=${raw}: expected ${choices.join(" or ")}.`);
    return fallback;
  }
  return choice;
}

function parseNonNegativeInteger(raw: string): number | undefined {
  return /^\d{1,9}$/.test(raw.trim()) ? Number.parseInt(raw, 10) : undefined;
}

function sortedUnique(values: Iterable<number>): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}
