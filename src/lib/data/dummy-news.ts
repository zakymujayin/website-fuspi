export type DummyNews = {
  id: string;
  slug: string;
  date: string;
  category: {id: string; en: string; ar: string};
  title: {id: string; en: string; ar: string};
  excerpt: {id: string; en: string; ar: string};
  image: string;
  author: string;
};

export const dummyNews: readonly DummyNews[] = [
  {
    id: "news-1",
    slug: "seminar-tafsir-kontekstual-fuspi-2026",
    date: "2026-08-01",
    category: {id: "Berita", en: "News", ar: "أخبار"},
    title: {
      id: "Fuspi Gelar Seminar Tafsir Kontekstual: Membaca Al-Qur'an di Tengah Dinamika Sosial",
      en: "FUSPI Holds Contextual Tafsir Seminar: Reading the Qur'an Amid Social Dynamics",
      ar: "كلية أصول الدين والفكر الإسلامي تنظم ندوة تفسير سياقية",
    },
    excerpt: {
      id: "Kajian tafsir tidak lagi berhenti pada teks, melainkan menjawab persoalan umat kontemporer melalui pendekatan keilmuan yang kredibel.",
      en: "Tafsir studies no longer stop at the text, but answer contemporary community issues through credible scholarly approaches.",
      ar: "دراسات التفسير لم تعد تتوقف عند النص، بل تجيب على قضايا المجتمع المعاصر من خلال مناهج علمية موثوقة.",
    },
    image: "/images/news/news-1.jpg",
    author: "Humas FUSPI",
  },
  {
    id: "news-2",
    slug: "mahasiswa-fuspi-lolos-konferensi-internasional",
    date: "2026-07-28",
    category: {id: "Berita", en: "News", ar: "أخبار"},
    title: {
      id: "Mahasiswa FUSPI Lolos Presenter di Konferensi Internasional Studi Keislaman",
      en: "FUSPI Students Selected as Presenters at an International Islamic Studies Conference",
      ar: "طلاب كلية أصول الدين يُختارون للمشاركة في مؤتمر دولي للدراسات الإسلامية",
    },
    excerpt: {
      id: "Dua mahasiswa Program Studi Ilmu Hadis berhasil lolos seleksi abstrak dan akan mempresentasikan riset di Kuala Lumpur.",
      en: "Two students from the Hadith Studies program passed the abstract selection and will present their research in Kuala Lumpur.",
      ar: "طالبان من برنامج دراسات الحديث اجتازا اختيار الملخصات وسيقدمان بحثهما في كوالالمبور.",
    },
    image: "/images/news/news-2.jpg",
    author: "Biro Kemahasiswaan",
  },
  {
    id: "news-3",
    slug: "workshop-filsafat-islam-fuspi",
    date: "2026-07-20",
    category: {id: "Berita", en: "News", ar: "أخبار"},
    title: {
      id: "Workshop Filsafat Islam: Menyelaraskan Tradisi dan Diskursus Modern",
      en: "Islamic Philosophy Workshop: Aligning Tradition and Modern Discourse",
      ar: "ورشة عمل الفلسفة الإسلامية: مواءمة التقليد والخطاب الحديث",
    },
    excerpt: {
      id: "Peserta diajak membaca ulang pemikiran klasik Islam dan mengajukan kritik konstruktif terhadap persoalan epistemologi masa kini.",
      en: "Participants are invited to revisit classical Islamic thought and propose constructive criticism of contemporary epistemological issues.",
      ar: "يُدعى المشاركون إلى إعادة قراءة الفكر الإسلامي الكلاسيكي وتقديم نقد بناء لقضايا المعرفة المعاصرة.",
    },
    image: "/images/facilities/library.jpg",
    author: "Bagian Akademik",
  },
] as const;
