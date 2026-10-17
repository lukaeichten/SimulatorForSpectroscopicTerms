import { el } from "../dom";
import { THEME_PREFERENCES, type ThemePreference } from "../theme";

const LABELS: Readonly<Record<ThemePreference, string>> = {
  auto: "Auto",
  light: "Light",
  dark: "Dark",
};

const TITLES: Readonly<Record<ThemePreference, string>> = {
  auto: "Follow the colour scheme of the operating system",
  light: "Always use the light theme",
  dark: "Always use the dark theme",
};

/** SVG shapes of the 16 × 16 icons (drawn with `currentColor`). */
const ICONS: Readonly<Record<ThemePreference, string>> = {
  auto: '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 2a6 6 0 0 1 0 12z" fill="currentColor"/>',
  light:
    '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8" r="3"/><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06"/></g>',
  dark: '<path d="M13.5 9.6A5.75 5.75 0 0 1 6.4 2.5a5.75 5.75 0 1 0 7.1 7.1z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
};

/** Segmented control in the header to choose between the automatic, light and dark theme. */
export class ThemeSwitch {
  private readonly inputs: ReadonlyMap<ThemePreference, HTMLInputElement>;

  constructor(container: HTMLElement, onSelect: (preference: ThemePreference) => void) {
    const inputs = new Map<ThemePreference, HTMLInputElement>();
    for (const preference of THEME_PREFERENCES) {
      const id = `theme-${preference}`;
      const input = el("input", {
        type: "radio",
        class: "btn-check",
        name: "theme",
        id,
        value: preference,
        autocomplete: "off",
      });
      input.addEventListener("change", () => onSelect(preference));
      const label = el(
        "label",
        { class: "btn app-header-link", for: id, title: TITLES[preference] },
        icon(preference),
        LABELS[preference],
      );
      container.append(input, label);
      inputs.set(preference, input);
    }
    this.inputs = inputs;
  }

  render(selected: ThemePreference): void {
    for (const [preference, input] of this.inputs) {
      input.checked = preference === selected;
    }
  }
}

function icon(preference: ThemePreference): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "theme-icon");
  svg.innerHTML = ICONS[preference];
  return svg;
}
