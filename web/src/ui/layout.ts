/** Page layout helpers that need JavaScript. */

/**
 * Keeps the CSS variable `--sticky-offset` equal to the height of the sticky toolbar, so other
 * sticky elements can be placed right below it (the toolbar wraps on narrow screens).
 */
export function trackStickyOffset(toolbar: HTMLElement): void {
  const update = () =>
    document.documentElement.style.setProperty("--sticky-offset", `${toolbar.offsetHeight}px`);
  new ResizeObserver(update).observe(toolbar);
  update();
}
