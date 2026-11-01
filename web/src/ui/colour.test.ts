import { describe, expect, it } from "vitest";

import { hexToOklch, hueDistance, oklchToHex } from "./colour";

describe("OKLCH conversion", () => {
  it("matches reference values", () => {
    const white = hexToOklch("#ffffff");
    expect(white.lightness).toBeCloseTo(1, 4);
    expect(white.chroma).toBeCloseTo(0, 4);
    // Reference from the CSS Color 4 sample code: #ff0000 is oklch(62.8% 0.2577 29.23).
    const red = hexToOklch("#ff0000");
    expect(red.lightness).toBeCloseTo(0.628, 3);
    expect(red.chroma).toBeCloseTo(0.2577, 3);
    expect(red.hue).toBeCloseTo(29.23, 1);
  });

  it("round-trips sRGB colours", () => {
    for (const hex of ["#4338ca", "#0f766e", "#e69f00", "#000000", "#999999"]) {
      expect(oklchToHex(hexToOklch(hex))).toBe(hex);
    }
  });

  it("reduces the chroma of colours outside sRGB but keeps their hue", () => {
    const hex = oklchToHex({ lightness: 0.9, chroma: 0.4, hue: 260 });
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    const fitted = hexToOklch(hex);
    expect(fitted.chroma).toBeLessThan(0.4);
    expect(hueDistance(fitted.hue, 260)).toBeLessThan(2);
  });
});

describe("hueDistance", () => {
  it("measures around the colour wheel", () => {
    expect(hueDistance(350, 10)).toBe(20);
    expect(hueDistance(90, 270)).toBe(180);
  });
});
