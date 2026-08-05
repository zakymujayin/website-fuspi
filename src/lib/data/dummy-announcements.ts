export type DummyAnnouncement = {
  id: string;
  slug: string;
  date: string;
  title: {id: string; en: string; ar: string};
};

export const dummyAnnouncements: readonly DummyAnnouncement[] = [
  {
    id: "ann-1",
    slug: "pengumuman-jadwal-ujian-akhir-semester",
    date: "2026-08-04",
    title: {
      id: "Jadwal Ujian Akhir Semester Ganjil Tahun Akademik 2026/2027",
      en: "Final Exam Schedule for Odd Semester Academic Year 2026/2027",
      ar: "جدول الاختبارات النهائية للفصل الدراسي الفردي 2026/2027",
    },
  },
  {
    id: "ann-2",
    slug: "pengumuman-pendaftaran-wisuda",
    date: "2026-07-25",
    title: {
      id: "Pendaftaran Wisuda Periode Agustus 2026 Telah Dibuka",
      en: "Registration for the August 2026 Graduation Period is Now Open",
      ar: "فتح التسجيل لحفل التخرج لشهر أغسطس 2026",
    },
  },
  {
    id: "ann-3",
    slug: "pengumuman-beasiswa-berprestasi",
    date: "2026-07-18",
    title: {
      id: "Penerimaan Beasiswa Berprestasi dan Beasiswa Tidak Mampu FUSPI",
      en: "FUSPI Achievement and Need-Based Scholarship Applications Open",
      ar: "فتح قبول منح كلية أصول الدين للتفوق والحاجة المالية",
    },
  },
] as const;
