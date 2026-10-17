import { el } from "../dom";
import { count } from "../format";

/** First / previous / page input / next / last controls. */
export class PaginationControls {
  private readonly first: HTMLButtonElement;
  private readonly previous: HTMLButtonElement;
  private readonly next: HTMLButtonElement;
  private readonly last: HTMLButtonElement;
  private readonly input: HTMLInputElement;
  private readonly pageCountLabel: HTMLSpanElement;
  private page = 1;
  private pageCount = 1;

  /**
   * @param container element that receives the controls
   * @param onChange called with the one-based page the user navigates to
   */
  constructor(
    container: HTMLElement,
    private readonly onChange: (page: number) => void,
  ) {
    const button = (label: string, text: string) =>
      el(
        "button",
        { type: "button", class: "btn btn-outline-secondary btn-sm", "aria-label": label },
        text,
      );
    this.first = button("First page", "«");
    this.previous = button("Previous page", "‹ Previous");
    this.next = button("Next page", "Next ›");
    this.last = button("Last page", "»");
    this.input = el("input", {
      type: "number",
      class: "form-control form-control-sm page-input",
      min: "1",
      "aria-label": "Page",
    });
    this.pageCountLabel = el("span", { class: "text-nowrap" });

    this.first.addEventListener("click", () => this.go(1));
    this.previous.addEventListener("click", () => this.go(this.page - 1));
    this.next.addEventListener("click", () => this.go(this.page + 1));
    this.last.addEventListener("click", () => this.go(this.pageCount));
    this.input.addEventListener("change", () => this.go(this.input.valueAsNumber));

    container.replaceChildren(
      el(
        "nav",
        { class: "d-flex align-items-center justify-content-center gap-2", "aria-label": "Pages" },
        this.first,
        this.previous,
        el(
          "span",
          { class: "d-flex align-items-center gap-1" },
          "Page",
          this.input,
          this.pageCountLabel,
        ),
        this.next,
        this.last,
      ),
    );
  }

  /** Shows the one-based `page` of `pageCount` pages. */
  render(page: number, pageCount: number): void {
    this.page = page;
    this.pageCount = pageCount;
    this.input.value = String(page);
    this.input.max = String(pageCount);
    this.pageCountLabel.textContent = `of ${count(pageCount)}`;
    this.first.disabled = this.previous.disabled = page <= 1;
    this.next.disabled = this.last.disabled = page >= pageCount;
  }

  private go(page: number): void {
    if (Number.isInteger(page) && page >= 1 && page <= this.pageCount && page !== this.page) {
      this.onChange(page);
    } else {
      this.input.value = String(this.page);
    }
  }
}
