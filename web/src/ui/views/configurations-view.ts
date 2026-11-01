import type { TermMatch, TermView } from "../../simulation/query";
import type {
  MicrostateInfo,
  MicrostatePage,
  SubshellKindInfo,
  TermInfo,
} from "../../simulation/simulator-service";
import { el, type Child } from "../dom";
import {
  count,
  signed,
  halfInteger,
  halfIntegerText,
  OCCUPANCY_LABELS,
  OCCUPANCY_SYMBOLS,
  applyTermColour,
  termLabel,
  termText,
} from "../format";
import { PaginationControls } from "./pagination-controls";

export interface ConfigurationsViewElements {
  readonly head: HTMLTableSectionElement;
  readonly body: HTMLTableSectionElement;
  readonly summary: HTMLElement;
  /** Scrollable container of the table; scrolled to the top when another page is shown. */
  readonly scroller: HTMLElement;
  readonly paginationTop: HTMLElement;
  readonly paginationBottom: HTMLElement;
}

/** What the configurations table needs to know about the terms. */
export interface TermContext {
  /** All terms of the configuration. */
  readonly terms: readonly TermInfo[];
  /** One-based numbers of the selected terms. */
  readonly selected: readonly number[];
  readonly view: TermView;
  readonly match: TermMatch;
}

/** The paged table of configurations (microstates) with one column per orbital. */
export class ConfigurationsView {
  private readonly paginations: PaginationControls[];

  constructor(
    private readonly elements: ConfigurationsViewElements,
    kinds: readonly SubshellKindInfo[],
    onPageChange: (page: number) => void,
  ) {
    elements.head.replaceChildren(ConfigurationsView.headerRow(kinds));
    this.paginations = [elements.paginationTop, elements.paginationBottom].map(
      (container) => new PaginationControls(container, onPageChange),
    );
  }

  /**
   * @param page the configurations to show
   * @param context the terms, used for the Term column, the tint and the summary
   */
  render(page: MicrostatePage, context: TermContext): void {
    this.elements.summary.textContent = ConfigurationsView.summary(page, context);
    this.elements.body.replaceChildren(
      ...page.items.map((microstate) => ConfigurationsView.row(microstate, context)),
    );
    this.elements.scroller.scrollTop = 0;
    for (const pagination of this.paginations) {
      pagination.render(page.pageIndex + 1, page.pageCount);
    }
    const paged = page.pageCount > 1;
    this.elements.paginationTop.hidden = this.elements.paginationBottom.hidden = !paged;
  }

  private static summary(page: MicrostatePage, context: TermContext): string {
    const first = page.items[0]?.position ?? 0;
    const last = page.items.at(-1)?.position ?? 0;
    const range =
      page.totalItems === 0
        ? "No configurations"
        : `${count(first)}–${count(last)} of ${count(page.totalItems)}`;
    const names = context.selected
      .flatMap((number) => {
        const term = context.terms[number - 1];
        return term ? [termText(term)] : [];
      })
      .join(", ");

    if (context.view === "colour") {
      return names ? `${range}, highlighting ${names}` : `${range}, coloured by term`;
    }
    if (!names) {
      return range;
    }
    return context.match === "exact"
      ? `${range} assigned to ${names}`
      : `${range} that can belong to ${names}`;
  }

  private static headerRow(kinds: readonly SubshellKindInfo[]): HTMLTableRowElement {
    const row = el("tr", {}, el("th", { scope: "col" }, "#"));
    for (const kind of kinds) {
      kind.magneticNumbers.forEach((ml, index) => {
        // A single orbital (s) needs no m_l subscript.
        const label: Child[] =
          kind.magneticNumbers.length === 1
            ? [kind.symbol]
            : [kind.symbol, el("sub", {}, signed(ml))];
        const classes = index === 0 ? "orbital subshell-start" : "orbital";
        row.append(el("th", { scope: "col", class: classes }, ...label));
      });
    }
    row.append(
      el("th", { scope: "col", class: "subshell-start" }, "M", el("sub", {}, "L")),
      el("th", { scope: "col" }, "M", el("sub", {}, "S")),
      el("th", { scope: "col", class: "subshell-start" }, "Term"),
    );
    return row;
  }

  private static row(microstate: MicrostateInfo, context: TermContext): HTMLTableRowElement {
    const row = el(
      "tr",
      {},
      el(
        "th",
        { scope: "row", title: `Configuration ${count(microstate.index + 1)} of all` },
        count(microstate.position),
      ),
    );
    for (const subshell of microstate.subshells) {
      subshell.forEach((occupancy, index) => {
        const classes = index === 0 ? "orbital subshell-start" : "orbital";
        row.append(
          el(
            "td",
            {
              class: `${classes} occupancy-${occupancy}`,
              "aria-label": OCCUPANCY_LABELS[occupancy],
            },
            OCCUPANCY_SYMBOLS[occupancy],
          ),
        );
      });
    }
    row.append(
      el("td", { class: "subshell-start" }, signed(microstate.ml)),
      el("td", { "aria-label": halfIntegerText(microstate.ms) }, halfInteger(microstate.ms)),
      el("td", { class: "subshell-start" }, ConfigurationsView.termCell(microstate, context)),
    );
    if (ConfigurationsView.isTinted(microstate, context)) {
      row.classList.add("term-tint");
      applyTermColour(row, microstate.term);
    }
    return row;
  }

  /** In the colour view, a selection narrows the tint down to the selected terms. */
  private static isTinted(microstate: MicrostateInfo, context: TermContext): boolean {
    return (
      context.view === "colour" &&
      (context.selected.length === 0 || context.selected.includes(microstate.term + 1))
    );
  }

  private static termCell(microstate: MicrostateInfo, context: TermContext): Child {
    const term = context.terms[microstate.term];
    return term ? termLabel(term) : "";
  }
}
