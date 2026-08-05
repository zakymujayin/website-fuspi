export type DummyEvent = {
  id: string;
  slug: string;
  date: string;
  time?: string;
  title: {id: string; en: string; ar: string};
  location: {id: string; en: string; ar: string};
};

export const dummyEvents: readonly DummyEvent[] = [
  {
    id: "event-1",
    slug: "bedah-buku-tafsir-kontekstual",
    date: "2026-08-12",
    time: "09:00 - 12:00 WIB",
    title: {
      id: "Bedah Buku: Tafsir Kontekstual di Indonesia Kontemporer",
      en: "Book Review: Contextual Tafsir in Contemporary Indonesia",
      ar: "نقاش كتاب: التفسير السياقي في إندونيسيا المعاصرة",
    },
    location: {id: "Aula Fakultas Ushuluddin", en: "FUSPI Auditorium", ar: "قاعة كلية أصول الدين"},
  },
  {
    id: "event-2",
    slug: "diskusi-publik-agama-dan-kebangsaan",
    date: "2026-08-18",
    time: "13:30 - 15:30 WIB",
    title: {
      id: "Diskusi Publik: Peran Studi Agama dalam Kehidupan Kebangsaan",
      en: "Public Discussion: The Role of Religious Studies in National Life",
      ar: "حوار عام: دور دراسات الأديان في الحياة الوطنية",
    },
    location: {id: "Ruang Seminar Lantai 2", en: "2nd Floor Seminar Room", ar: "غرفة الندوة بالطابق الثاني"},
  },
  {
    id: "event-3",
    slug: "pengajian-bulanan-fuspi",
    date: "2026-08-22",
    time: "16:00 - 18:00 WIB",
    title: {
      id: "Pengajian Bulanan FUSPI: Khuluqul ‘Ashiq al-Qur'an",
      en: "Monthly FUSPI Study: The Character of the People of the Qur'an",
      ar: "الدرس الشهري: أخلاق أهل القرآن",
    },
    location: {id: "Masjid Kampus UIN Banten", en: "UIN Banten Campus Mosque", ar: "مسجد جامعة بنتن"},
  },
] as const;
