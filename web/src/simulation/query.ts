/**
 * Encoding of a simulation run in the query string, e.g. `?p=2&d=1&term=1&term=3&page=2`.
 *
 * - One parameter per subshell symbol (`s`, `p`, `d`, `f`) holds its electron count; `0` is the
 *   default and is omitted.
 * - `term` (repeatable) selects terms by their one-based position in the term list; only the
 *   configurations that may belong to one of the selected terms are listed.
 * - `page` is the one-based page of the configuration list; `1` is the default and is omitted.
 *
 * The module is pure (no DOM access) so it can be unit tested and reused.
 */

/** The parameters of one simulation run. */
export interface SimulationQuery {
  /** Electron count per subshell, in the order of the subshell kinds. */
  readonly electrons: readonly number[];
  /** Selected terms as one-based indices into the term list, ascending and unique. */
  readonly terms: readonly number[];
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
export const PAGE_PARAMETER = "page";

/** Returns the query of an empty configuration. */
export function defaultQuery(subshells: readonly SubshellLimit[]): SimulationQuery {
  return { electrons: subshells.map(() => 0), terms: [], page: 1 };
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

  return { query: { electrons, terms: sortedUnique(terms), page }, problems };
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

/** Returns the query with the term toggled and the page reset to the first one. */
export function toggleTerm(query: SimulationQuery, term: number): SimulationQuery {
  const terms = query.terms.includes(term)
    ? query.terms.filter((selected) => selected !== term)
    : [...query.terms, term];
  return { ...query, terms: sortedUnique(terms), page: 1 };
}

function parseNonNegativeInteger(raw: string): number | undefined {
  return /^\d{1,9}$/.test(raw.trim()) ? Number.parseInt(raw, 10) : undefined;
}

function sortedUnique(values: Iterable<number>): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}
