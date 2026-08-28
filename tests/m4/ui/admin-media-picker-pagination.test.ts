import {readFileSync} from "node:fs";
import path from "node:path";

import {describe, expect, it} from "vitest";

import {
  buildAdminImagePickerHref,
  mergeAdminMediaPickerItems,
  parseAdminMediaPickerPage,
} from "@/components/admin/media/media-picker-pagination";
import type {AdminMediaItem} from "@/contracts/media-admin";

function item(id: string): AdminMediaItem {
  return {
    id,
    url: `/uploads/${id}.webp`,
    mimeType: "image/webp",
    size: 1000,
    alt: "Preview",
    isDecorative: false,
    width: 1600,
    height: 900,
    focalX: null,
    focalY: null,
    originalName: `${id}.webp`,
    createdAt: "2026-08-25T00:00:00.000Z",
    uploaderName: "Admin",
  };
}

describe("admin media picker pagination", () => {
  it("builds the image-only picker URL with an explicit page and bounded page size", () => {
    expect(buildAdminImagePickerHref(2)).toBe("/api/admin/media?kind=IMAGE&page=2&pageSize=24");
  });

  it("parses the media list page state needed by picker pagination", () => {
    expect(parseAdminMediaPickerPage({
      items: [item("m1")],
      page: 1,
      pageSize: 24,
      total: 25,
      hasNextPage: true,
    })).toEqual({
      items: [item("m1")],
      page: 1,
      hasNextPage: true,
    });
    expect(parseAdminMediaPickerPage({items: [], page: 1})).toBeNull();
  });

  it("appends older pages without duplicating already loaded images", () => {
    expect(mergeAdminMediaPickerItems([item("m1"), item("m2")], [item("m2"), item("m3")])
      .map((media) => media.id)).toEqual(["m1", "m2", "m3"]);
  });

  it("wires every admin image picker to the shared pagination helper", () => {
    const pickerFiles = [
      "src/components/admin/posts/post-cover-picker.tsx",
      "src/components/admin/posts/post-gallery-picker.tsx",
      "src/components/admin/home-nav/home-media-picker.tsx",
      "src/components/admin/pages/page-hero-picker.tsx",
    ].map((relativePath) => readFileSync(path.join(process.cwd(), relativePath), "utf8"));

    for (const source of pickerFiles) {
      expect(source).toContain("buildAdminImagePickerHref");
      expect(source).toContain("parseAdminMediaPickerPage");
      expect(source).toContain("mergeAdminMediaPickerItems");
      expect(source).toContain("hasNextPage");
      expect(source).toContain("page + 1");
      expect(source).not.toContain('fetch("/api/admin/media?kind=IMAGE"');
    }
  });

  it("keeps load-more labels available in every picker locale namespace", () => {
    const namespaces = [
      "AdminPostCoverPicker",
      "AdminPostGalleryPicker",
      "AdminPageHeroPicker",
      "AdminFacility.picker",
      "AdminHomeNav.picker",
    ] as const;
    for (const locale of ["id", "en", "ar"]) {
      const messages = JSON.parse(
        readFileSync(path.join(process.cwd(), `messages/${locale}.json`), "utf8"),
      );
      for (const namespace of namespaces) {
        const value = namespace.split(".")
          .reduce<unknown>((current, key) => (
            typeof current === "object" && current !== null
              ? (current as Record<string, unknown>)[key]
              : undefined
          ), messages);
        expect((value as {loadMore?: string})?.loadMore, `${locale} ${namespace}.loadMore`)
          .toBeTruthy();
      }
    }
  });
});
