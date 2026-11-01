import type { TermView } from "../../simulation/query";
import type { TermInfo } from "../../simulation/simulator-service";
import { el } from "../dom";
import { applyTermColour, count, halfInteger, termSymbols, termText } from "../format";

export interface TermsViewHandlers {
  /** Called with the one-based number of the term whose selection is toggled. */
  onToggle(term: number): void;
  /** Called when the whole selection is cleared. */
  onClear(): void;
}

/**
 * The table of terms ("groups"). Clicking a term toggles its selection, which filters the
 * configurations in the filter view and highlights them in the colour view.
 */
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
   * @param view decides what selecting a term means, which the tooltips describe
   */
  render(terms: readonly TermInfo[], selected: readonly number[], view: TermView): void {
    const rows = terms.map((term, index) =>
      this.row(term, index + 1, selected.includes(index + 1), view),
    );
    this.body.replaceChildren(...rows);
    this.clearButton.hidden = selected.length === 0;
  }

  private row(
    term: TermInfo,
    number: number,
    isSelected: boolean,
    view: TermView,
  ): HTMLTableRowElement {
    const swatch = el("span", { class: "term-swatch", "aria-hidden": "true" });
    applyTermColour(swatch, number - 1);
    const row = el(
      "tr",
      {
        class: isSelected ? "term-row is-selected" : "term-row",
        role: "button",
        tabindex: "0",
        "aria-pressed": String(isSelected),
        title: toggleTitle(termText(term), isSelected, view),
      },
      el("th", { scope: "row" }, swatch, number),
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

function toggleTitle(name: string, isSelected: boolean, view: TermView): string {
  if (view === "colour") {
    return isSelected ? `Stop highlighting ${name}` : `Highlight ${name}`;
  }
  return isSelected ? `Remove ${name} from the filter` : `Add ${name} to the filter`;
}
