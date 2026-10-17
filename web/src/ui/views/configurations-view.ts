import type {
  MicrostateInfo,
  MicrostatePage,
  SubshellKindInfo,
} from "../../simulation/simulator-service";
import { el, type Child } from "../dom";
import {
  count,
  signed,
  halfInteger,
  halfIntegerText,
  OCCUPANCY_LABELS,
  OCCUPANCY_SYMBOLS,
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
   * @param filter plain text names of the terms used as filter (empty if unfiltered)
   */
  render(page: MicrostatePage, filter: readonly string[]): void {
    const first = page.items[0]?.position ?? 0;
    const last = page.items.at(-1)?.position ?? 0;
    const range =
      page.totalItems === 0
        ? "No configurations"
        : `${count(first)}–${count(last)} of ${count(page.totalItems)}`;
    this.elements.summary.textContent =
      filter.length === 0 ? range : `${range} matching ${filter.join(", ")}`;

    this.elements.body.replaceChildren(...page.items.map(ConfigurationsView.row));
    this.elements.scroller.scrollTop = 0;
    for (const pagination of this.paginations) {
      pagination.render(page.pageIndex + 1, page.pageCount);
    }
    const paged = page.pageCount > 1;
    this.elements.paginationTop.hidden = this.elements.paginationBottom.hidden = !paged;
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
    );
    return row;
  }

  private static row(microstate: MicrostateInfo): HTMLTableRowElement {
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
    );
    return row;
  }
}
