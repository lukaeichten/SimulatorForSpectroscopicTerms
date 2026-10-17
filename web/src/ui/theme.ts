/**
 * Colour theme handling.
 *
 * The preference is stored under the same `localStorage` key as the documentation site
 * (Docusaurus stores `"light"` or `"dark"` under `theme` and removes the key to follow the
 * operating system), so both parts of the site share one setting. The inline script in
 * `index.html` applies the stored theme before the first paint and must stay in sync with
 * `parseThemePreference` and `resolveTheme`.
 */

export const THEME_PREFERENCES = ["auto", "light", "dark"] as const;

/** What the visitor chose; `auto` follows the operating system. */
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

/** The theme that is actually shown. */
export type Theme = Exclude<ThemePreference, "auto">;

const STORAGE_KEY = "theme";

/** Interprets a stored value; anything unknown (including a missing value) means `auto`. */
export function parseThemePreference(stored: string | null): ThemePreference {
  return stored === "light" || stored === "dark" ? stored : "auto";
}

/** Returns the theme to show for a preference. */
export function resolveTheme(preference: ThemePreference, prefersDark: boolean): Theme {
  if (preference !== "auto") {
    return preference;
  }
  return prefersDark ? "dark" : "light";
}

/**
 * Applies the theme preference to the page, persists changes and follows changes of the
 * operating system's colour scheme and of the preference in other tabs.
 */
export class ThemeManager {
  private readonly media = window.matchMedia("(prefers-color-scheme: dark)");
  private current: ThemePreference = parseThemePreference(readStorage());

  /**
   * @param onChange Called with the preference whenever it changes in another tab.
   */
  constructor(private readonly onChange: (preference: ThemePreference) => void) {
    this.media.addEventListener("change", () => this.apply());
    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        this.current = parseThemePreference(readStorage());
        this.apply();
        this.onChange(this.current);
      }
    });
    this.apply();
  }

  get preference(): ThemePreference {
    return this.current;
  }

  set preference(preference: ThemePreference) {
    this.current = preference;
    writeStorage(preference === "auto" ? null : preference);
    this.apply();
  }

  private apply(): void {
    document.documentElement.dataset.bsTheme = resolveTheme(this.current, this.media.matches);
  }
}

// Storage can be unavailable (private browsing, blocked site data); the theme then simply
// is not remembered.
function readStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStorage(value: string | null): void {
  try {
    if (value === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, value);
    }
  } catch {
    // Not remembered, see above.
  }
}
