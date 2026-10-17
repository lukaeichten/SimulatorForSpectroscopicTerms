import type { SubshellKindInfo } from "../../simulation/simulator-service";
import { el } from "../dom";

export interface ConfigurationFormHandlers {
  /** Called with the electron counts (ordered like the subshell kinds) when the form is submitted. */
  onSimulate(electrons: number[]): void;
  /** Called when the user wants to share the current run; resolves to `true` on success. */
  onShare(): Promise<boolean>;
}

/** The input form for the electron configuration, with one number input per subshell. */
export class ConfigurationForm {
  private readonly inputs: HTMLInputElement[];
  private readonly shareButton: HTMLButtonElement;

  constructor(
    private readonly form: HTMLFormElement,
    kinds: readonly SubshellKindInfo[],
    private readonly handlers: ConfigurationFormHandlers,
  ) {
    this.inputs = kinds.map((kind) =>
      el("input", {
        type: "number",
        class: "form-control electron-input",
        id: `electrons-${kind.symbol}`,
        name: kind.symbol,
        min: "0",
        max: String(kind.capacity),
        step: "1",
        value: "0",
        required: "",
        inputmode: "numeric",
        "aria-label": `Electrons in the ${kind.symbol} subshell (0 to ${kind.capacity})`,
      }),
    );

    const groups = kinds.map((kind, index) =>
      el(
        "div",
        { class: "input-group subshell-input-group" },
        el("label", { class: "input-group-text", for: `electrons-${kind.symbol}` }, kind.symbol),
        this.inputs[index] as HTMLInputElement,
      ),
    );
    const simulateButton = el("button", { type: "submit", class: "btn btn-primary" }, "Simulate");

    this.shareButton = el(
      "button",
      {
        type: "button",
        class: "btn btn-outline-primary",
        title: "Copy a link to this simulation",
      },
      "Copy link",
    );

    form.replaceChildren(...groups, simulateButton, this.shareButton);
    form.addEventListener("submit", (event) => this.submit(event));
    this.shareButton.addEventListener("click", () => void this.share());
  }

  /** Shows the given electron counts in the inputs. */
  setElectrons(electrons: readonly number[]): void {
    this.inputs.forEach((input, index) => {
      input.value = String(electrons[index] ?? 0);
    });
  }

  private submit(event: SubmitEvent): void {
    event.preventDefault();
    if (this.form.reportValidity()) {
      this.handlers.onSimulate(this.inputs.map((input) => input.valueAsNumber));
    }
  }

  private async share(): Promise<void> {
    const copied = await this.handlers.onShare();
    this.shareButton.textContent = copied ? "Link copied" : "Copy failed";
    window.setTimeout(() => {
      this.shareButton.textContent = "Copy link";
    }, 2000);
  }
}
