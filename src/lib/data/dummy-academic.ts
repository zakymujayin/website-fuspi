/**
 * Placeholder academic content for the `/akademik/*` topic pages.
 *
 * Everything here is sample data so each page can be designed against a real
 * shape instead of an empty state. Replace these arrays (or swap them for a
 * CMS query) once the faculty supplies the official schedules, calendars,
 * curricula, and documents — the page components read only from this module.
 */

import {institution} from "@/config/institution";

export type ProgramCode = (typeof institution.studyPrograms)[number]["code"];

export const academicYear = "2026/2027";

/** Message key inside `Academic` for the running term. */
export const academicTermKey = "termOdd" as const;

export type WeekDay = "mon" | "tue" | "wed" | "thu" | "fri";

export const weekDays: readonly WeekDay[] = ["mon", "tue", "wed", "thu", "fri"];

export type DummyLectureSlot = {
  id: string;
  day: WeekDay;
  start: string;
  end: string;
  code: string;
  course: string;
  program: ProgramCode;
  semester: number;
  lecturer: string;
  room: string;
};

export const dummyLectureSchedule: readonly DummyLectureSlot[] = [
  {id: "s1", day: "mon", start: "07:30", end: "09:10", code: "IAT-2103", course: "Ulumul Qur’an II", program: "IAT", semester: 3, lecturer: "Dr. Masykur, M.Hum.", room: "R. 2.01"},
  {id: "s2", day: "mon", start: "09:20", end: "11:00", code: "IH-2107", course: "Takhrij Hadis", program: "IH", semester: 3, lecturer: "Dr. Masrukhin, M.Ag.", room: "R. 2.03"},
  {id: "s3", day: "mon", start: "13:00", end: "14:40", code: "AFI-2110", course: "Filsafat Islam Klasik", program: "AFI", semester: 3, lecturer: "Dr. Endang Saeful Anwar, M.A.", room: "R. 2.05"},
  {id: "s4", day: "tue", start: "07:30", end: "09:10", code: "IAT-2205", course: "Tafsir Tahlili", program: "IAT", semester: 5, lecturer: "Dr. Hj. Siti Fauziyah, M.Ag.", room: "R. 2.02"},
  {id: "s5", day: "tue", start: "09:20", end: "11:00", code: "IH-2211", course: "Fiqh al-Hadits", program: "IH", semester: 5, lecturer: "Dr. Ahmad Sanusi, M.A.", room: "R. 2.04"},
  {id: "s6", day: "tue", start: "13:00", end: "14:40", code: "FUS-1102", course: "Bahasa Arab II", program: "AFI", semester: 1, lecturer: "Ust. Abdul Hamid, M.Pd.", room: "Lab. Bahasa"},
  {id: "s7", day: "wed", start: "07:30", end: "09:10", code: "FUS-1104", course: "Metodologi Studi Islam", program: "IAT", semester: 1, lecturer: "Dr. Masykur, M.Hum.", room: "Aula FUSPI"},
  {id: "s8", day: "wed", start: "09:20", end: "11:00", code: "AFI-2214", course: "Tasawuf Falsafi", program: "AFI", semester: 5, lecturer: "Dr. Endang Saeful Anwar, M.A.", room: "R. 2.05"},
  {id: "s9", day: "wed", start: "13:00", end: "14:40", code: "IH-2109", course: "Ilmu Rijal al-Hadits", program: "IH", semester: 3, lecturer: "Dr. Masrukhin, M.Ag.", room: "R. 2.03"},
  {id: "s10", day: "thu", start: "07:30", end: "09:10", code: "IAT-2307", course: "Tafsir Maudhu’i", program: "IAT", semester: 7, lecturer: "Dr. Hj. Siti Fauziyah, M.Ag.", room: "R. 2.02"},
  {id: "s11", day: "thu", start: "09:20", end: "11:00", code: "FUS-1106", course: "Metodologi Penelitian", program: "IH", semester: 7, lecturer: "Dr. Ahmad Sanusi, M.A.", room: "R. 2.04"},
  {id: "s12", day: "thu", start: "13:00", end: "14:40", code: "AFI-2312", course: "Filsafat Ilmu", program: "AFI", semester: 7, lecturer: "Dr. Endang Saeful Anwar, M.A.", room: "R. 2.06"},
  {id: "s13", day: "fri", start: "07:30", end: "09:10", code: "FUS-1101", course: "Studi Al-Qur’an dan Hadis", program: "IAT", semester: 1, lecturer: "Dr. Masykur, M.Hum.", room: "Aula FUSPI"},
  {id: "s14", day: "fri", start: "09:20", end: "11:00", code: "IH-2113", course: "Hadis Tematik", program: "IH", semester: 3, lecturer: "Dr. Masrukhin, M.Ag.", room: "R. 2.03"},
];

export type CalendarPhase = "registration" | "lectures" | "assessment" | "closing";

export type DummyCalendarEntry = {
  id: string;
  phase: CalendarPhase;
  /** Human-readable date range, already formatted for `Asia/Jakarta`. */
  period: string;
  activity: string;
};

export const calendarPhases: readonly CalendarPhase[] = [
  "registration",
  "lectures",
  "assessment",
  "closing",
];

export const dummyAcademicCalendar: readonly DummyCalendarEntry[] = [
  {id: "c1", phase: "registration", period: "14 – 25 Juli 2026", activity: "Registrasi administrasi dan pembayaran UKT"},
  {id: "c2", phase: "registration", period: "28 Juli – 1 Agustus 2026", activity: "Pengisian Kartu Rencana Studi (KRS)"},
  {id: "c3", phase: "registration", period: "4 – 6 Agustus 2026", activity: "Masa perubahan dan pembatalan KRS"},
  {id: "c4", phase: "lectures", period: "11 Agustus 2026", activity: "Kuliah perdana dan pengenalan akademik fakultas"},
  {id: "c5", phase: "lectures", period: "11 Agustus – 3 Oktober 2026", activity: "Perkuliahan paruh pertama"},
  {id: "c6", phase: "lectures", period: "20 – 25 Oktober 2026", activity: "Ujian Tengah Semester (UTS)"},
  {id: "c7", phase: "lectures", period: "27 Oktober – 12 Desember 2026", activity: "Perkuliahan paruh kedua"},
  {id: "c8", phase: "assessment", period: "15 – 24 Desember 2026", activity: "Ujian Akhir Semester (UAS)"},
  {id: "c9", phase: "assessment", period: "5 – 9 Januari 2027", activity: "Batas akhir unggah nilai oleh dosen pengampu"},
  {id: "c10", phase: "assessment", period: "12 – 16 Januari 2027", activity: "Sidang munaqasyah skripsi periode ganjil"},
  {id: "c11", phase: "closing", period: "23 Januari 2027", activity: "Yudisium fakultas"},
  {id: "c12", phase: "closing", period: "20 Februari 2027", activity: "Wisuda universitas periode ganjil"},
];

export type DummyCurriculum = {
  program: ProgramCode;
  totalCredits: number;
  coreCredits: number;
  electiveCredits: number;
  semesters: number;
  degree: string;
  outcomes: readonly string[];
};

export const dummyCurricula: readonly DummyCurriculum[] = [
  {
    program: "IAT",
    totalCredits: 146,
    coreCredits: 128,
    electiveCredits: 18,
    semesters: 8,
    degree: "S.Ag.",
    outcomes: [
      "Menguasai ulumul Qur’an dan kaidah tafsir sebagai dasar pembacaan teks.",
      "Menerapkan metode tafsir tahlili, maudhu’i, dan muqaran secara terukur.",
      "Menghasilkan karya tafsir yang responsif terhadap persoalan kontemporer.",
    ],
  },
  {
    program: "IH",
    totalCredits: 146,
    coreCredits: 126,
    electiveCredits: 20,
    semesters: 8,
    degree: "S.Ag.",
    outcomes: [
      "Menguasai ilmu rijal, jarh wa ta’dil, dan metodologi takhrij hadis.",
      "Menilai kualitas sanad dan matan hadis dengan instrumen yang sahih.",
      "Mengontekstualisasikan pemahaman hadis dalam kehidupan masyarakat.",
    ],
  },
  {
    program: "AFI",
    totalCredits: 144,
    coreCredits: 124,
    electiveCredits: 20,
    semesters: 8,
    degree: "S.Ag.",
    outcomes: [
      "Menguasai peta pemikiran kalam, filsafat Islam, dan tasawuf.",
      "Menganalisis persoalan keagamaan dengan nalar filosofis yang jernih.",
      "Merumuskan argumen akidah yang moderat dan kontekstual.",
    ],
  },
];

export type CourseType = "core" | "elective";

export type DummyCourse = {
  code: string;
  name: string;
  credits: number;
  semester: number;
  program: ProgramCode | "FUS";
  type: CourseType;
};

/** `FUS` marks a faculty-wide course taken by all three programs. */
export const dummyCourses: readonly DummyCourse[] = [
  {code: "FUS-1101", name: "Studi Al-Qur’an dan Hadis", credits: 2, semester: 1, program: "FUS", type: "core"},
  {code: "FUS-1102", name: "Bahasa Arab I", credits: 3, semester: 1, program: "FUS", type: "core"},
  {code: "FUS-1103", name: "Pancasila dan Kewarganegaraan", credits: 2, semester: 1, program: "FUS", type: "core"},
  {code: "FUS-1104", name: "Metodologi Studi Islam", credits: 3, semester: 1, program: "FUS", type: "core"},
  {code: "FUS-1106", name: "Metodologi Penelitian", credits: 3, semester: 5, program: "FUS", type: "core"},
  {code: "IAT-2103", name: "Ulumul Qur’an II", credits: 3, semester: 3, program: "IAT", type: "core"},
  {code: "IAT-2205", name: "Tafsir Tahlili", credits: 3, semester: 5, program: "IAT", type: "core"},
  {code: "IAT-2307", name: "Tafsir Maudhu’i", credits: 3, semester: 7, program: "IAT", type: "core"},
  {code: "IAT-2411", name: "Living Qur’an", credits: 2, semester: 7, program: "IAT", type: "elective"},
  {code: "IH-2107", name: "Takhrij Hadis", credits: 3, semester: 3, program: "IH", type: "core"},
  {code: "IH-2109", name: "Ilmu Rijal al-Hadits", credits: 3, semester: 3, program: "IH", type: "core"},
  {code: "IH-2211", name: "Fiqh al-Hadits", credits: 3, semester: 5, program: "IH", type: "core"},
  {code: "IH-2113", name: "Hadis Tematik", credits: 2, semester: 3, program: "IH", type: "elective"},
  {code: "AFI-2110", name: "Filsafat Islam Klasik", credits: 3, semester: 3, program: "AFI", type: "core"},
  {code: "AFI-2214", name: "Tasawuf Falsafi", credits: 3, semester: 5, program: "AFI", type: "core"},
  {code: "AFI-2312", name: "Filsafat Ilmu", credits: 3, semester: 7, program: "AFI", type: "core"},
  {code: "AFI-2416", name: "Studi Agama-Agama", credits: 2, semester: 7, program: "AFI", type: "elective"},
];

export type DocumentCategory = "regulation" | "form" | "report" | "guide";

export type DummyAcademicDocument = {
  id: string;
  title: string;
  category: DocumentCategory;
  year: number;
  fileType: string;
  fileSize: string;
  /** Replace with the real storage URL when the file is published. */
  fileUrl: string;
};

export const dummyAcademicDocuments: readonly DummyAcademicDocument[] = [
  {id: "d1", title: "Panduan Penulisan Skripsi FUSPI", category: "guide", year: 2026, fileType: "PDF", fileSize: "2,4 MB", fileUrl: "/files/akademik/panduan-skripsi-fuspi.pdf"},
  {id: "d2", title: "Kalender Akademik 2026/2027", category: "regulation", year: 2026, fileType: "PDF", fileSize: "480 KB", fileUrl: "/files/akademik/kalender-akademik-2026-2027.pdf"},
  {id: "d3", title: "Formulir Pengajuan Judul Skripsi", category: "form", year: 2026, fileType: "DOCX", fileSize: "96 KB", fileUrl: "/files/akademik/formulir-pengajuan-judul.docx"},
  {id: "d4", title: "Formulir Cuti Akademik", category: "form", year: 2026, fileType: "DOCX", fileSize: "88 KB", fileUrl: "/files/akademik/formulir-cuti-akademik.docx"},
  {id: "d5", title: "Standar Operasional Prosedur Perkuliahan", category: "regulation", year: 2026, fileType: "PDF", fileSize: "1,1 MB", fileUrl: "/files/akademik/sop-perkuliahan.pdf"},
  {id: "d6", title: "Laporan Evaluasi Pembelajaran Semester Genap 2025/2026", category: "report", year: 2026, fileType: "PDF", fileSize: "3,2 MB", fileUrl: "/files/akademik/evaluasi-pembelajaran-2025-2026.pdf"},
  {id: "d7", title: "Panduan Kuliah Kerja Nyata Terintegrasi", category: "guide", year: 2025, fileType: "PDF", fileSize: "1,8 MB", fileUrl: "/files/akademik/panduan-kkn.pdf"},
  {id: "d8", title: "Laporan Kinerja Akademik Fakultas 2025", category: "report", year: 2025, fileType: "PDF", fileSize: "4,6 MB", fileUrl: "/files/akademik/laporan-kinerja-2025.pdf"},
];

export type DummyAccreditation = {
  id: string;
  /** `faculty` or one of the study program codes. */
  scope: "faculty" | ProgramCode;
  grade: string;
  agency: string;
  decreeNumber: string;
  validUntil: string;
};

export const dummyAccreditations: readonly DummyAccreditation[] = [
  {id: "a0", scope: "faculty", grade: "Unggul", agency: "BAN-PT", decreeNumber: "SK 1180/SK/BAN-PT/Ak/PT/VII/2026", validUntil: "17 Juli 2031"},
  {id: "a1", scope: "IAT", grade: "Unggul", agency: "BAN-PT", decreeNumber: "SK 4412/SK/BAN-PT/Ak.Ppj/S/VIII/2026", validUntil: "9 Agustus 2031"},
  {id: "a2", scope: "IH", grade: "Baik Sekali", agency: "BAN-PT", decreeNumber: "SK 4413/SK/BAN-PT/Ak.Ppj/S/VIII/2026", validUntil: "9 Agustus 2031"},
  {id: "a3", scope: "AFI", grade: "Baik Sekali", agency: "BAN-PT", decreeNumber: "SK 4414/SK/BAN-PT/Ak.Ppj/S/VIII/2026", validUntil: "9 Agustus 2031"},
];

export type DummyGuideline = {
  id: string;
  title: string;
  summary: string;
  chapters: readonly string[];
  fileType: string;
  fileSize: string;
  fileUrl: string;
};

export const dummyGuidelines: readonly DummyGuideline[] = [
  {
    id: "g1",
    title: "Pedoman Akademik FUSPI 2026/2027",
    summary: "Acuan utama penyelenggaraan pendidikan: beban studi, masa studi, penilaian, dan kelulusan.",
    chapters: [
      "Sistem kredit semester dan beban studi",
      "Registrasi, KRS, dan cuti akademik",
      "Penilaian, indeks prestasi, dan evaluasi studi",
      "Syarat kelulusan dan yudisium",
    ],
    fileType: "PDF",
    fileSize: "5,3 MB",
    fileUrl: "/files/akademik/pedoman-akademik-2026-2027.pdf",
  },
  {
    id: "g2",
    title: "Pedoman Penulisan Karya Ilmiah",
    summary: "Ketentuan sistematika, transliterasi Arab-Latin, sitasi, dan uji kemiripan naskah.",
    chapters: [
      "Sistematika proposal dan skripsi",
      "Transliterasi Arab-Latin",
      "Gaya sitasi dan daftar pustaka",
      "Batas kemiripan naskah dan sanksi",
    ],
    fileType: "PDF",
    fileSize: "2,9 MB",
    fileUrl: "/files/akademik/pedoman-karya-ilmiah.pdf",
  },
  {
    id: "g3",
    title: "Pedoman Etika Akademik Mahasiswa",
    summary: "Norma perilaku akademik, larangan plagiarisme, dan mekanisme penanganan pelanggaran.",
    chapters: [
      "Nilai dan norma akademik fakultas",
      "Bentuk pelanggaran akademik",
      "Prosedur pemeriksaan dan sanksi",
    ],
    fileType: "PDF",
    fileSize: "1,4 MB",
    fileUrl: "/files/akademik/pedoman-etika-akademik.pdf",
  },
];
