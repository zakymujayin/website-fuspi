import { readFileSync } from "node:fs";
import path from "node:path";

import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element -- test double for next/image.
    <img src={props.src} alt={props.alt} className={props.className} />
  ),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `t:${key}`,
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const { MediaPickerCropPanel } = await import("@/components/admin/media/media-picker-crop-panel");

describe("MediaPickerCropPanel", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:mock/crop-existing");
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows the crop-this-image button while collapsed", () => {
    const { getByRole, queryByText } = render(
      <MediaPickerCropPanel
        imageSrc="/uploads/2026/08/dean.webp"
        alt="Foto dekan"
        isDecorative={false}
        onReplaced={() => {}}
      />,
    );
    expect(getByRole("button", { name: "t:cropExisting.button" })).toBeTruthy();
    expect(queryByText("t:crop.title")).toBeNull();
  });

  it("fetches the selected image and opens the crop editor when expanded", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      blob: async () => new Blob([new Uint8Array(8)], { type: "image/webp" }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { getByRole, findByText } = render(
      <MediaPickerCropPanel
        imageSrc="/uploads/2026/08/dean.webp"
        alt="Foto dekan"
        isDecorative={false}
        onReplaced={() => {}}
      />,
    );

    fireEvent.click(getByRole("button", { name: "t:cropExisting.button" }));

    expect(await findByText("t:crop.title")).toBeTruthy();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/uploads/2026/08/dean.webp",
        expect.objectContaining({ credentials: "same-origin" }),
      );
    });
  });

  it("surfaces a load error when the stored image cannot be fetched", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })));

    const { getByRole, findByText } = render(
      <MediaPickerCropPanel
        imageSrc="/uploads/2026/08/dean.webp"
        alt="Foto dekan"
        isDecorative={false}
        onReplaced={() => {}}
      />,
    );
    fireEvent.click(getByRole("button", { name: "t:cropExisting.button" }));
    expect(await findByText("t:cropExisting.loadError")).toBeTruthy();
  });
});

describe("crop-existing wiring in the single-image pickers", () => {
  const PICKERS = [
    "src/components/admin/home-nav/home-media-picker.tsx",
    "src/components/admin/posts/post-cover-picker.tsx",
    "src/components/admin/pages/page-hero-picker.tsx",
  ];

  it("renders MediaPickerCropPanel for the current image and feeds its result back to choose()", () => {
    for (const file of PICKERS) {
      const source = readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source, file).toContain("<MediaPickerCropPanel");
      expect(source, file).toContain('selectedThumb?.kind === "image"');
      expect(source, file).toContain("onReplaced={choose}");
    }
  });
});

describe("AdminMediaPickerUpload crop message parity", () => {
  it("defines the same crop and cropExisting keys in id, en, ar", () => {
    const flatten = (value: unknown, prefix = ""): string[] =>
      typeof value === "object" && value !== null
        ? Object.entries(value).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k))
        : [prefix];

    const perLocale = ["id", "en", "ar"].map((locale) => {
      const block = JSON.parse(
        readFileSync(path.join(process.cwd(), `messages/${locale}.json`), "utf8"),
      ).AdminMediaPickerUpload as { crop: unknown; cropExisting: unknown };
      return [...flatten(block.crop, "crop"), ...flatten(block.cropExisting, "cropExisting")].sort();
    });

    expect(perLocale[0]).toEqual([
      "crop.applied", "crop.apply", "crop.error", "crop.instructions", "crop.reset", "crop.title",
      "cropExisting.button", "cropExisting.loadError", "cropExisting.loading",
    ]);
    expect(perLocale[1]).toEqual(perLocale[0]);
    expect(perLocale[2]).toEqual(perLocale[0]);
  });
});
