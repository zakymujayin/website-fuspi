export type DummyFacility = {
  id: string;
  title: {id: string; en: string; ar: string};
  description: {id: string; en: string; ar: string};
  image: string;
};

export const dummyFacilities: readonly DummyFacility[] = [
  {
    id: "library",
    title: {id: "Perpustakaan", en: "Library", ar: "المكتبة"},
    description: {
      id: "Koleksi buku dan referensi keislaman yang mendukung pembelajaran dan penelitian mahasiswa.",
      en: "A collection of Islamic books and references supporting student learning and research.",
      ar: "مجموعة من الكتب والمراجع الإسلامية لدعم تعلم الطلاب وأبحاثهم.",
    },
    image: "/images/facilities/library.jpg",
  },
  {
    id: "classroom",
    title: {id: "Ruang Kelas", en: "Classrooms", ar: "قاعات الدراسة"},
    description: {
      id: "Ruang perkuliahan nyaman dengan fasilitas audio-visual untuk pengalaman belajar optimal.",
      en: "Comfortable lecture halls with audio-visual facilities for an optimal learning experience.",
      ar: "قاعات محاضرات مريحة بمرافق سمعية وبصرية لتجربة تعلم مثلى.",
    },
    image: "/images/hero/slide-2.jpg",
  },
  {
    id: "mosque",
    title: {id: "Masjid Kampus", en: "Campus Mosque", ar: "مسجد الجامعة"},
    description: {
      id: "Pusat kegiatan keislaman, pengajian, dan pembentukan karakter spiritual mahasiswa.",
      en: "A hub for Islamic activities, study sessions, and spiritual character development.",
      ar: "مركز للأنشطة الإسلامية والدروس وتنمية الشخصية الروحية للطلاب.",
    },
    image: "/images/hero/slide-3.jpg",
  },
  {
    id: "lab",
    title: {id: "Laboratorium Bahasa", en: "Language Laboratory", ar: "مختبر اللغة"},
    description: {
      id: "Fasilitas praktik bahasa Arab dan Inggris untuk mendukung kompetensi mahasiswa.",
      en: "Arabic and English language practice facilities to support student competence.",
      ar: "مرافق لممارسة اللغتين العربية والإنجليزية لدعم كفاءة الطلاب.",
    },
    image: "/images/hero/slide-1.jpg",
  },
] as const;
