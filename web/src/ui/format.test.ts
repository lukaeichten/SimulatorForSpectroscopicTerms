import { describe, expect, it } from "vitest";

import { count, halfIntegerParts, halfIntegerText, signed } from "./format";

describe("half-integers", () => {
  it("splits values into parts", () => {
    expect(halfIntegerParts(1.5)).toEqual({ negative: false, numerator: 3, denominator: 2 });
    expect(halfIntegerParts(-2)).toEqual({ negative: true, numerator: 2, denominator: 1 });
    expect(halfIntegerParts(0)).toEqual({ negative: false, numerator: 0, denominator: 1 });
  });

  it("formats values as text", () => {
    expect(halfIntegerText(-0.5)).toBe("−1/2");
    expect(halfIntegerText(3)).toBe("3");
  });
});

describe("count", () => {
  it("adds thousands separators", () => {
    expect(count(34594560)).toBe("34,594,560");
  });
});

describe("signed", () => {
  it("uses a typographic minus", () => {
    expect(signed(-2)).toBe("−2");
    expect(signed(3)).toBe("3");
  });
});
