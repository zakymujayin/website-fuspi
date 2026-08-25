import {describe, expect, it} from "vitest";

import {HomeSliderInputSchema} from "@/contracts/home-nav";
import {buildHomeSliderEditorPayload} from "@/components/admin/home-nav/home-slider-editor-payload";

const BASE_TRANSLATIONS = {
  id: {
    title: "Selamat Datang di FUSPI",
    subtitle: "Kampus keilmuan dan pengabdian.",
    ctaLabel: "Lihat profil",
  },
  en: {title: "", subtitle: "", ctaLabel: ""},
  ar: {title: "", subtitle: "", ctaLabel: ""},
};

describe("HomeSliderEditorForm payload", () => {
  it("does not send empty optional locale rows when only changing the image", () => {
    const payload = buildHomeSliderEditorPayload({
      imageMediaId: "media-1",
      ctaHref: "/profil",
      order: 1,
      isVisible: true,
      translations: BASE_TRANSLATIONS,
    });

    expect(payload.translations).toEqual({
      id: {
        title: "Selamat Datang di FUSPI",
        subtitle: "Kampus keilmuan dan pengabdian.",
        ctaLabel: "Lihat profil",
      },
    });
    expect(HomeSliderInputSchema.safeParse(payload).success).toBe(true);
  });

  it("preserves filled optional translations across locale tab switches", () => {
    const payload = buildHomeSliderEditorPayload({
      imageMediaId: "media-1",
      ctaHref: "",
      order: 2,
      isVisible: true,
      translations: {
        ...BASE_TRANSLATIONS,
        en: {title: "Welcome to FUSPI", subtitle: "", ctaLabel: ""},
      },
    });

    expect(payload.translations.en).toEqual({
      title: "Welcome to FUSPI",
      subtitle: null,
      ctaLabel: null,
    });
    expect(HomeSliderInputSchema.safeParse(payload).success).toBe(true);
  });

  it("normalizes bare external host names into HTTPS links", () => {
    const payload = buildHomeSliderEditorPayload({
      imageMediaId: "media-1",
      ctaHref: "pmb.uinbanten.ac.id",
      order: 3,
      isVisible: true,
      translations: BASE_TRANSLATIONS,
    });

    expect(payload.cta).toEqual({kind: "EXTERNAL", href: "https://pmb.uinbanten.ac.id"});
    expect(HomeSliderInputSchema.safeParse(payload).success).toBe(true);
  });
});
