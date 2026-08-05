export type HeroSlide = {
  id: string;
  image: string;
  eyebrow: {id: string; en: string; ar: string};
  title: {id: string; en: string; ar: string};
  subtitle: {id: string; en: string; ar: string};
  primaryCta: {id: string; en: string; ar: string};
  primaryHref: string;
  secondaryCta: {id: string; en: string; ar: string};
  secondaryHref: string;
};

export const heroSlides: readonly HeroSlide[] = [
  {
    id: "welcome",
    image: "/images/hero/slide-1.jpg",
    eyebrow: {id: "Selamat Datang", en: "Welcome", ar: "أهلاً وسهلاً"},
    title: {
      id: "Fakultas Ushuluddin dan Pemikiran Islam",
      en: "Faculty of Ushuluddin and Islamic Thought",
      ar: "كلية أصول الدين والفكر الإسلامي",
    },
    subtitle: {
      id: "Mengembangkan kajian Al-Qur'an, hadis, aqidah, filsafat Islam, studi agama-agama, serta tasawuf dan psikoterapi dalam lingkungan akademik yang kredibel.",
      en: "Developing Qur'anic studies, hadith, aqidah, Islamic philosophy, religious studies, and Sufism with psychotherapy in a credible academic environment.",
      ar: "تطوير دراسات القرآن والحديث والعقيدة والفلسفة الإسلامية ودراسات الأديان والتصوف والعلاج النفسي في بيئة أكاديمية موثوقة.",
    },
    primaryCta: {id: "Profil Fakultas", en: "Faculty Profile", ar: "ملف الكلية"},
    primaryHref: "/profil",
    secondaryCta: {id: "Program Studi", en: "Study Programs", ar: "البرامج الدراسية"},
    secondaryHref: "/prodi",
  },
  {
    id: "programs",
    image: "/images/hero/slide-2.jpg",
    eyebrow: {id: "Lima Program Studi", en: "Five Study Programs", ar: "خمسة برامج دراسية"},
    title: {
      id: "Unggul dalam Kajian Keislaman",
      en: "Excellence in Islamic Studies",
      ar: "التميز في الدراسات الإسلامية",
    },
    subtitle: {
      id: "Dari Ilmu Al-Qur'an dan Tafsir hingga Tasawuf dan Psikoterapi, setiap program dirancang untuk membentuk akademisi dan profesional yang berdaya saing.",
      en: "From Qur'anic and Tafsir Studies to Sufism and Psychotherapy, each program is designed to shape competitive academics and professionals.",
      ar: "من دراسات القرآن والتفسير إلى التصوف والعلاج النفسي، تم تصميم كل برنامج لتشكيل أكاديميين ومحترفين تنافسيين.",
    },
    primaryCta: {id: "Lihat Program", en: "See Programs", ar: "استعرض البرامج"},
    primaryHref: "/prodi",
    secondaryCta: {id: "Daftar PMB", en: "Admissions", ar: "القبول"},
    secondaryHref: "https://pmb.uinbanten.ac.id",
  },
  {
    id: "admission",
    image: "/images/hero/slide-3.jpg",
    eyebrow: {id: "PMB 2026/2027", en: "Admission 2026/2027", ar: "القبول 2026/2027"},
    title: {
      id: "Jadi Bagian dari FUSPI",
      en: "Become Part of FUSPI",
      ar: "كن جزءاً من كلية أصول الدين",
    },
    subtitle: {
      id: "Bergabunglah dengan komunitas pembelajar yang mendalam dalam ilmu keislaman dan responsif terhadap dinamika zaman.",
      en: "Join a community of learners deeply rooted in Islamic knowledge and responsive to the dynamics of the times.",
      ar: "انضم إلى مجتمع من المتعلمين المتجذرين في المعرفة الإسلامية والمستجيبين لديناميكيات العصر.",
    },
    primaryCta: {id: "Daftar Sekarang", en: "Register Now", ar: "سجل الآن"},
    primaryHref: "https://pmb.uinbanten.ac.id",
    secondaryCta: {id: "Hubungi Kami", en: "Contact Us", ar: "تواصل معنا"},
    secondaryHref: "/kontak",
  },
] as const;
