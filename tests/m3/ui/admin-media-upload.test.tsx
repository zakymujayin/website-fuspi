import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

// The component imports the locale-aware router; stub it so importing the module (for its pure
// helpers) does not pull next/navigation into the jsdom test environment.
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
}));

const {
  validateImageBatch,
  validatePdf,
  buildImageBatchFormData,
  buildPdfFormData,
  uploadFailureKey,
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  MAX_IMAGE_COUNT,
} = await import("@/components/admin/media/media-upload");

const webp = (bytes: number, name = "x.webp"): File =>
  new File([new Uint8Array(bytes)], name, { type: "image/webp" });
const pdf = (bytes: number): File =>
  new File([new Uint8Array(bytes)], "d.pdf", { type: "application/pdf" });

const img = (alt: string, isDecorative = false, bytes = 100) => ({
  file: webp(bytes),
  alt,
  isDecorative,
});

describe("validateImageBatch", () => {
  it("accepts a batch of informative and decorative images", () => {
    expect(validateImageBatch([img("a"), img("", true), img("c")])).toEqual({ ok: true });
  });

  it("rejects an empty batch", () => {
    expect(validateImageBatch([])).toEqual({ ok: false, index: null, reason: "missing" });
  });

  it("rejects more than the image limit", () => {
    const rows = Array.from({ length: MAX_IMAGE_COUNT + 1 }, () => img("a"));
    expect(validateImageBatch(rows)).toEqual({ ok: false, index: null, reason: "count" });
  });

  it("reports the offending index for a non-webp file", () => {
    const png = { file: new File([new Uint8Array(1)], "x.png", { type: "image/png" }), alt: "a", isDecorative: false };
    expect(validateImageBatch([img("a"), png])).toEqual({ ok: false, index: 1, reason: "type" });
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
        { policy: "CMS_IMAGE", alt: "First", isDecorative: false },
        { policy: "CMS_IMAGE", alt: "", isDecorative: true },
      ],
    });
    expect(form.getAll("files")).toHaveLength(2);
    expect([...new Set(form.keys())].sort()).toEqual(["files", "metadata"]);
  });

  it("forces empty alt for a decorative image regardless of the field", () => {
    const form = buildImageBatchFormData([img("leftover", true)]);
    expect(JSON.parse(form.get("metadata") as string).intents[0].alt).toBe("");
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

  it("posts multipart to the upload route same-origin, with image and pdf policies", () => {
    expect(source).toContain('"/api/admin/media/upload"');
    expect(source).toContain('credentials: "same-origin"');
    expect(source).toContain('accept={ACCEPTED_IMAGE_TYPE}');
    expect(source).toContain('accept={ACCEPTED_PDF_TYPE}');
    expect(source).toContain("multiple");
  });

  it("refreshes the grid on success", () => {
    expect(source).toContain("router.refresh()");
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
