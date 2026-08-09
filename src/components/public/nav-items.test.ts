import { describe, expect, it } from "vitest";

import ar from "../../../messages/ar.json";
import en from "../../../messages/en.json";
import id from "../../../messages/id.json";
import {
  contentNav,
  primaryNav,
  quickLinks,
  studyProgramLinks,
  utilityLinks,
} from "./nav-items";
import { institution } from "@/config/institution";

const CATALOGS = { id, en, ar } as const;

const resolve = (catalog: unknown, path: string) =>
  path
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        typeof node === "object" && node !== null
          ? (node as Record<string, unknown>)[key]
          : undefined,
      catalog,
    );

const navKeys = [
  ...primaryNav.flatMap((item) => [item.key, ...(item.children ?? []).map((c) => c.key)]),
  ...contentNav.map((item) => item.key),
  ...utilityLinks.map((item) => item.key),
  ...quickLinks.map((item) => item.key),
];

describe("public navigation", () => {
  it("exposes the five v1 study programs in contract order", () => {
    expect(studyProgramLinks.map((link) => link.key)).toEqual([
      "program.IAT",
      "program.IH",
      "program.AFI",
      "program.SAA",
      "program.TASPI",
    ]);

    expect(studyProgramLinks.map((link) => link.href)).toEqual(
      institution.studyPrograms.map((program) => `/prodi/${program.slug}`),
    );
  });

  it.each(Object.entries(CATALOGS))("translates every nav key in %s", (_locale, catalog) => {
    for (const key of navKeys) {
      expect(resolve(catalog.Nav, key), key).toBeTypeOf("string");
    }
  });

  it("never links to FUDA identity or domains", () => {
    const surface = JSON.stringify({ primaryNav, contentNav, utilityLinks, quickLinks });

    expect(surface).not.toMatch(/fuda/i);
  });
});
