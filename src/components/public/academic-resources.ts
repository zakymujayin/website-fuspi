/**
 * Academic topics that own a real route under `/akademik`.
 *
 * Menu entries used to point at anchors on the academic hub, so choosing
 * "Jadwal Perkuliahan" dropped the visitor into a long page of cards instead
 * of the schedule itself. `nav-items` now reads hrefs from this list, so a
 * menu entry can never point at a section the hub no longer owns.
 */
export type AcademicResourceKey =
  | "lectureSchedule"
  | "academicCalendar"
  | "curriculum"
  | "courseCatalog"
  | "academicDocs"
  | "accreditation"
  | "academicGuidelines";

export type AcademicResource = {
  /** Key inside the `Nav` message namespace; `<key>Desc` inside `Pages`. */
  key: AcademicResourceKey;
  /** Route segment under `/akademik`. */
  slug: string;
};

export const academicResources: readonly AcademicResource[] = [
  {key: "lectureSchedule", slug: "jadwal-perkuliahan"},
  {key: "academicCalendar", slug: "kalender-akademik"},
  {key: "curriculum", slug: "kurikulum"},
  {key: "courseCatalog", slug: "mata-kuliah"},
  {key: "academicDocs", slug: "dokumen-akademik"},
  {key: "accreditation", slug: "akreditasi"},
  {key: "academicGuidelines", slug: "pedoman-akademik"},
] as const;

/** The two questions a visitor arrives with, in hub reading order. */
export const academicResourceGroups: readonly {
  titleKey: "academicHubPrimary" | "academicHubArchive";
  keys: readonly AcademicResourceKey[];
}[] = [
  {
    titleKey: "academicHubPrimary",
    keys: ["lectureSchedule", "academicCalendar", "curriculum", "courseCatalog"],
  },
  {
    titleKey: "academicHubArchive",
    keys: ["academicDocs", "accreditation", "academicGuidelines"],
  },
] as const;

export function academicResourceHref(resource: AcademicResource): string {
  return `/akademik/${resource.slug}`;
}

export function findAcademicResourceBySlug(slug: string): AcademicResource | undefined {
  return academicResources.find((resource) => resource.slug === slug);
}

export function findAcademicResourceByKey(key: AcademicResourceKey): AcademicResource {
  const resource = academicResources.find((item) => item.key === key);
  if (!resource) throw new Error(`Unknown academic resource: ${key}`);
  return resource;
}
