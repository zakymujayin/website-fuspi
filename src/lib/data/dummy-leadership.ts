export type LeadershipMember = {
  initials: string;
  name: string;
  photoUrl?: string;
  position: {id: string; en: string; ar: string};
  bio?: {id: string; en: string; ar: string};
};

export const viceDeans: readonly LeadershipMember[] = [
  {
    initials: "MM",
    name: "Dr. H. Masrukhin Muhsin, Lc, M.A.",
    photoUrl: "/images/leadership/wd1-masrukhin.webp",
    position: {
      id: "Wakil Dekan I — Bidang Akademik dan Kelembagaan",
      en: "Vice Dean I — Academic and Institutional Affairs",
      ar: "نائب العميد الأول — الشؤون الأكاديمية والمؤسسية",
    },
    bio: {
      id: "Mengoordinasikan kurikulum, mutu pembelajaran, dan pengembangan program studi di lingkungan FUSPI.",
      en: "Coordinates curriculum, learning quality, and study-program development across FUSPI.",
      ar: "تنسّق المناهج وجودة التعلّم وتطوير البرامج الدراسية في الكلية.",
    },
  },
  {
    initials: "ES",
    name: "Dr. H. Endang Saeful Anwar, Lc, M.A.",
    photoUrl: "/images/leadership/wd2-endang.webp",
    position: {
      id: "Wakil Dekan II — Bidang Administrasi Umum, Perencanaan dan Keuangan",
      en: "Vice Dean II — General Administration, Planning and Finance",
      ar: "نائب العميد الثاني — الإدارة العامة والتخطيط والمالية",
    },
    bio: {
      id: "Mengelola tata kelola administrasi, keuangan, serta sarana dan prasarana fakultas.",
      en: "Oversees administrative governance, finance, and the faculty's facilities.",
      ar: "يشرف على الإدارة والشؤون المالية ومرافق الكلية.",
    },
  },
  {
    initials: "AF",
    name: "Dr. Ade Fakih Kurniawan, S.Th.I., M.Ud",
    position: {
      id: "Wakil Dekan III — Bidang Kemahasiswaan, Alumni, dan Kerja Sama",
      en: "Vice Dean III — Student Affairs, Alumni and Partnerships",
      ar: "نائب العميد الثالث — شؤون الطلاب والخريجين والشراكات",
    },
    bio: {
      id: "Membina kegiatan kemahasiswaan, alumni, serta kerja sama dalam dan luar negeri.",
      en: "Supports student activities, alumni relations, and domestic and international partnerships.",
      ar: "يرعى الأنشطة الطلابية وعلاقات الخريجين والشراكات المحلية والدولية.",
    },
  },
] as const;

export const headOfAdmin: LeadershipMember = {
  initials: "SS",
  name: "Slamet Sucipto, S.E",
  position: {
    id: "Kepala Bagian Umum",
    en: "Head of General Affairs",
    ar: "رئيس الشؤون الإدارية",
  },
};

/** Ketua Program Studi per program code, for the org-structure chart. */
export const studyProgramChairs: Readonly<Record<string, string>> = {
  IAT: "Hikmatul Luthfi, MA.Hum",
  IH: "Dr. Andi Rosa, M.A",
  AFI: "Mus'idul Millah, S.Th.I., M.Ag.",
};
