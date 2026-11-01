/**
 * Conversions between sRGB hex colours and OKLCH.
 *
 * OKLCH (Björn Ottosson's OKLab in polar form) is used instead of HSV/HSL because its lightness
 * and hue are perceptually uniform: equal steps look equally different, and colours of the same
 * lightness look equally bright, which HSV does not provide (yellow looks far brighter than blue).
 */

/** A colour in OKLCH: lightness 0–1, chroma (0 = grey) and hue in degrees 0–360. */
export interface Oklch {
  readonly lightness: number;
  readonly chroma: number;
  readonly hue: number;
}

type Rgb = readonly [number, number, number];

/** Parses `#rrggbb` into OKLCH. */
export function hexToOklch(hex: string): Oklch {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) {
    throw new Error(`Expected a colour like #4338ca, got ${hex}`);
  }
  const [, r = "", g = "", b = ""] = match;
  const channel = (pair: string) => toLinear(Number.parseInt(pair, 16) / 255);
  return labToLch(linearSrgbToOklab([channel(r), channel(g), channel(b)]));
}

/**
 * Formats an OKLCH colour as `#rrggbb`. Colours outside sRGB keep their lightness and hue and
 * lose chroma until they fit, so the hue (which identifies a term) never shifts.
 */
export function oklchToHex(colour: Oklch): string {
  return `#${toGamut(colour)
    .map((channel) => {
      const byte = Math.round(fromLinear(clamp(channel)) * 255);
      return byte.toString(16).padStart(2, "0");
    })
    .join("")}`;
}

/** Returns the distance between two hues on the colour wheel, 0–180 degrees. */
export function hueDistance(a: number, b: number): number {
  const difference = Math.abs(a - b) % 360;
  return Math.min(difference, 360 - difference);
}

/** Returns the linear sRGB channels of the colour, reducing its chroma until all lie in 0–1. */
function toGamut(colour: Oklch): Rgb {
  const exact = oklchToLinearSrgb(colour);
  if (isInGamut(exact)) {
    return exact;
  }
  // Bisection on the chroma: grey (chroma 0) is always in gamut, the requested chroma is not.
  let low = 0;
  let high = colour.chroma;
  for (let step = 0; step < 24; step++) {
    const middle = (low + high) / 2;
    if (isInGamut(oklchToLinearSrgb({ ...colour, chroma: middle }))) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return oklchToLinearSrgb({ ...colour, chroma: low });
}

function isInGamut(rgb: Rgb): boolean {
  const epsilon = 1e-6;
  return rgb.every((channel) => channel >= -epsilon && channel <= 1 + epsilon);
}

function oklchToLinearSrgb({ lightness, chroma, hue }: Oklch): Rgb {
  const radians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function linearSrgbToOklab([r, g, b]: Rgb): Rgb {
  const l = Math.cbrt(0.4122214708 * r + 0.536301562 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function labToLch([lightness, a, b]: Rgb): Oklch {
  const hue = (Math.atan2(b, a) * 180) / Math.PI;
  return { lightness, chroma: Math.hypot(a, b), hue: (hue + 360) % 360 };
}

/** sRGB transfer function: gamma-encoded channel to linear light. */
function toLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function fromLinear(channel: number): number {
  return channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055;
}

function clamp(channel: number): number {
  return Math.min(1, Math.max(0, channel));
}
