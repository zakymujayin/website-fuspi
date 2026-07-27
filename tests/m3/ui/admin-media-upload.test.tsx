import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

// The component imports the locale-aware router; stub it so importing the module (for its pure
// helpers) does not pull next/navigation into the jsdom test environment.
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
}));

const {
  validateImageUpload,
  buildImageUploadFormData,
  uploadFailureKey,
  MAX_IMAGE_BYTES,
  ACCEPTED_IMAGE_TYPE,
} = await import("@/components/admin/media/media-upload");

function webp(bytes: number): File {
  return new File([new Uint8Array(bytes)], "x.webp", { type: "image/webp" });
}

describe("validateImageUpload", () => {
  it("accepts a valid informative webp with alt", () => {
    expect(validateImageUpload(webp(1000), "A photo", false)).toEqual({ ok: true });
  });

  it("accepts a decorative webp with empty alt", () => {
    expect(validateImageUpload(webp(1000), "", true)).toEqual({ ok: true });
  });

  it("rejects a missing file", () => {
    expect(validateImageUpload(null, "A", false)).toEqual({ ok: false, reason: "missing" });
  });

  it("rejects a non-webp type", () => {
    const png = new File([new Uint8Array(10)], "x.png", { type: "image/png" });
    expect(validateImageUpload(png, "A", false)).toEqual({ ok: false, reason: "type" });
  });

  it("rejects an oversized file", () => {
    expect(validateImageUpload(webp(MAX_IMAGE_BYTES + 1), "A", false)).toEqual({
      ok: false,
      reason: "size",
    });
  });

  it("requires alt when not decorative", () => {
    expect(validateImageUpload(webp(100), "   ", false)).toEqual({
      ok: false,
      reason: "altRequired",
    });
  });

  it("forbids alt when decorative", () => {
    expect(validateImageUpload(webp(100), "something", true)).toEqual({
      ok: false,
      reason: "altNotEmpty",
    });
  });
});

describe("buildImageUploadFormData", () => {
  it("assembles the exact CMS_IMAGE multipart body", () => {
    const form = buildImageUploadFormData(webp(100), "  A photo  ", false);
    const metadata = JSON.parse(form.get("metadata") as string);
    expect(metadata).toEqual({
      policy: "CMS_IMAGE",
      uploadCount: 1,
      intents: [{ policy: "CMS_IMAGE", alt: "A photo", isDecorative: false }],
    });
    expect(form.get("files")).toBeInstanceOf(File);
    // Only the two expected multipart keys are present (the route rejects any others).
    expect([...new Set([...form.keys()])].sort()).toEqual(["files", "metadata"]);
  });

  it("sends an empty alt for a decorative image regardless of the field value", () => {
    const form = buildImageUploadFormData(webp(100), "leftover text", true);
    const metadata = JSON.parse(form.get("metadata") as string);
    expect(metadata.intents[0]).toEqual({ policy: "CMS_IMAGE", alt: "", isDecorative: true });
  });
});

describe("uploadFailureKey — no raw code reaches the UI", () => {
  it("maps known codes and collapses unknown to UNAVAILABLE", () => {
    expect(uploadFailureKey("UPLOAD_FAILED")).toBe("error.UPLOAD_FAILED");
    expect(uploadFailureKey("VALIDATION_FAILED")).toBe("error.VALIDATION_FAILED");
    expect(uploadFailureKey("SOMETHING_ELSE")).toBe("error.UNAVAILABLE");
    expect(uploadFailureKey(undefined)).toBe("error.UNAVAILABLE");
  });
});

describe("component wiring and i18n", () => {
  const source = readFileSync(
    path.join(process.cwd(), "src/components/admin/media/media-upload.tsx"),
    "utf8",
  );

  it("posts multipart to the upload route same-origin, images only", () => {
    expect(source).toContain('"/api/admin/media/upload"');
    expect(source).toContain('credentials: "same-origin"');
    expect(ACCEPTED_IMAGE_TYPE).toBe("image/webp");
    expect(source).toContain("accept={ACCEPTED_IMAGE_TYPE}");
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
    expect(id.length).toBeGreaterThan(15);
    expect(en).toEqual(id);
    expect(ar).toEqual(id);

    const arBlock = JSON.parse(
      readFileSync(path.join(process.cwd(), "messages/ar.json"), "utf8"),
    ).AdminMediaUpload;
    expect(arBlock.title).toMatch(/[؀-ۿ]/);
    for (const code of ["SESSION_INVALID", "UPLOAD_FAILED", "UNAVAILABLE"]) {
      expect(arBlock.error[code]).toBeTruthy();
    }
  });
});
