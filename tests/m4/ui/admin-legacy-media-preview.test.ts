import {describe, expect, it} from "vitest";

import {adminImageMediaPreview} from "@/features/public-content/shared";

const LEGACY_STORAGE_KEY = `2026/08/${"b".repeat(64)}.webp`;

describe("admin legacy media preview", () => {
  it("builds an admin-only image preview from old public media with incomplete metadata", () => {
    expect(adminImageMediaPreview({
      id: "media-legacy-1",
      storageKey: LEGACY_STORAGE_KEY,
      storageClass: "PUBLIC",
      mimeType: "image/webp",
      size: 245_760,
      alt: null,
      isDecorative: false,
      width: null,
      height: null,
    })).toEqual({
      id: "media-legacy-1",
      url: `/uploads/${LEGACY_STORAGE_KEY}`,
      mimeType: "image/webp",
      size: 245_760,
      alt: "",
      isDecorative: true,
      width: null,
      height: null,
    });
  });

  it("keeps the admin preview limited to public CMS images", () => {
    expect(adminImageMediaPreview({
      id: "media-private-1",
      storageKey: `2026/08/${"c".repeat(64)}.webp`,
      storageClass: "PRIVATE",
      mimeType: "image/webp",
      size: 245_760,
      alt: "Private",
      isDecorative: false,
      width: 1_200,
      height: 800,
    })).toBeNull();

    expect(adminImageMediaPreview({
      id: "media-pdf-1",
      storageKey: `2026/08/${"d".repeat(64)}.pdf`,
      storageClass: "PUBLIC",
      mimeType: "application/pdf",
      size: 245_760,
      alt: "",
      isDecorative: false,
      width: null,
      height: null,
    })).toBeNull();
  });
});
