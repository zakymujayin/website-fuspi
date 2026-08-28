import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  MIN_CROP_SIZE,
  fullCropRect,
  clampCropRect,
  moveCropRect,
  resizeCropRect,
  cropRectToPercent,
  isFullCrop,
} = await import("@/components/admin/media/image-crop-geometry");

const { ImageCropEditor } = await import("@/components/admin/media/image-crop-editor");

const LABELS = {
  title: "Crop image",
  instructions: "Drag to move, drag a corner to resize.",
  apply: "Apply crop",
  reset: "Restore original",
  applied: "Image cropped",
  error: "Could not crop.",
};

const pngFile = () => new File([new Uint8Array(8)], "dean.png", { type: "image/png" });

describe("fullCropRect", () => {
  it("covers the whole natural image", () => {
    expect(fullCropRect(800, 600)).toEqual({ x: 0, y: 0, width: 800, height: 600 });
  });
});

describe("clampCropRect", () => {
  it("keeps an in-bounds rect untouched", () => {
    expect(clampCropRect({ x: 10, y: 20, width: 100, height: 80 }, 800, 600)).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 80,
    });
  });

  it("shifts a rect back inside the image without shrinking it", () => {
    expect(clampCropRect({ x: 780, y: 590, width: 100, height: 80 }, 800, 600)).toEqual({
      x: 700,
      y: 520,
      width: 100,
      height: 80,
    });
  });

  it("caps an oversized rect to the image and enforces the minimum", () => {
    expect(clampCropRect({ x: -50, y: -50, width: 9999, height: 9999 }, 800, 600)).toEqual({
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    });
    expect(clampCropRect({ x: 0, y: 0, width: 1, height: 1 }, 800, 600)).toEqual({
      x: 0,
      y: 0,
      width: MIN_CROP_SIZE,
      height: MIN_CROP_SIZE,
    });
  });
});

describe("moveCropRect", () => {
  it("translates the rect and preserves its size", () => {
    expect(moveCropRect({ x: 100, y: 100, width: 200, height: 150 }, 30, -40, 800, 600)).toEqual({
      x: 130,
      y: 60,
      width: 200,
      height: 150,
    });
  });

  it("stops at the image edge instead of leaving the frame", () => {
    expect(moveCropRect({ x: 700, y: 500, width: 200, height: 150 }, 500, 500, 800, 600)).toEqual({
      x: 600,
      y: 450,
      width: 200,
      height: 150,
    });
  });
});

describe("resizeCropRect", () => {
  it("moves only the dragged corner, keeping the opposite corner fixed", () => {
    // se handle: bottom-right follows the pointer, top-left stays put
    expect(
      resizeCropRect({ x: 100, y: 100, width: 200, height: 200 }, "se", 50, 30, 800, 600),
    ).toEqual({ x: 100, y: 100, width: 250, height: 230 });
    // nw handle: top-left follows the pointer, bottom-right stays put
    expect(
      resizeCropRect({ x: 100, y: 100, width: 200, height: 200 }, "nw", 40, 40, 800, 600),
    ).toEqual({ x: 140, y: 140, width: 160, height: 160 });
  });

  it("clamps the dragged corner to the image bounds", () => {
    expect(
      resizeCropRect({ x: 100, y: 100, width: 200, height: 200 }, "se", 9999, 9999, 800, 600),
    ).toEqual({ x: 100, y: 100, width: 700, height: 500 });
    expect(
      resizeCropRect({ x: 100, y: 100, width: 200, height: 200 }, "nw", -9999, -9999, 800, 600),
    ).toEqual({ x: 0, y: 0, width: 300, height: 300 });
  });

  it("never collapses below the minimum crop size", () => {
    const r = resizeCropRect({ x: 100, y: 100, width: 200, height: 200 }, "se", -500, -500, 800, 600);
    expect(r.width).toBe(MIN_CROP_SIZE);
    expect(r.height).toBe(MIN_CROP_SIZE);
    expect(r.x).toBe(100);
    expect(r.y).toBe(100);

    const r2 = resizeCropRect({ x: 100, y: 100, width: 200, height: 200 }, "nw", 500, 500, 800, 600);
    expect(r2.width).toBe(MIN_CROP_SIZE);
    expect(r2.height).toBe(MIN_CROP_SIZE);
    expect(r2.x).toBe(300 - MIN_CROP_SIZE);
    expect(r2.y).toBe(300 - MIN_CROP_SIZE);
  });
});

describe("cropRectToPercent", () => {
  it("expresses the rect as percentages of the natural image", () => {
    expect(cropRectToPercent({ x: 200, y: 150, width: 400, height: 300 }, 800, 600)).toEqual({
      left: 25,
      top: 25,
      width: 50,
      height: 50,
    });
  });
});

describe("isFullCrop", () => {
  it("is true only when the selection still covers the whole image", () => {
    expect(isFullCrop({ x: 0, y: 0, width: 800, height: 600 }, 800, 600)).toBe(true);
    expect(isFullCrop({ x: 0, y: 40, width: 800, height: 560 }, 800, 600)).toBe(false);
  });
});

describe("ImageCropEditor", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:mock/crop");
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(cleanup);

  it("shows the crop control and the apply action, and no reset until a crop is applied", () => {
    const { queryByText, getByText } = render(
      <ImageCropEditor
        file={pngFile()}
        isCropped={false}
        onApply={() => {}}
        onReset={() => {}}
        labels={LABELS}
      />,
    );
    expect(getByText("Crop image")).toBeTruthy();
    expect(getByText("Apply crop")).toBeTruthy();
    expect(queryByText("Restore original")).toBeNull();
    expect(queryByText("Image cropped")).toBeNull();
  });

  it("offers reset and a cropped badge once the row carries a cropped file", () => {
    const { getByText } = render(
      <ImageCropEditor
        file={pngFile()}
        isCropped
        onApply={() => {}}
        onReset={() => {}}
        labels={LABELS}
      />,
    );
    expect(getByText("Restore original")).toBeTruthy();
    expect(getByText("Image cropped")).toBeTruthy();
  });
});
