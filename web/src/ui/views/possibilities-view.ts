import type { Summary } from "../../simulation/simulator-service";
import { el } from "../dom";
import { count } from "../format";

/** Shows how many states each subshell has and how many microstates the configuration has. */
export class PossibilitiesView {
  constructor(private readonly body: HTMLTableSectionElement) {}

  render(summary: Summary): void {
    const rows = summary.subshells.map((subshell) =>
      el(
        "tr",
        {},
        el("th", { scope: "row" }, subshell.symbol),
        el("td", {}, `${subshell.electrons} / ${subshell.capacity}`),
        el("td", { class: "text-end" }, count(subshell.states)),
      ),
    );
    rows.push(
      el(
        "tr",
        { class: "table-group-divider fw-semibold" },
        el("th", { scope: "row" }, "Total"),
        el("td"),
        el("td", { class: "text-end" }, count(summary.microstates)),
      ),
    );
    this.body.replaceChildren(...rows);
  }
}
