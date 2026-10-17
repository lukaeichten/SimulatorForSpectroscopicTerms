import { describe, expect, it } from "vitest";

import { parseThemePreference, resolveTheme } from "./theme";

describe("parseThemePreference", () => {
  it("accepts the stored themes", () => {
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
  });

  it("falls back to auto", () => {
    expect(parseThemePreference(null)).toBe("auto");
    expect(parseThemePreference("blue")).toBe("auto");
  });
});

describe("resolveTheme", () => {
  it("keeps an explicit choice", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("follows the operating system in auto mode", () => {
    expect(resolveTheme("auto", true)).toBe("dark");
    expect(resolveTheme("auto", false)).toBe("light");
  });
});
