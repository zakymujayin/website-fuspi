export const LECTURER_MANAGER_COPY = {
  id: {
    education: {
      title: "Riwayat pendidikan", description: "Atur kredensial akademik yang tampil di profil publik dosen.", degree: "Gelar", field: "Bidang studi", institution: "Institusi", city: "Kota", year: "Tahun", add: "Tambah pendidikan", save: "Simpan perubahan", remove: "Hapus", addTitle: "Tambah riwayat pendidikan", empty: "Belum ada riwayat pendidikan.", error: "Perubahan belum tersimpan. Periksa data dan coba lagi.",
      edit: "Sunting", actions: "Aksi", editTitle: "Sunting pendidikan",
      confirmTitle: "Hapus riwayat pendidikan?", confirmDescription: "Riwayat pendidikan \"{title}\" akan dihapus permanen.", cancel: "Batal",
    },
    publication: {
      title: "Publikasi", description: "Kelola karya ilmiah yang ditampilkan pada profil dosen.", name: "Judul publikasi", type: "Jenis", year: "Tahun", publisher: "Penerbit / jurnal", url: "Tautan", doi: "DOI", add: "Tambah publikasi", save: "Simpan perubahan", remove: "Hapus", addTitle: "Tambah publikasi", empty: "Belum ada publikasi.", error: "Perubahan belum tersimpan. Periksa data dan coba lagi.",
      edit: "Sunting", actions: "Aksi", editTitle: "Sunting publikasi",
      confirmTitle: "Hapus publikasi?", confirmDescription: "Publikasi \"{title}\" akan dihapus permanen.", cancel: "Batal",
    },
    hki: {
      title: "Hak kekayaan intelektual", description: "Kelola paten, hak cipta, merek, dan karya intelektual yang tampil di profil dosen.", name: "Judul karya", type: "Jenis", registration: "Nomor pendaftaran", year: "Tahun", url: "Tautan", add: "Tambah HKI", save: "Simpan perubahan", remove: "Hapus", addTitle: "Tambah hak kekayaan intelektual", empty: "Belum ada data HKI.", error: "Data HKI belum tersimpan. Periksa data dan coba lagi.",
      edit: "Sunting", actions: "Aksi", editTitle: "Sunting HKI",
      confirmTitle: "Hapus data HKI?", confirmDescription: "Data HKI \"{title}\" akan dihapus permanen.", cancel: "Batal",
    },
    teaching: {
      title: "Mata kuliah yang diampu", description: "Atur mata kuliah, semester, dan tahun akademik yang tampil pada profil dosen.", code: "Kode mata kuliah", name: "Nama mata kuliah", program: "Program studi", credits: "SKS", yearStart: "Tahun awal", yearEnd: "Tahun akhir", term: "Periode", semester: "Semester", add: "Tambah mata kuliah", save: "Simpan perubahan", remove: "Hapus", addTitle: "Tambah mata kuliah", empty: "Belum ada mata kuliah yang diampu.", error: "Mata kuliah belum tersimpan. Periksa data dan coba lagi.",
      edit: "Sunting", actions: "Aksi", editTitle: "Sunting mata kuliah",
      confirmTitle: "Hapus mata kuliah?", confirmDescription: "Mata kuliah \"{title}\" akan dihapus permanen.", cancel: "Batal",
      programs: [{value: "IAT", label: "IAT"}, {value: "IH", label: "IH"}, {value: "AFI", label: "AFI"}, {value: "FUS", label: "Lintas fakultas"}],
      terms: [{value: "GANJIL", label: "Ganjil"}, {value: "GENAP", label: "Genap"}],
    },
  },
  en: {
    education: {
      title: "Education history", description: "Manage the academic credentials shown on the public lecturer profile.", degree: "Degree", field: "Field of study", institution: "Institution", city: "City", year: "Year", add: "Add education", save: "Save changes", remove: "Delete", addTitle: "Add education history", empty: "No education history yet.", error: "The change was not saved. Check the fields and try again.",
      edit: "Edit", actions: "Actions", editTitle: "Edit education",
      confirmTitle: "Delete this education record?", confirmDescription: "\"{title}\" will be permanently removed.", cancel: "Cancel",
    },
    publication: {
      title: "Publications", description: "Manage scholarly work shown on the lecturer profile.", name: "Publication title", type: "Type", year: "Year", publisher: "Publisher / journal", url: "Link", doi: "DOI", add: "Add publication", save: "Save changes", remove: "Delete", addTitle: "Add publication", empty: "No publications yet.", error: "The change was not saved. Check the fields and try again.",
      edit: "Edit", actions: "Actions", editTitle: "Edit publication",
      confirmTitle: "Delete this publication?", confirmDescription: "\"{title}\" will be permanently removed.", cancel: "Cancel",
    },
    hki: {
      title: "Intellectual property", description: "Manage patents, copyrights, trademarks, and other work shown on the lecturer profile.", name: "Work title", type: "Type", registration: "Registration number", year: "Year", url: "Link", add: "Add IP record", save: "Save changes", remove: "Delete", addTitle: "Add intellectual property", empty: "No intellectual property records yet.", error: "The IP record was not saved. Check the fields and try again.",
      edit: "Edit", actions: "Actions", editTitle: "Edit IP record",
      confirmTitle: "Delete this IP record?", confirmDescription: "\"{title}\" will be permanently removed.", cancel: "Cancel",
    },
    teaching: {
      title: "Courses taught", description: "Manage courses, semesters, and academic years shown on the lecturer profile.", code: "Course code", name: "Course name", program: "Study program", credits: "Credits", yearStart: "Start year", yearEnd: "End year", term: "Term", semester: "Semester", add: "Add course", save: "Save changes", remove: "Delete", addTitle: "Add course", empty: "No teaching assignments yet.", error: "The course assignment was not saved. Check the fields and try again.",
      edit: "Edit", actions: "Actions", editTitle: "Edit course",
      confirmTitle: "Delete this course?", confirmDescription: "\"{title}\" will be permanently removed.", cancel: "Cancel",
      programs: [{value: "IAT", label: "IAT"}, {value: "IH", label: "IH"}, {value: "AFI", label: "AFI"}, {value: "FUS", label: "Faculty-wide"}],
      terms: [{value: "GANJIL", label: "Odd"}, {value: "GENAP", label: "Even"}],
    },
  },
  ar: {
    education: {
      title: "المؤهلات العلمية", description: "إدارة المؤهلات الأكاديمية الظاهرة في الملف العام للمحاضر.", degree: "الدرجة", field: "مجال الدراسة", institution: "المؤسسة", city: "المدينة", year: "السنة", add: "إضافة مؤهل", save: "حفظ التغييرات", remove: "حذف", addTitle: "إضافة مؤهل علمي", empty: "لا توجد مؤهلات علمية بعد.", error: "لم يُحفظ التغيير. راجع الحقول وحاول مرة أخرى.",
      edit: "تحرير", actions: "إجراءات", editTitle: "تحرير المؤهل",
      confirmTitle: "حذف المؤهل العلمي؟", confirmDescription: "سيتم حذف \"{title}\" نهائياً.", cancel: "إلغاء",
    },
    publication: {
      title: "المنشورات", description: "إدارة الأعمال العلمية الظاهرة في ملف المحاضر.", name: "عنوان المنشور", type: "النوع", year: "السنة", publisher: "الناشر / المجلة", url: "الرابط", doi: "DOI", add: "إضافة منشور", save: "حفظ التغييرات", remove: "حذف", addTitle: "إضافة منشور", empty: "لا توجد منشورات بعد.", error: "لم يُحفظ التغيير. راجع الحقول وحاول مرة أخرى.",
      edit: "تحرير", actions: "إجراءات", editTitle: "تحرير المنشور",
      confirmTitle: "حذف المنشور؟", confirmDescription: "سيتم حذف \"{title}\" نهائياً.", cancel: "إلغاء",
    },
    hki: {
      title: "الملكية الفكرية", description: "إدارة براءات الاختراع وحقوق النشر والعلامات والأعمال الظاهرة في ملف المحاضر.", name: "عنوان العمل", type: "النوع", registration: "رقم التسجيل", year: "السنة", url: "الرابط", add: "إضافة ملكية فكرية", save: "حفظ التغييرات", remove: "حذف", addTitle: "إضافة ملكية فكرية", empty: "لا توجد سجلات ملكية فكرية بعد.", error: "لم يُحفظ السجل. راجع الحقول وحاول مرة أخرى.",
      edit: "تحرير", actions: "إجراءات", editTitle: "تحرير الملكية الفكرية",
      confirmTitle: "حذف سجل الملكية الفكرية؟", confirmDescription: "سيتم حذف \"{title}\" نهائياً.", cancel: "إلغاء",
    },
    teaching: {
      title: "المقررات التي يدرّسها", description: "إدارة المقررات والفصول والسنوات الأكاديمية الظاهرة في ملف المحاضر.", code: "رمز المقرر", name: "اسم المقرر", program: "البرنامج", credits: "الساعات", yearStart: "سنة البداية", yearEnd: "سنة النهاية", term: "الفصل", semester: "المستوى", add: "إضافة مقرر", save: "حفظ التغييرات", remove: "حذف", addTitle: "إضافة مقرر", empty: "لا توجد تكليفات تدريس بعد.", error: "لم يُحفظ التكليف. راجع الحقول وحاول مرة أخرى.",
      edit: "تحرير", actions: "إجراءات", editTitle: "تحرير المقرر",
      confirmTitle: "حذف المقرر؟", confirmDescription: "سيتم حذف \"{title}\" نهائياً.", cancel: "إلغاء",
      programs: [{value: "IAT", label: "IAT"}, {value: "IH", label: "IH"}, {value: "AFI", label: "AFI"}, {value: "FUS", label: "على مستوى الكلية"}],
      terms: [{value: "GANJIL", label: "الفصل الأول"}, {value: "GENAP", label: "الفصل الثاني"}],
    },
  },
} as const;
