import { describe, expect, it } from "vitest";

import ar from "../../../messages/ar.json";
import en from "../../../messages/en.json";
import id from "../../../messages/id.json";
import {
  academicNav,
  academicSections,
  contentNav,
  pmbLink,
  ppidLink,
  primaryNav,
  profileNav,
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
  ...academicNav.map((item) => item.key),
  ...academicSections.flatMap((section) => [
    section.key,
    ...section.items.map((item) => item.key),
  ]),
  ...profileNav.map((item) => item.key),
  ...contentNav.map((item) => item.key),
  ...utilityLinks.map((item) => item.key),
  ...quickLinks.map((item) => item.key),
  pmbLink.key,
  ppidLink.key,
];

describe("public navigation", () => {
  it("exposes the three active study programs in contract order", () => {
    expect(studyProgramLinks.map((link) => link.key)).toEqual([
      "program.IAT",
      "program.IH",
      "program.AFI",
    ]);

    expect(studyProgramLinks.map((link) => link.href)).toEqual(
      institution.studyPrograms.map((program) => `/prodi/${program.slug}`),
    );
  });

  it("groups academic resources under the Academic dropdown", () => {
    const topLevelKeys = primaryNav.map((item) => item.key);

    expect(topLevelKeys).not.toContain("studyPrograms");
    expect(primaryNav.find((item) => item.key === "academics")?.children).toEqual(academicNav);
    expect(academicNav.map((item) => item.key)).toEqual([
      "studyPrograms",
      "program.IAT",
      "program.IH",
      "program.AFI",
      "lectureSchedule",
      "academicCalendar",
      "curriculum",
      "courseCatalog",
      "academicDocs",
      "accreditation",
      "academicGuidelines",
    ]);
  });

  it("routes academic document topics to the academic page context first", () => {
    expect(
      academicNav
        .filter((item) =>
          [
            "lectureSchedule",
            "academicCalendar",
            "curriculum",
            "courseCatalog",
            "academicDocs",
            "accreditation",
            "academicGuidelines",
          ].includes(item.key),
        )
        .map((item) => item.href),
    ).toEqual([
      "/akademik#jadwal-perkuliahan",
      "/akademik#kalender-akademik",
      "/akademik#kurikulum",
      "/akademik#mata-kuliah",
      "/akademik#dokumen-akademik",
      "/akademik#akreditasi",
      "/akademik#pedoman-akademik",
    ]);
  });

  it("lays the academic dropdown out as labelled columns over the same links", () => {
    expect(academicSections.map((section) => section.key)).toEqual([
      "studyPrograms",
      "curriculumDocs",
    ]);
    expect(primaryNav.find((item) => item.key === "academics")?.sections).toEqual(
      academicSections,
    );

    // Columns are presentation only: every academic destination appears once,
    // and no column may invent a destination the flat list does not have.
    const columnHrefs = academicSections.flatMap((section) =>
      section.items.map((item) => item.href),
    );

    expect(new Set(columnHrefs).size).toBe(columnHrefs.length);
    expect([...columnHrefs].sort()).toEqual([...academicNav.map((item) => item.href)].sort());
  });

  it("separates news and information from academic documents", () => {
    expect(primaryNav.find((item) => item.key === "newsInfo")?.children).toEqual(contentNav);
    expect(contentNav.map((item) => item.key)).toEqual([
      "news",
      "announcements",
      "columns",
      "agenda",
      "albums",
    ]);
  });

  it.each(Object.entries(CATALOGS))("translates every nav key in %s", (_locale, catalog) => {
    for (const key of navKeys) {
      expect(resolve(catalog.Nav, key), key).toBeTypeOf("string");
    }
  });

  it("never links to FUDA identity or domains", () => {
    const surface = JSON.stringify({ primaryNav, contentNav, utilityLinks, quickLinks });

    expect(surface).not.toMatch(/"key":"fuda"|"href":"[^"]*fuda|"url":"https:\/\/fuda\./i);
  });
});
