export type FocalPoint = { x: number; y: number };

/** `{focalX, focalY}` (either possibly null, e.g. straight off a `Media` row) to the `focalPoint` prop shape — null unless both coordinates are set. */
export function toFocalPoint(
  media?: { focalX: number | null; focalY: number | null } | null,
): FocalPoint | null {
  if (!media || media.focalX == null || media.focalY == null) return null;
  return { x: media.focalX, y: media.focalY };
}
