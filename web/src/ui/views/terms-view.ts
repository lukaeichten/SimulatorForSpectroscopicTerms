import type { TermInfo } from "../../simulation/simulator-service";
import { el } from "../dom";
import { count, halfInteger, termSymbols, termText } from "../format";

export interface TermsViewHandlers {
  /** Called with the one-based number of the term whose selection is toggled. */
  onToggle(term: number): void;
  /** Called when the whole selection is cleared. */
  onClear(): void;
}

/** The table of terms ("groups"). Clicking a term toggles it as filter of the configurations. */
export class TermsView {
  constructor(
    private readonly body: HTMLTableSectionElement,
    private readonly clearButton: HTMLButtonElement,
    private readonly handlers: TermsViewHandlers,
  ) {
    clearButton.addEventListener("click", () => handlers.onClear());
  }

  /**
   * @param terms all terms of the configuration
   * @param selected one-based numbers of the selected terms
   */
  render(terms: readonly TermInfo[], selected: readonly number[]): void {
    const rows = terms.map((term, index) =>
      this.row(term, index + 1, selected.includes(index + 1)),
    );
    this.body.replaceChildren(...rows);
    this.clearButton.hidden = selected.length === 0;
  }

  private row(term: TermInfo, number: number, isSelected: boolean): HTMLTableRowElement {
    const row = el(
      "tr",
      {
        class: isSelected ? "term-row is-selected" : "term-row",
        role: "button",
        tabindex: "0",
        "aria-pressed": String(isSelected),
        title: `${isSelected ? "Remove" : "Add"} ${termText(term)} ${isSelected ? "from" : "to"} the filter`,
      },
      el("th", { scope: "row" }, number),
      el("td", {}, term.orbital),
      el("td", {}, halfInteger(term.spin)),
      el("td", {}, count(term.count)),
      el("td", {}, termSymbols(term)),
    );
    row.addEventListener("click", () => this.handlers.onToggle(number));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.handlers.onToggle(number);
      }
    });
    return row;
  }
}
