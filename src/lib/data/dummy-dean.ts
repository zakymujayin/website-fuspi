export type DeanProfile = {
  name: string;
  initials: string;
  photoUrl?: string;
  position: {id: string; en: string; ar: string};
  message: {id: string; en: string; ar: string};
  slug: string;
};

export const deanProfile: DeanProfile = {
  name: "Dr. Masykur, M.Hum.",
  initials: "M",
  photoUrl: "/images/leadership/dekan-masykur.webp",
  position: {
    id: "Dekan Fakultas Ushuluddin dan Pemikiran Islam",
    en: "Dean of the Faculty of Ushuluddin and Islamic Thought",
    ar: "عميد كلية أصول الدين والفكر الإسلامي",
  },
  message: {
    id: "Assalamu'alaikum warahmatullahi wabarakatuh. Selamat datang di situs resmi Fakultas Ushuluddin dan Pemikiran Islam UIN Sultan Maulana Hasanuddin Banten. FUSPI hadir sebagai pusat pengembangan keilmuan Islam yang integratif, menghasilkan lulusan yang mendalam dalam ilmu keislaman sekaligus tanggap terhadap dinamika zaman. Kami berkomitmen menjadikan FUSPI sebagai fakultas yang kredibel, kontekstual, dan berdaya saing global.",
    en: "Assalamu'alaikum warahmatullahi wabarakatuh. Welcome to the official website of the Faculty of Ushuluddin and Islamic Thought, UIN Sultan Maulana Hasanuddin Banten. FUSPI is a hub for integrative Islamic knowledge development, producing graduates deeply rooted in Islamic sciences and responsive to contemporary dynamics. We are committed to making FUSPI a credible, contextual, and globally competitive faculty.",
    ar: "السلام عليكم ورحمة الله وبركاته. أهلاً بكم في الموقع الرسمي لكلية أصول الدين والفكر الإسلامي بجامعة سلطان مولانا حسن الدين بنتن. تقدم الكلية نفسها كمركز لتطوير المعرفة الإسلامية التكاملية، لإعداد خريجين متجذرين في العلوم الإسلامية ومستجيبين لديناميكيات العصر. نلتزم بجعل الكلية موثوقة وسياقية وتنافسية عالمياً.",
  },
  slug: "/profil/pimpinan",
};
