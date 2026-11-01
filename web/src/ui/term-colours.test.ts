import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { hexToOklch, hueDistance } from "./colour";
import { termColour, THEME_COLOURS, THEME_HUE_MARGIN } from "./term-colours";

/** The largest configuration, s¹ p³ d⁵ f⁷, has 133 terms. */
const MOST_TERMS = 133;

const colours = Array.from({ length: MOST_TERMS }, (_, index) => termColour(index));

describe("termColour", () => {
  it("gives every term its own colour", () => {
    expect(new Set(colours).size).toBe(MOST_TERMS);
  });

  it("depends only on the index", () => {
    expect(termColour(4)).toBe(colours[4]);
  });

  it("stays away from the hues of the theme colours", () => {
    const themeHues = THEME_COLOURS.map((colour) => hexToOklch(colour).hue);
    for (const colour of colours) {
      const { hue, chroma } = hexToOklch(colour);
      // Grey colours have no meaningful hue and would look like the neutral theme surfaces.
      expect(chroma).toBeGreaterThan(0.05);
      for (const themeHue of themeHues) {
        // Rounding to 8-bit channels moves the hue slightly.
        expect(hueDistance(hue, themeHue)).toBeGreaterThan(THEME_HUE_MARGIN - 1);
      }
    }
  });

  it("separates the colours clearly", () => {
    // Measured worst pairs: 0.108 for 12 terms and 0.065 for 31 (s¹ p³ d⁵); about 0.02 in OKLab
    // is a just noticeable difference.
    expect(closestPair(colours.slice(0, 12))).toBeGreaterThan(0.1);
    expect(closestPair(colours.slice(0, 31))).toBeGreaterThan(0.06);
  });
});

/** Returns the smallest OKLab distance between two of the colours. */
function closestPair(hexes: readonly string[]): number {
  const lab = hexes.map((colour) => {
    const { lightness, chroma, hue } = hexToOklch(colour);
    const radians = (hue * Math.PI) / 180;
    return [lightness, chroma * Math.cos(radians), chroma * Math.sin(radians)] as const;
  });
  let closest = Infinity;
  for (const [i, a] of lab.entries()) {
    for (const b of lab.slice(i + 1)) {
      closest = Math.min(closest, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
    }
  }
  return closest;
}

describe("THEME_COLOURS", () => {
  it("lists the primary and accent colours of styles.css", () => {
    const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
    const tokens = /--app-(?:primary|primary-hover|primary-emphasis|accent):\s*(#[0-9a-f]{6})/gi;
    const used = [...css.matchAll(tokens)].map(([, hex = ""]) => hex.toLowerCase());
    expect(used.length).toBeGreaterThan(0);
    expect([...THEME_COLOURS].sort()).toEqual([...new Set(used)].sort());
  });
});
