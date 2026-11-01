---
title: "0007: Generate term colours by farthest-point selection in OKLab"
sidebar_label: "0007: Term colours"
---

# 0007: Generate term colours by farthest-point selection in OKLab

**Status:** accepted

## Context

The colour view ([0006](./0006-assign-microstates-to-terms-by-rank.md)) tints every microstate
with the colour of its term. A fixed palette of 8 colours repeats colours for larger
configurations: s¹ p³ d⁵ has 31 terms and s¹ p³ d⁵ f⁷ has 133. Term colours must also not be
mistaken for the theme colours (indigo primary, teal accent), which mark the selected terms and
the occupation arrows.

## Decision

The colours are generated in `web/src/ui/term-colours.ts`:

- **Colour space OKLCH/OKLab** instead of HSV or HSL. In OKLab, distance matches perceived
  difference and equal lightness looks equally bright; in HSV, equal hue steps look unequal and
  yellow looks much brighter than blue at the same value.
- **Candidates:** every hue in steps of 1° and 10 lightness levels from 0.55 to 0.82 at chroma
  0.14. The lightness range keeps the occupation arrows readable on tinted rows in both themes.
  Colours outside sRGB lose chroma until they fit, which keeps their hue.
- **Theme exclusion:** candidates within 30° of the hue of a primary or accent colour of either
  theme are removed. A distance in OKLab alone would allow a light indigo that is far from the
  dark primary but still reads as the selection colour.
- **Greedy farthest-point selection:** term $i$ gets the candidate with the largest OKLab
  distance to all colours taken before it. The theme colours count as taken from the start.

Alternatives were compared by the OKLab distance of the closest pair of colours (about 0.02 is a
just noticeable difference):

| Terms | Golden ratio hue with various lightness sequences | R2 sequence | Farthest-point selection |
| ----- | ------------------------------------------------- | ----------- | ------------------------ |
| 8     | 0.046–0.065                                       | 0.078       | 0.122                    |
| 12    | 0.033–0.060                                       | 0.075       | 0.108                    |
| 31    | 0.013–0.036                                       | 0.052       | 0.065                    |
| 133   | 0.011–0.017                                       | 0.019       | 0.031                    |

Fixed sequences (golden ratio, R2) do not know which colours are already used. The R2 hue step
is close to ¾ of a turn, so every fourth term gets a similar hue.

## Consequences

- No two terms share a colour, and the colours of small configurations are clearly different.
- A colour depends only on the term's index, so a term number keeps its colour in every
  configuration and in shared links.
- With many terms, some colours are necessarily similar; the Term column always names the term.
- Unlike the Okabe–Ito palette used before, the colours are not designed for colour vision
  deficiencies. No palette of 31 or more colours can be; the varying lightness helps.
- The selection costs about 40 ms for all 133 colours; it runs lazily and only as far as a
  configuration needs.
- The list of theme colours in `term-colours.ts` duplicates values from `styles.css`; a test
  fails if they diverge.
