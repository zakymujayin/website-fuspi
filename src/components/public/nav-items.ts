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

export const primaryNav: readonly NavGroup[] = [
  { key: "profile", href: "/profil" },
  {
    key: "studyPrograms",
    href: "/prodi",
    children: institution.studyPrograms.map((program) => ({
      key: `program.${program.code}`,
      href: `/prodi/${program.slug}`,
    })),
  },
  { key: "academics", href: "/akademik" },
  { key: "research", href: "/riset" },
  { key: "services", href: "/layanan" },
  { key: "contact", href: "/kontak" },
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

/** Utility topbar (docs/17-B layer 2). External systems, opened in a new tab. */
export type ExternalLink = { key: string; url: string };

export const utilityLinks: readonly ExternalLink[] = [
  { key: "pmb", url: "https://pmb.uinbanten.ac.id" },
  { key: "siakad", url: "https://siakad.uinbanten.ac.id" },
  { key: "elearning", url: "https://elearning.uinbanten.ac.id" },
  { key: "gkm", url: "/gkm" },
] as const;

export const quickLinks: readonly NavLink[] = [
  { key: "services", href: "/layanan" },
  { key: "complaints", href: "/pengaduan" },
  { key: "booking", href: "/peminjaman" },
  { key: "ppid", href: "/ppid" },
  { key: "faq", href: "/faq" },
  { key: "contact", href: "/kontak" },
] as const;

export const studyProgramLinks: readonly NavLink[] = institution.studyPrograms.map(
  (program) => ({
    key: `program.${program.code}`,
    href: `/prodi/${program.slug}`,
  }),
);
