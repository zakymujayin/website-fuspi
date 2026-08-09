/**
 * docs/17-B: the public header compacts once the reader has scrolled more than
 * 100px. The threshold lives here as a pure module so the rule is testable
 * without a browser and the client component stays a thin listener.
 */
export const HEADER_COMPACT_THRESHOLD = 100;

/**
 * Elastic overscroll reports negative offsets and a detached document can report
 * a non-finite one; neither may compact the header, so the guard is explicit
 * rather than a bare comparison.
 */
export function isHeaderCompact(scrollY: number): boolean {
  return Number.isFinite(scrollY) && scrollY > HEADER_COMPACT_THRESHOLD;
}
