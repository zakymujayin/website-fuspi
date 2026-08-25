import { beforeEach, describe, expect, it } from "vitest";
import {
  createUser,
  createAdmin,
  createEditor,
  createPetugas,
  createSatgasPPKS,
  createInactiveUser,
  resetUserIdCounter,
} from "@/../tests/foundation/fixtures/user";
import {
  createPost,
  createPostTranslation,
  createPostWithTranslations,
  resetPostIdCounter,
} from "@/../tests/foundation/fixtures/post";
import {
  createCategory,
  createCategoryTranslation,
  createCategoryWithTranslations,
  resetCategoryIdCounter,
} from "@/../tests/foundation/fixtures/category";
import {
  createStudyProgram,
  createStudyProgramWithTranslations,
  createAllFiveStudyPrograms,
  resetStudyProgramIdCounter,
} from "@/../tests/foundation/fixtures/study-program";
import {
  createMedia,
  createPrivateMedia,
  createPPKSMedia,
  resetMediaIdCounter,
} from "@/../tests/foundation/fixtures/media";
import { createPage, createPageWithTranslations, resetPageIdCounter } from "@/../tests/foundation/fixtures/page";

describe("fixture factories", () => {
  beforeEach(() => {
    resetUserIdCounter();
    resetPostIdCounter();
    resetCategoryIdCounter();
    resetStudyProgramIdCounter();
    resetMediaIdCounter();
    resetPageIdCounter();
  });

  describe("User fixtures", () => {
    it("creates a user with default EDITOR role", () => {
      const user = createUser();
      expect(user.role).toBe("EDITOR");
      expect(user.isActive).toBe(true);
      expect(user.mustChangePassword).toBe(false);
      expect(user.email).toContain("@fuspi.uinbanten.ac.id");
    });

    it("creates unique emails per user", () => {
      const a = createUser();
      const b = createUser();
      expect(a.email).not.toBe(b.email);
    });

    it("createAdmin returns ADMIN role", () => {
      expect(createAdmin().role).toBe("ADMIN");
    });

    it("createEditor returns EDITOR role", () => {
      expect(createEditor().role).toBe("EDITOR");
    });

    it("createPetugas returns PETUGAS role", () => {
      expect(createPetugas().role).toBe("PETUGAS");
    });

    it("createSatgasPPKS returns SATGAS_PPKS role", () => {
      expect(createSatgasPPKS().role).toBe("SATGAS_PPKS");
    });

    it("createInactiveUser returns isActive=false", () => {
      expect(createInactiveUser().isActive).toBe(false);
    });

    it("allows overriding any property", () => {
      const custom = createUser({ name: "Custom", email: "custom@test.org", role: "ADMIN" });
      expect(custom.name).toBe("Custom");
      expect(custom.email).toBe("custom@test.org");
      expect(custom.role).toBe("ADMIN");
    });
  });

  describe("Post fixtures", () => {
    it("creates a post with default BERITA type", () => {
      const post = createPost();
      expect(post.type).toBe("BERITA");
      expect(post.status).toBe("PUBLISHED");
      expect(post.slug).toBeTruthy();
    });

    it("creates post translations for all locales", () => {
      const post = createPostWithTranslations();
      expect(post.translations).toHaveLength(3);
      const locales = post.translations.map((t) => t.locale);
      expect(locales).toContain("id");
      expect(locales).toContain("en");
      expect(locales).toContain("ar");
    });

    it("post translation has locale-specific content", () => {
      const t = createPostTranslation("post-1", { locale: "ar" });
      expect(t.locale).toBe("ar");
      expect(t.title).toBeTruthy();
      expect(t.content).toBeTruthy();
    });
  });

  describe("Category fixtures", () => {
    it("creates a category with slug", () => {
      const cat = createCategory();
      expect(cat.slug).toBeTruthy();
    });

    it("creates category with all locale translations", () => {
      const cat = createCategoryWithTranslations();
      expect(cat.translations).toHaveLength(3);
    });

    it("category translation defaults to PUBLISHED", () => {
      const t = createCategoryTranslation("cat-1", { locale: "id" });
      expect(t.status).toBe("PUBLISHED");
    });
  });

  describe("StudyProgram fixtures", () => {
    it("creates a study program with valid code", () => {
      const prog = createStudyProgram();
      expect(["IAT", "IH", "AFI"]).toContain(prog.code);
    });

    it("creates study program with translations", () => {
      const prog = createStudyProgramWithTranslations();
      expect(prog.translations).toHaveLength(3);
    });

    it("createAllFiveStudyPrograms returns exactly the active study programs", () => {
      const all = createAllFiveStudyPrograms();
      expect(all).toHaveLength(3);
    });

    it("createAllFiveStudyPrograms covers all active codes", () => {
      const codes = createAllFiveStudyPrograms().map((p) => p.code);
      expect(codes).toContain("IAT");
      expect(codes).toContain("IH");
      expect(codes).toContain("AFI");
    });
  });

  describe("Media fixtures", () => {
    it("creates public media by default", () => {
      const m = createMedia();
      expect(m.storageClass).toBe("PUBLIC");
    });

    it("creates private media", () => {
      const m = createPrivateMedia();
      expect(m.storageClass).toBe("PRIVATE");
    });

    it("creates PPKS media with encryption fields", () => {
      const m = createPPKSMedia();
      expect(m.storageClass).toBe("PPKS_PRIVATE");
      expect(m.encryptionNonce).toBeTruthy();
      expect(m.encryptionTag).toBeTruthy();
      expect(m.keyVersion).toBe(1);
    });

    it("includes image dimensions", () => {
      const m = createMedia();
      expect(m.width).toBe(800);
      expect(m.height).toBe(600);
    });
  });

  describe("Page fixtures", () => {
    it("creates a page with slug", () => {
      const page = createPage();
      expect(page.slug).toBeTruthy();
      expect(page.status).toBe("PUBLISHED");
    });

    it("creates page with translations for all locales", () => {
      const page = createPageWithTranslations();
      expect(page.translations).toHaveLength(3);
    });
  });
});
