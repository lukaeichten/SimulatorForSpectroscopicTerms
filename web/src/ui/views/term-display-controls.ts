import { TERM_VIEWS, type TermMatch, type TermView } from "../../simulation/query";
import { el } from "../dom";

export interface TermDisplayHandlers {
  onViewChange(view: TermView): void;
  onMatchChange(match: TermMatch): void;
}

const VIEW_LABELS: Readonly<Record<TermView, string>> = {
  filter: "Filter",
  colour: "Colour",
};

/** Controls of the Terms card that choose how the selected terms affect the configurations. */
export class TermDisplayControls {
  private readonly viewInputs: ReadonlyMap<TermView, HTMLInputElement>;
  private readonly matchSwitch: HTMLElement;
  private readonly boxInput: HTMLInputElement;

  /**
   * @param container element that receives the controls
   * @param help footer text of the Terms card, which explains the current view
   */
  constructor(
    container: HTMLElement,
    private readonly help: HTMLElement,
    handlers: TermDisplayHandlers,
  ) {
    const group = el("div", {
      class: "btn-group btn-group-sm",
      role: "radiogroup",
      "aria-label": "Term display",
    });
    const viewInputs = new Map<TermView, HTMLInputElement>();
    for (const view of TERM_VIEWS) {
      const id = `term-view-${view}`;
      const input = el("input", {
        type: "radio",
        class: "btn-check",
        name: "term-view",
        id,
        value: view,
        autocomplete: "off",
      });
      input.addEventListener("change", () => handlers.onViewChange(view));
      group.append(
        input,
        el("label", { class: "btn btn-outline-primary", for: id }, VIEW_LABELS[view]),
      );
      viewInputs.set(view, input);
    }
    this.viewInputs = viewInputs;

    this.boxInput = el("input", {
      type: "checkbox",
      class: "form-check-input",
      role: "switch",
      id: "term-match-box",
    });
    this.boxInput.addEventListener("change", () =>
      handlers.onMatchChange(this.boxInput.checked ? "box" : "exact"),
    );
    this.matchSwitch = el(
      "div",
      { class: "form-check form-switch mb-0" },
      this.boxInput,
      el(
        "label",
        { class: "form-check-label small", for: "term-match-box" },
        "Include every microstate that can belong",
      ),
    );

    container.replaceChildren(group, this.matchSwitch);
  }

  render(view: TermView, match: TermMatch): void {
    for (const [candidate, input] of this.viewInputs) {
      input.checked = candidate === view;
    }
    this.boxInput.checked = match === "box";
    // A box overlaps other boxes, so it cannot be coloured with a single term.
    this.matchSwitch.hidden = view === "colour";
    this.help.replaceChildren(...helpText(view, match));
  }
}

function helpText(view: TermView, match: TermMatch): (Node | string)[] {
  if (view === "colour") {
    return [
      "Every microstate is coloured by the term it is assigned to. Select terms to highlight only them.",
    ];
  }
  if (match === "box") {
    return [
      "Select terms to list every microstate that can belong to them (|M",
      el("sub", {}, "L"),
      "| ≤ L and |M",
      el("sub", {}, "S"),
      "| ≤ S).",
    ];
  }
  return ["Select terms to list exactly the microstates assigned to them."];
}
