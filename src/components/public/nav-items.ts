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

export type NavGroup = NavLink & {
  children?: readonly NavLink[];
};

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
  { key: "documents", href: "/dokumen" },
] as const;

export const infoNav: NavGroup = {
  key: "publication",
  href: "/berita",
  children: contentNav,
} as const;

export const primaryNav: readonly NavGroup[] = [
  { key: "profile", href: "/profil", children: profileNav },
  {
    key: "studyPrograms",
    href: "/prodi",
    children: institution.studyPrograms.map((program) => ({
      key: `program.${program.code}`,
      href: `/prodi/${program.slug}`,
    })),
  },
  { key: "academics", href: "/akademik" },
  { key: "research", href: "/riset", children: researchNav },
  { key: "studentAffairs", href: "/beasiswa", children: studentAffairsNav },
  { key: "services", href: "/layanan", children: servicesNav },
  infoNav,
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
