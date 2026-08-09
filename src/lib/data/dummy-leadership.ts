export type LeadershipMember = {
  initials: string;
  name: string;
  position: {id: string; en: string; ar: string};
  bio?: {id: string; en: string; ar: string};
};

export const viceDeans: readonly LeadershipMember[] = [
  {
    initials: "RH",
    name: "Dr. Rahmawati Husna, M.A.",
    position: {
      id: "Wakil Dekan I — Bidang Akademik",
      en: "Vice Dean I — Academic Affairs",
      ar: "نائب العميد الأول — الشؤون الأكاديمية",
    },
    bio: {
      id: "Mengoordinasikan kurikulum, mutu pembelajaran, dan pengembangan program studi di lingkungan FUSPI.",
      en: "Coordinates curriculum, learning quality, and study-program development across FUSPI.",
      ar: "تنسّق المناهج وجودة التعلّم وتطوير البرامج الدراسية في الكلية.",
    },
  },
  {
    initials: "IS",
    name: "Dr. H. Imron Supriyadi, M.Pd.",
    position: {
      id: "Wakil Dekan II — Administrasi Umum dan Keuangan",
      en: "Vice Dean II — General Administration and Finance",
      ar: "نائب العميد الثاني — الإدارة العامة والمالية",
    },
    bio: {
      id: "Mengelola tata kelola administrasi, keuangan, serta sarana dan prasarana fakultas.",
      en: "Oversees administrative governance, finance, and the faculty's facilities.",
      ar: "يشرف على الإدارة والشؤون المالية ومرافق الكلية.",
    },
  },
  {
    initials: "NF",
    name: "Dr. Nur Fadhilah, M.Si.",
    position: {
      id: "Wakil Dekan III — Kemahasiswaan dan Kerja Sama",
      en: "Vice Dean III — Student Affairs and Partnerships",
      ar: "نائب العميد الثالث — شؤون الطلاب والشراكات",
    },
    bio: {
      id: "Membina kegiatan kemahasiswaan, alumni, serta kerja sama dalam dan luar negeri.",
      en: "Supports student activities, alumni relations, and domestic and international partnerships.",
      ar: "يرعى الأنشطة الطلابية وعلاقات الخريجين والشراكات المحلية والدولية.",
    },
  },
] as const;

export const headOfAdmin: LeadershipMember = {
  initials: "TU",
  name: "Wahyu Setiawan, S.A.P.",
  position: {
    id: "Kepala Bagian Tata Usaha",
    en: "Head of General Affairs",
    ar: "رئيس الشؤون الإدارية",
  },
};
