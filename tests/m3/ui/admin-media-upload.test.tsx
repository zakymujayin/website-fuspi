import { readFileSync } from "node:fs";
import path from "node:path";

import { StrictMode } from "react";

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The component imports the locale-aware router; stub it so importing the module (for its pure
// helpers) does not pull next/navigation into the jsdom test environment.
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
}));

const {
  validateImageBatch,
  validatePdf,
  isAcceptedImageFile,
  buildImageBatchFormData,
  buildPdfFormData,
  toSafeImageUploadName,
  uploadFailureKey,
  ImageUploadPreview,
  newImageUploadRow,
  cropLabels,
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  MAX_IMAGE_COUNT,
} = await import("@/components/admin/media/media-upload");

const webp = (bytes: number, name = "x.webp"): File =>
  new File([new Uint8Array(bytes)], name, { type: "image/webp" });
const jpeg = (bytes: number, name = "x.jpg"): File =>
  new File([new Uint8Array(bytes)], name, { type: "image/jpeg" });
const png = (bytes: number, name = "x.png"): File =>
  new File([new Uint8Array(bytes)], name, { type: "image/png" });
const pdf = (bytes: number): File =>
  new File([new Uint8Array(bytes)], "d.pdf", { type: "application/pdf" });

const img = (alt: string, isDecorative = false, bytes = 100) => ({
  file: webp(bytes),
  alt,
  isDecorative,
  focalX: null,
  focalY: null,
});

describe("validateImageBatch", () => {
  it("accepts a batch of informative and decorative images", () => {
    expect(validateImageBatch([img("a"), img("", true), img("c")])).toEqual({ ok: true });
  });

  it("accepts .webp files when the browser reports an empty or octet-stream MIME", () => {
    for (const type of ["", "application/octet-stream"]) {
      const file = new File([new Uint8Array(100)], "WhatsApp-Image-2026-08-10-at-19.00.12.jpeg.webp", { type });
      expect(isAcceptedImageFile(file)).toBe(true);
      expect(validateImageBatch([{ file, alt: "Foto Acara FUSPI", isDecorative: false, focalX: null, focalY: null }])).toEqual({ ok: true });
    }
  });

  it("accepts JPEG, JPG, PNG, and WebP files before server-side conversion to WebP", () => {
    for (const file of [jpeg(100), jpeg(100, "x.jpeg"), png(100), webp(100)]) {
      expect(isAcceptedImageFile(file)).toBe(true);
      expect(validateImageBatch([{ file, alt: "Foto Acara FUSPI", isDecorative: false, focalX: null, focalY: null }])).toEqual({ ok: true });
    }
  });

  it("rejects an empty batch", () => {
    expect(validateImageBatch([])).toEqual({ ok: false, index: null, reason: "missing" });
  });

  it("rejects more than the image limit", () => {
    const rows = Array.from({ length: MAX_IMAGE_COUNT + 1 }, () => img("a"));
    expect(validateImageBatch(rows)).toEqual({ ok: false, index: null, reason: "count" });
  });

  it("reports the offending index for a non-image file", () => {
    const svg = { file: new File([new Uint8Array(1)], "x.svg", { type: "image/svg+xml" }), alt: "a", isDecorative: false, focalX: null, focalY: null };
    expect(validateImageBatch([img("a"), svg])).toEqual({ ok: false, index: 1, reason: "type" });
  });

  it("reports the offending index for an oversized file", () => {
    expect(validateImageBatch([img("a"), img("b", false, MAX_IMAGE_BYTES + 1)])).toEqual({
      ok: false,
      index: 1,
      reason: "size",
    });
  });

  it("requires alt for a non-decorative image and forbids it for a decorative one", () => {
    expect(validateImageBatch([img("   ")])).toEqual({ ok: false, index: 0, reason: "altRequired" });
    expect(validateImageBatch([img("has text", true)])).toEqual({
      ok: false,
      index: 0,
      reason: "altNotEmpty",
    });
  });
});

describe("validatePdf", () => {
  it("accepts a pdf under the limit", () => {
    expect(validatePdf(pdf(1000))).toEqual({ ok: true });
  });
  it("rejects a missing file", () => {
    expect(validatePdf(null)).toEqual({ ok: false, index: null, reason: "missing" });
  });
  it("rejects a non-pdf type", () => {
    expect(validatePdf(webp(100))).toEqual({ ok: false, index: null, reason: "type" });
  });
  it("rejects an oversized pdf", () => {
    expect(validatePdf(pdf(MAX_PDF_BYTES + 1))).toEqual({ ok: false, index: null, reason: "size" });
  });
});

describe("buildImageBatchFormData", () => {
  it("assembles one CMS_IMAGE intent + one file per row, in order", () => {
    const form = buildImageBatchFormData([img("  First  "), img("", true)]);
    const metadata = JSON.parse(form.get("metadata") as string);
    expect(metadata).toEqual({
      policy: "CMS_IMAGE",
      uploadCount: 2,
      intents: [
        { policy: "CMS_IMAGE", alt: "First", isDecorative: false, focalX: null, focalY: null },
        { policy: "CMS_IMAGE", alt: "", isDecorative: true, focalX: null, focalY: null },
      ],
    });
    expect(form.getAll("files")).toHaveLength(2);
    expect([...new Set(form.keys())].sort()).toEqual(["files", "metadata"]);
  });

  it("forces empty alt for a decorative image regardless of the field", () => {
    const form = buildImageBatchFormData([img("leftover", true)]);
    expect(JSON.parse(form.get("metadata") as string).intents[0].alt).toBe("");
  });

  it("submits a storage-validator-safe WebP filename for browser/WhatsApp names with extra dots", () => {
    const unsafeName = "WhatsApp-Image-2026-08-10-at-19.00.12.jpeg.webp";
    const form = buildImageBatchFormData([{
      file: new File([new Uint8Array(100)], unsafeName, { type: "" }),
      alt: "Foto Acara FUSPI",
      isDecorative: false,
      focalX: null,
      focalY: null,
    }]);
    const [file] = form.getAll("files") as File[];
    expect(toSafeImageUploadName({ name: unsafeName, type: "" })).toBe("WhatsApp-Image-2026-08-10-at-19-00-12-jpeg.webp");
    expect(file?.name).toBe("WhatsApp-Image-2026-08-10-at-19-00-12-jpeg.webp");
  });

  it("keeps the safe image extension aligned with the original upload type", () => {
    expect(toSafeImageUploadName(jpeg(100, "Rapat.Pimpinan.jpeg"))).toBe("Rapat-Pimpinan.jpeg");
    expect(toSafeImageUploadName(png(100, "Foto.Kegiatan.png"))).toBe("Foto-Kegiatan.png");
    expect(toSafeImageUploadName(webp(100, "Foto.Kegiatan.webp"))).toBe("Foto-Kegiatan.webp");
  });
});

describe("buildPdfFormData", () => {
  it("assembles the single PUBLIC_PDF body with no accessibility metadata", () => {
    const form = buildPdfFormData(pdf(500));
    expect(JSON.parse(form.get("metadata") as string)).toEqual({
      policy: "PUBLIC_PDF",
      uploadCount: 1,
      intents: [{ policy: "PUBLIC_PDF", alt: "", isDecorative: false }],
    });
    expect(form.getAll("files")).toHaveLength(1);
  });
});

describe("uploadFailureKey — no raw code reaches the UI", () => {
  it("maps known codes and collapses unknown to UNAVAILABLE", () => {
    expect(uploadFailureKey("UPLOAD_FAILED")).toBe("error.UPLOAD_FAILED");
    expect(uploadFailureKey("SOMETHING_ELSE")).toBe("error.UNAVAILABLE");
    expect(uploadFailureKey(undefined)).toBe("error.UNAVAILABLE");
  });
});

describe("component wiring and i18n", () => {
  const source = readFileSync(
    path.join(process.cwd(), "src/components/admin/media/media-upload.tsx"),
    "utf8",
  );
  const uploadRouteSource = readFileSync(
    path.join(process.cwd(), "src/app/api/admin/media/upload/route.ts"),
    "utf8",
  );

  it("posts multipart to the upload route same-origin, with image and pdf policies", () => {
    expect(source).toContain('"/api/admin/media/upload"');
    expect(source).toContain('credentials: "same-origin"');
    expect(source).toContain('accept={ACCEPTED_IMAGE_INPUT}');
    expect(source).toContain('accept={ACCEPTED_PDF_TYPE}');
    expect(source).toContain("multiple");
  });

  it("refreshes the grid on success", () => {
    expect(source).toContain("router.refresh()");
  });

  it("normalizes browser-empty image MIME before the server storage validator", () => {
    expect(uploadRouteSource).toContain("normalizeUploadMimeType(file)");
    expect(uploadRouteSource).toContain('[".jpg", "image/jpeg"]');
    expect(uploadRouteSource).toContain('[".png", "image/png"]');
    expect(uploadRouteSource).toContain('[".webp", "image/webp"]');
  });

  it("uses no physical-direction utility", () => {
    expect(source).not.toMatch(/\b(ml|mr|pl|pr|left|right)-\d/);
    expect(source).not.toMatch(/\btext-(left|right)\b/);
  });

  it("defines the same AdminMediaUpload keys in id, en, ar with real Arabic and all failure codes", () => {
    const flatten = (v: unknown, p = ""): string[] =>
      typeof v === "object" && v !== null
        ? Object.entries(v).flatMap(([k, c]) => flatten(c, p ? `${p}.${k}` : k))
        : [p];
    const [id, en, ar] = ["id", "en", "ar"].map((locale) => {
      const raw = readFileSync(path.join(process.cwd(), `messages/${locale}.json`), "utf8");
      return flatten(JSON.parse(raw).AdminMediaUpload).sort();
    });
    expect(id.length).toBeGreaterThan(20);
    expect(en).toEqual(id);
    expect(ar).toEqual(id);

    const arBlock = JSON.parse(
      readFileSync(path.join(process.cwd(), "messages/ar.json"), "utf8"),
    ).AdminMediaUpload;
    expect(arBlock.title).toMatch(/[؀-ۿ]/);
    expect(arBlock.policy.PUBLIC_PDF).toBeTruthy();
    for (const code of ["SESSION_INVALID", "UPLOAD_FAILED", "UNAVAILABLE"]) {
      expect(arBlock.error[code]).toBeTruthy();
    }
  });
});

describe("newImageUploadRow", () => {
  it("seeds originalFile with the pristine pick and leaves it uncropped", () => {
    const file = png(20, "dean.png");
    const row = newImageUploadRow(file);
    expect(row.file).toBe(file);
    expect(row.originalFile).toBe(file);
    expect(row).toMatchObject({ alt: "", isDecorative: false, focalX: null, focalY: null });
  });
});

describe("cropLabels", () => {
  it("pulls the crop.* bundle off a namespace translator", () => {
    expect(cropLabels((key: string) => `t:${key}`)).toEqual({
      title: "t:crop.title",
      instructions: "t:crop.instructions",
      apply: "t:crop.apply",
      reset: "t:crop.reset",
      applied: "t:crop.applied",
      error: "t:crop.error",
    });
  });
});

describe("crop wiring in the upload surfaces", () => {
  const uploadSource = readFileSync(
    path.join(process.cwd(), "src/components/admin/media/media-upload.tsx"),
    "utf8",
  );
  const pickerSource = readFileSync(
    path.join(process.cwd(), "src/components/admin/media/media-picker-upload-panel.tsx"),
    "utf8",
  );

  it("replaces the row file with the cropped result and reverts to originalFile on reset", () => {
    for (const source of [uploadSource, pickerSource]) {
      expect(source).toContain("<ImageCropEditor");
      expect(source).toMatch(/onApply=\{\(cropped\) => update\w+\(.*\{ file: cropped \}\)\}/);
      expect(source).toMatch(/onReset=\{\(\) => update\w+\(.*\{ file: row\.originalFile \}\)\}/);
    }
  });

  it("keeps the focal-point preview pointed at the (possibly cropped) row file", () => {
    for (const source of [uploadSource, pickerSource]) {
      expect(source).toContain("file={row.file}");
    }
  });
});

describe("ImageUploadPreview object-URL lifecycle", () => {
  const liveUrls = new Set<string>();
  let counter = 0;

  afterEach(() => {
    cleanup();
    liveUrls.clear();
    counter = 0;
  });

  function stubObjectUrls() {
    URL.createObjectURL = vi.fn(() => {
      counter += 1;
      const url = `blob:mock/${counter}`;
      liveUrls.add(url);
      return url;
    });
    URL.revokeObjectURL = vi.fn((url: string) => {
      liveUrls.delete(url);
    });
  }

  it("renders the preview img with an object URL that is still live after a StrictMode remount", () => {
    stubObjectUrls();
    const { container } = render(
      <StrictMode>
        <ImageUploadPreview
          file={png(10, "dean.png")}
          x={null}
          y={null}
          onChange={() => {}}
          label="focal"
          hint="hint"
        />
      </StrictMode>,
    );

    const src = container.querySelector("img")?.getAttribute("src") ?? "";
    expect(src).toMatch(/^blob:mock\//);
    expect(liveUrls.has(src)).toBe(true);
  });

  it("revokes the object URL when the preview unmounts", () => {
    stubObjectUrls();
    const { container, unmount } = render(
      <ImageUploadPreview
        file={png(10, "dean.png")}
        x={null}
        y={null}
        onChange={() => {}}
        label="focal"
        hint="hint"
      />,
    );
    const src = container.querySelector("img")?.getAttribute("src") ?? "";
    expect(liveUrls.has(src)).toBe(true);
    unmount();
    expect(liveUrls.has(src)).toBe(false);
  });
});
