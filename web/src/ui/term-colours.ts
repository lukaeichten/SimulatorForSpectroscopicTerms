/**
 * Generates one distinct colour per term, however many terms a configuration has (s¹ p³ d⁵ f⁷
 * has 133).
 *
 * The colours are chosen by greedy farthest-point selection in OKLab, where distance matches
 * perceived difference: each term gets, from a grid of candidate colours, the one farthest from
 * every colour taken before it. The theme colours count as taken from the start, so the first
 * terms are also as different from them as possible.
 *
 * - A fixed sequence (golden ratio or R2) does not know which colours are already used and was
 *   measurably worse: for 12 terms its two closest colours were about 30 % closer.
 * - A colour only depends on the term's index, never on the number of terms, so the first term
 *   keeps its colour in every configuration.
 * - No candidate is taken twice, so no two terms share a colour. With many terms, some colours
 *   are inevitably close; the Term column still identifies every row.
 */
import { hexToOklch, hueDistance, oklchToHex, type Oklch } from "./colour";

/**
 * The theme colours of both themes that term colours must stay away from: `--app-primary`,
 * `--app-primary-hover`, `--app-primary-emphasis` and `--app-accent` in `styles.css`. A test
 * checks that the list matches the stylesheet.
 */
export const THEME_COLOURS: readonly string[] = [
  "#4338ca",
  "#3730a3",
  "#312e81",
  "#0f766e",
  "#818cf8",
  "#a5b4fc",
  "#c7d2fe",
  "#2dd4bf",
];

/**
 * Minimum hue distance in degrees between a term colour and every theme colour. Distance in
 * OKLab alone is not enough: a light indigo can be far from the dark primary and still read as
 * "the selection colour", so whole hue bands are excluded.
 */
export const THEME_HUE_MARGIN = 30;

/*
 * Bounds of the lightness. Darker colours would make the occupation arrows hard to read on a
 * tinted row in the dark theme; lighter ones would vanish in the light theme's tint.
 */
const MIN_LIGHTNESS = 0.55;
const MAX_LIGHTNESS = 0.82;
const LIGHTNESS_LEVELS = 10;
/** Target chroma; reduced automatically for hues whose sRGB gamut is narrower. */
const CHROMA = 0.14;
/** Finer steps did not separate the colours further, they only cost time. */
const HUE_STEP = 1;

/** A candidate colour with its OKLab coordinates, to compare distances quickly. */
interface Candidate {
  readonly hex: string;
  readonly lab: Lab;
}

type Lab = readonly [number, number, number];

/**
 * The selection is computed lazily and only as far as a configuration needs, because building
 * the candidates costs a few milliseconds and most configurations have few terms.
 */
class FarthestPointPalette {
  private readonly candidates: readonly Candidate[];
  /** For every candidate, the distance to the closest colour taken so far. */
  private readonly distances: number[];
  private readonly chosen: string[] = [];

  constructor(taken: readonly string[], forbiddenHues: readonly number[], hueMargin: number) {
    this.candidates = candidateColours(forbiddenHues, hueMargin);
    const takenLab = taken.map((colour) => toLab(hexToOklch(colour)));
    this.distances = this.candidates.map((candidate) =>
      Math.min(...takenLab.map((lab) => distance(candidate.lab, lab))),
    );
  }

  colour(index: number): string {
    while (this.chosen.length <= index) {
      this.chosen.push(this.takeFarthest());
    }
    return this.chosen[index] ?? "";
  }

  private takeFarthest(): string {
    let best = 0;
    this.distances.forEach((value, index) => {
      if (value > (this.distances[best] ?? 0)) {
        best = index;
      }
    });
    const taken = this.candidates[best];
    if (taken === undefined || (this.distances[best] ?? 0) === 0) {
      // Every candidate is used; unreachable for the supported configurations (at most 133
      // terms against more than two thousand candidates).
      throw new Error("No distinct term colour left");
    }
    this.candidates.forEach((candidate, index) => {
      this.distances[index] = Math.min(
        this.distances[index] ?? 0,
        distance(candidate.lab, taken.lab),
      );
    });
    return taken.hex;
  }
}

const palette = new FarthestPointPalette(
  THEME_COLOURS,
  THEME_COLOURS.map((colour) => hexToOklch(colour).hue),
  THEME_HUE_MARGIN,
);

/** Returns the colour of the term with the given zero-based index as `#rrggbb`. */
export function termColour(index: number): string {
  return palette.colour(index);
}

/** Returns the grid of allowed colours: every hue outside the forbidden bands, every lightness. */
function candidateColours(forbiddenHues: readonly number[], hueMargin: number): Candidate[] {
  const candidates: Candidate[] = [];
  for (let hue = 0; hue < 360; hue += HUE_STEP) {
    if (forbiddenHues.some((forbidden) => hueDistance(hue, forbidden) < hueMargin)) {
      continue;
    }
    for (let level = 0; level < LIGHTNESS_LEVELS; level++) {
      const lightness =
        MIN_LIGHTNESS + (level / (LIGHTNESS_LEVELS - 1)) * (MAX_LIGHTNESS - MIN_LIGHTNESS);
      // Distances are measured on the colour as displayed, i.e. after fitting it into sRGB.
      const hex = oklchToHex({ lightness, chroma: CHROMA, hue });
      candidates.push({ hex, lab: toLab(hexToOklch(hex)) });
    }
  }
  return candidates;
}

function toLab({ lightness, chroma, hue }: Oklch): Lab {
  const radians = (hue * Math.PI) / 180;
  return [lightness, chroma * Math.cos(radians), chroma * Math.sin(radians)];
}

/** Euclidean distance in OKLab; about 0.02 is a just noticeable difference. */
function distance(a: Lab, b: Lab): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
