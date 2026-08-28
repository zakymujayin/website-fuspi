export type CropRect = { x: number; y: number; width: number; height: number };
export type CropHandle = "nw" | "ne" | "sw" | "se";

/** Smallest crop selection, in natural image pixels. */
export const MIN_CROP_SIZE = 24;

export function fullCropRect(naturalWidth: number, naturalHeight: number): CropRect {
  return { x: 0, y: 0, width: naturalWidth, height: naturalHeight };
}

/** Fit a rect inside the image: size capped to the image and floored at the minimum, then position nudged in. */
export function clampCropRect(rect: CropRect, naturalWidth: number, naturalHeight: number): CropRect {
  const width = Math.min(Math.max(rect.width, MIN_CROP_SIZE), naturalWidth);
  const height = Math.min(Math.max(rect.height, MIN_CROP_SIZE), naturalHeight);
  const x = Math.min(Math.max(rect.x, 0), naturalWidth - width);
  const y = Math.min(Math.max(rect.y, 0), naturalHeight - height);
  return { x, y, width, height };
}

/** Translate the rect by (dx, dy), keeping its size and stopping at the image edges. */
export function moveCropRect(
  rect: CropRect,
  dx: number,
  dy: number,
  naturalWidth: number,
  naturalHeight: number,
): CropRect {
  return clampCropRect({ ...rect, x: rect.x + dx, y: rect.y + dy }, naturalWidth, naturalHeight);
}

/** Drag one corner by (dx, dy) with the opposite corner pinned; clamp to bounds and the minimum size. */
export function resizeCropRect(
  rect: CropRect,
  handle: CropHandle,
  dx: number,
  dy: number,
  naturalWidth: number,
  naturalHeight: number,
): CropRect {
  let left = rect.x;
  let top = rect.y;
  let right = rect.x + rect.width;
  let bottom = rect.y + rect.height;

  if (handle === "nw" || handle === "sw") left += dx;
  if (handle === "ne" || handle === "se") right += dx;
  if (handle === "nw" || handle === "ne") top += dy;
  if (handle === "sw" || handle === "se") bottom += dy;

  left = Math.min(Math.max(left, 0), naturalWidth);
  right = Math.min(Math.max(right, 0), naturalWidth);
  top = Math.min(Math.max(top, 0), naturalHeight);
  bottom = Math.min(Math.max(bottom, 0), naturalHeight);

  if (right - left < MIN_CROP_SIZE) {
    if (handle === "nw" || handle === "sw") left = Math.max(0, right - MIN_CROP_SIZE);
    else right = Math.min(naturalWidth, left + MIN_CROP_SIZE);
  }
  if (bottom - top < MIN_CROP_SIZE) {
    if (handle === "nw" || handle === "ne") top = Math.max(0, bottom - MIN_CROP_SIZE);
    else bottom = Math.min(naturalHeight, top + MIN_CROP_SIZE);
  }

  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** Rect as percentages of the natural image, for absolute-positioning the selection overlay. */
export function cropRectToPercent(
  rect: CropRect,
  naturalWidth: number,
  naturalHeight: number,
): { left: number; top: number; width: number; height: number } {
  return {
    left: (rect.x / naturalWidth) * 100,
    top: (rect.y / naturalHeight) * 100,
    width: (rect.width / naturalWidth) * 100,
    height: (rect.height / naturalHeight) * 100,
  };
}

/** True when the selection still covers the entire image (nothing to crop). */
export function isFullCrop(rect: CropRect, naturalWidth: number, naturalHeight: number): boolean {
  return (
    Math.round(rect.x) === 0
    && Math.round(rect.y) === 0
    && Math.round(rect.width) === naturalWidth
    && Math.round(rect.height) === naturalHeight
  );
}
