import { institution } from "@/config/institution";

/**
 * Typed navigation mock for the public shell. The CMS-backed navigation
 * registry is a shared contract owned by the platform lane; until it lands,
 * the shell renders from this frozen shape so markup and routes stay stable.
 */
export type NavLink = {
  /** Key inside the `Nav` message namespace. */
  key: string;
  href: string;
};

/** A labelled column inside a desktop mega panel. */
export type NavSection = {
  /** Key inside the `Nav` message namespace, rendered as the column heading. */
  key: string;
  items: readonly NavLink[];
};

export type NavGroup = NavLink & {
  children?: readonly NavLink[];
  /**
   * Optional column grouping for the desktop panel. `children` stays the flat
   * source of truth (drawer, tests, sitemap); sections only decide how the
   * same destinations are laid out.
   */
  sections?: readonly NavSection[];
};

const studyProgramNav = institution.studyPrograms.map((program) => ({
  key: `program.${program.code}`,
  href: `/prodi/${program.slug}`,
}));

export const profileNav: readonly NavGroup[] = [
  { key: "history", href: "/profil/sejarah" },
  { key: "visionMission", href: "/profil/visi-misi" },
  { key: "structure", href: "/profil/struktur" },
  { key: "leadership", href: "/profil/pimpinan" },
  { key: "lecturers", href: "/dosen" },
  { key: "staff", href: "/tenaga-kependidikan" },
  { key: "facilities", href: "/profil/fasilitas" },
  { key: "testimonials", href: "/testimoni" },
  { key: "prospective", href: "/calon-mahasiswa" },
  { key: "contact", href: "/kontak" },
] as const;

const studyProgramIndexHref = "/prodi";

/** Academic navigation is intentionally resource-first: no homepage shortcuts here. */
export const academicNav: readonly NavLink[] = [
  { key: "studyPrograms", href: studyProgramIndexHref },
  ...studyProgramNav,
  { key: "lectureSchedule", href: "/akademik#jadwal-perkuliahan" },
  { key: "academicCalendar", href: "/akademik#kalender-akademik" },
  { key: "curriculum", href: "/akademik#kurikulum" },
  { key: "courseCatalog", href: "/akademik#mata-kuliah" },
  { key: "academicDocs", href: "/akademik#dokumen-akademik" },
  { key: "accreditation", href: "/akademik#akreditasi" },
  { key: "academicGuidelines", href: "/akademik#pedoman-akademik" },
] as const;

const academicByKey = new Map(academicNav.map((item) => [item.key, item] as const));

/** Reads back from `academicNav` so a column can never drift from the real href. */
const pickAcademic = (...keys: readonly string[]): readonly NavLink[] =>
  keys.flatMap((key) => academicByKey.get(key) ?? []);

/**
 * Column layout for the Akademik panel. Eleven links in one undifferentiated
 * two-column flow read as noise, so they are split into the two questions a
 * visitor actually arrives with: which programs exist, and where the study
 * documents are.
 */
export const academicSections: readonly NavSection[] = [
  {
    key: "studyPrograms",
    items: [
      { key: "allStudyPrograms", href: studyProgramIndexHref },
      ...studyProgramNav,
    ],
  },
  {
    key: "curriculumDocs",
    items: pickAcademic(
      "curriculum",
      "courseCatalog",
      "lectureSchedule",
      "academicCalendar",
      "academicDocs",
      "academicGuidelines",
      "accreditation",
    ),
  },
] as const;

/** Beasiswa, prestasi, and student-activity pages grouped under one menu (docs/26). */
export const studentAffairsNav: readonly NavLink[] = [
  { key: "scholarships", href: "/beasiswa" },
  { key: "achievements", href: "/prestasi" },
  { key: "activities", href: "/kegiatan" },
] as const;

/** Research pairs naturally with partnerships; kept as one top-level slot instead of two. */
export const researchNav: readonly NavLink[] = [
  { key: "research", href: "/riset" },
  { key: "partnerships", href: "/kerjasama" },
] as const;

/** The concrete service systems the "Layanan" entry point fans out to. */
export const servicesNav: readonly NavLink[] = [
  { key: "servicesAcademic", href: "/layanan" },
  { key: "complaints", href: "/pengaduan" },
  { key: "booking", href: "/peminjaman" },
] as const;

/** Content bar (docs/17-B layer 1). */
export const contentNav: readonly NavLink[] = [
  { key: "news", href: "/berita" },
  { key: "announcements", href: "/pengumuman" },
  { key: "columns", href: "/kolom" },
  { key: "agenda", href: "/agenda" },
  { key: "albums", href: "/album" },
] as const;

export const newsInfoNav: NavGroup = {
  key: "newsInfo",
  href: "/berita",
  children: contentNav,
} as const;

export const primaryNav: readonly NavGroup[] = [
  { key: "profile", href: "/profil", children: profileNav },
  { key: "academics", href: "/akademik", children: academicNav, sections: academicSections },
  { key: "studentAffairs", href: "/beasiswa", children: studentAffairsNav },
  { key: "research", href: "/riset", children: researchNav },
  newsInfoNav,
  { key: "services", href: "/layanan", children: servicesNav },
  { key: "contact", href: "/kontak" },
] as const;

/** Utility topbar (docs/17-B layer 2). External systems, opened in a new tab. */
export type ExternalLink = { key: string; url: string };

export const utilityLinks: readonly ExternalLink[] = [
  { key: "siakad", url: "https://neosiakad.uinbanten.ac.id" },
  { key: "elearning", url: "https://fuspi.uinbanten.ac.id/e-learning" },
  { key: "gkm", url: "https://gkm-fuda.uinbanten.ac.id/" },
] as const;

/** PMB (external admissions portal). Surfaced as a prominent header button, not the topbar. */
export const pmbLink: ExternalLink = { key: "pmb", url: "https://pmb.uinbanten.ac.id/" } as const;

/** PPID (external FUSPI PPID site). Surfaced as a prominent header button, not the topbar. */
export const ppidLink: ExternalLink = { key: "ppid", url: "https://fuspi-ppid.uinbanten.ac.id/" } as const;

export const quickLinks: readonly (NavLink | ExternalLink)[] = [
  { key: "services", href: "/layanan" },
  { key: "complaints", href: "/pengaduan" },
  { key: "booking", href: "/peminjaman" },
  ppidLink,
  { key: "faq", href: "/faq" },
  { key: "contact", href: "/kontak" },
] as const;

export const studyProgramLinks: readonly NavLink[] = institution.studyPrograms.map(
  (program) => ({
    key: `program.${program.code}`,
    href: `/prodi/${program.slug}`,
  }),
);
