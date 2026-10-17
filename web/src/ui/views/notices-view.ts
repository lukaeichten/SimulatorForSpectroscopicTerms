import { el } from "../dom";

export interface Notice {
  readonly level: "warning" | "danger";
  readonly text: string;
}

/** Shows warnings (e.g. ignored query parameters) and errors above the results. */
export class NoticesView {
  constructor(private readonly container: HTMLElement) {}

  render(notices: readonly Notice[]): void {
    this.container.replaceChildren(
      ...notices.map(({ level, text }) =>
        el("div", { class: `alert alert-${level} py-2 mb-2`, role: "alert" }, text),
      ),
    );
  }
}
