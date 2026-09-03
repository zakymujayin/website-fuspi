"use client";

import {BookOpenIcon, CircleAlertIcon, CircleCheckIcon, LightbulbIcon} from "lucide-react";
import {useActionState} from "react";

import {
  saveAdminHkiAction,
  saveAdminTeachingAction,
  type AdminLecturerAcademicFormState,
} from "./lecturer-academic-records-actions";
import type {AdminLecturerAcademicRecords} from "@/features/academic/lecturer-academic-records";
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {PortalSubmitButton} from "@/components/portal/portal-form-status";
import type {AppLocale} from "@/i18n/routing";

type Labels = {
  hki: {title: string; description: string; name: string; type: string; registration: string; year: string; url: string; add: string; save: string; remove: string; addTitle: string; empty: string; saved: string; error: string};
  teaching: {title: string; description: string; code: string; name: string; program: string; credits: string; yearStart: string; yearEnd: string; term: string; semester: string; add: string; save: string; remove: string; addTitle: string; empty: string; saved: string; error: string};
  types: ReadonlyArray<{value: string; label: string}>;
  programs: ReadonlyArray<{value: string; label: string}>;
  terms: ReadonlyArray<{value: string; label: string}>;
};

const COPY = {
  id: {
    hki: {title: "Hak kekayaan intelektual", description: "Kelola paten, hak cipta, merek, dan karya intelektual yang tampil di profil dosen.", name: "Judul karya", type: "Jenis", registration: "Nomor pendaftaran", year: "Tahun", url: "Tautan", add: "Tambah HKI", save: "Simpan perubahan", remove: "Hapus", addTitle: "Tambah hak kekayaan intelektual", empty: "Belum ada data HKI.", saved: "Data HKI tersimpan.", error: "Data HKI belum tersimpan. Periksa data dan coba lagi."},
    teaching: {title: "Mata kuliah yang diampu", description: "Atur mata kuliah, semester, dan tahun akademik yang tampil pada profil dosen.", code: "Kode mata kuliah", name: "Nama mata kuliah", program: "Program studi", credits: "SKS", yearStart: "Tahun awal", yearEnd: "Tahun akhir", term: "Periode", semester: "Semester", add: "Tambah mata kuliah", save: "Simpan perubahan", remove: "Hapus", addTitle: "Tambah mata kuliah", empty: "Belum ada mata kuliah yang diampu.", saved: "Mata kuliah tersimpan.", error: "Mata kuliah belum tersimpan. Periksa data dan coba lagi."},
  },
  en: {
    hki: {title: "Intellectual property", description: "Manage patents, copyrights, trademarks, and other work shown on the lecturer profile.", name: "Work title", type: "Type", registration: "Registration number", year: "Year", url: "Link", add: "Add IP record", save: "Save changes", remove: "Delete", addTitle: "Add intellectual property", empty: "No intellectual property records yet.", saved: "IP record saved.", error: "The IP record was not saved. Check the fields and try again."},
    teaching: {title: "Courses taught", description: "Manage courses, semesters, and academic years shown on the lecturer profile.", code: "Course code", name: "Course name", program: "Study program", credits: "Credits", yearStart: "Start year", yearEnd: "End year", term: "Term", semester: "Semester", add: "Add course", save: "Save changes", remove: "Delete", addTitle: "Add course", empty: "No teaching assignments yet.", saved: "Course assignment saved.", error: "The course assignment was not saved. Check the fields and try again."},
  },
  ar: {
    hki: {title: "الملكية الفكرية", description: "إدارة براءات الاختراع وحقوق النشر والعلامات والأعمال الظاهرة في ملف المحاضر.", name: "عنوان العمل", type: "النوع", registration: "رقم التسجيل", year: "السنة", url: "الرابط", add: "إضافة ملكية فكرية", save: "حفظ التغييرات", remove: "حذف", addTitle: "إضافة ملكية فكرية", empty: "لا توجد سجلات ملكية فكرية بعد.", saved: "تم حفظ السجل.", error: "لم يُحفظ السجل. راجع الحقول وحاول مرة أخرى."},
    teaching: {title: "المقررات التي يدرّسها", description: "إدارة المقررات والفصول والسنوات الأكاديمية الظاهرة في ملف المحاضر.", code: "رمز المقرر", name: "اسم المقرر", program: "البرنامج", credits: "الساعات", yearStart: "سنة البداية", yearEnd: "سنة النهاية", term: "الفصل", semester: "المستوى", add: "إضافة مقرر", save: "حفظ التغييرات", remove: "حذف", addTitle: "إضافة مقرر", empty: "لا توجد تكليفات تدريس بعد.", saved: "تم حفظ التكليف.", error: "لم يُحفظ التكليف. راجع الحقول وحاول مرة أخرى."},
  },
} as const;

function Status({state, labels}: {state: AdminLecturerAcademicFormState; labels: {saved: string; error: string}}) {
  return (
    <p role="status" aria-live="polite" className={state.status === "saved" ? "flex items-center gap-2 text-xs font-medium text-emerald-700" : state.status === "error" ? "flex items-center gap-2 text-xs font-medium text-destructive" : "sr-only"}>
      {state.status === "saved" ? <CircleCheckIcon aria-hidden className="size-4" /> : state.status === "error" ? <CircleAlertIcon aria-hidden className="size-4" /> : null}
      {state.status === "saved" ? labels.saved : state.status === "error" ? labels.error : ""}
    </p>
  );
}

function HkiRow({lecturerId, item, labels}: {lecturerId: string; item: AdminLecturerAcademicRecords["hki"][number] | null; labels: Labels["hki"]}) {
  const [state, action, pending] = useActionState(saveAdminHkiAction, {status: "idle"} satisfies AdminLecturerAcademicFormState);
  const isNew = item === null;
  const key = item?.id ?? "new";
  return (
    <form action={action} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <input type="hidden" name="lecturerId" value={lecturerId} />
      {!isNew ? <input type="hidden" name="id" value={item.id} /> : null}
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2"><FieldLabel htmlFor={`admin-hki-title-${key}`}>{labels.name}</FieldLabel><Input id={`admin-hki-title-${key}`} name="title" required maxLength={500} defaultValue={item?.title ?? ""} dir="auto" /></Field>
        <Field><FieldLabel htmlFor={`admin-hki-type-${key}`}>{labels.type}</FieldLabel><select id={`admin-hki-type-${key}`} name="type" defaultValue={item?.type ?? "HAK_CIPTA"} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15">{labels.types.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></Field>
        <Field><FieldLabel htmlFor={`admin-hki-year-${key}`}>{labels.year}</FieldLabel><Input id={`admin-hki-year-${key}`} name="year" type="number" min={1900} max={2100} defaultValue={item?.year ?? ""} dir="ltr" /></Field>
        <Field><FieldLabel htmlFor={`admin-hki-registration-${key}`}>{labels.registration}</FieldLabel><Input id={`admin-hki-registration-${key}`} name="registrationNumber" maxLength={191} defaultValue={item?.registrationNumber ?? ""} dir="auto" /></Field>
        <Field><FieldLabel htmlFor={`admin-hki-url-${key}`}>{labels.url}</FieldLabel><Input id={`admin-hki-url-${key}`} name="url" type="url" maxLength={2048} defaultValue={item?.url ?? ""} dir="ltr" /></Field>
      </FieldGroup>
      <div className="mt-4 flex flex-wrap items-center gap-3"><PortalSubmitButton pending={pending} label={isNew ? labels.add : labels.save} pendingLabel={labels.save} />{!isNew ? <PortalSubmitButton pending={pending} variant="quiet" name="intent" value="delete" label={labels.remove} pendingLabel={labels.remove} /> : null}<Status state={state} labels={labels} /></div>
    </form>
  );
}

function TeachingRow({lecturerId, item, labels}: {lecturerId: string; item: AdminLecturerAcademicRecords["teaching"][number] | null; labels: Labels["teaching"]}) {
  const [state, action, pending] = useActionState(saveAdminTeachingAction, {status: "idle"} satisfies AdminLecturerAcademicFormState);
  const isNew = item === null;
  const key = item?.id ?? "new";
  return (
    <form action={action} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <input type="hidden" name="lecturerId" value={lecturerId} />
      {!isNew ? <input type="hidden" name="id" value={item.id} /> : null}
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field><FieldLabel htmlFor={`admin-teaching-code-${key}`}>{labels.code}</FieldLabel><Input id={`admin-teaching-code-${key}`} name="courseCode" required maxLength={50} defaultValue={item?.courseCode ?? ""} dir="ltr" /></Field>
        <Field><FieldLabel htmlFor={`admin-teaching-program-${key}`}>{labels.program}</FieldLabel><select id={`admin-teaching-program-${key}`} name="programCode" defaultValue={item?.programCode ?? "IAT"} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15">{labels.programs.map((program) => <option key={program.value} value={program.value}>{program.label}</option>)}</select></Field>
        <Field className="sm:col-span-2"><FieldLabel htmlFor={`admin-teaching-name-${key}`}>{labels.name}</FieldLabel><Input id={`admin-teaching-name-${key}`} name="courseName" required maxLength={255} defaultValue={item?.courseName ?? ""} dir="auto" /></Field>
        <Field><FieldLabel htmlFor={`admin-teaching-credits-${key}`}>{labels.credits}</FieldLabel><Input id={`admin-teaching-credits-${key}`} name="credits" type="number" min={0} max={10} defaultValue={item?.credits ?? ""} dir="ltr" /></Field>
        <Field><FieldLabel htmlFor={`admin-teaching-semester-${key}`}>{labels.semester}</FieldLabel><Input id={`admin-teaching-semester-${key}`} name="semester" type="number" min={1} max={8} defaultValue={item?.semester ?? ""} dir="ltr" /></Field>
        <Field><FieldLabel htmlFor={`admin-teaching-start-${key}`}>{labels.yearStart}</FieldLabel><Input id={`admin-teaching-start-${key}`} name="academicYearStart" type="number" min={1900} max={2100} defaultValue={item?.academicYearStart ?? ""} dir="ltr" /></Field>
        <Field><FieldLabel htmlFor={`admin-teaching-end-${key}`}>{labels.yearEnd}</FieldLabel><Input id={`admin-teaching-end-${key}`} name="academicYearEnd" type="number" min={1900} max={2100} defaultValue={item?.academicYearEnd ?? ""} dir="ltr" /></Field>
        <Field><FieldLabel htmlFor={`admin-teaching-term-${key}`}>{labels.term}</FieldLabel><select id={`admin-teaching-term-${key}`} name="term" defaultValue={item?.term ?? "GANJIL"} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15">{labels.terms.map((term) => <option key={term.value} value={term.value}>{term.label}</option>)}</select></Field>
      </FieldGroup>
      <div className="mt-4 flex flex-wrap items-center gap-3"><PortalSubmitButton pending={pending} label={isNew ? labels.add : labels.save} pendingLabel={labels.save} />{!isNew ? <PortalSubmitButton pending={pending} variant="quiet" name="intent" value="delete" label={labels.remove} pendingLabel={labels.remove} /> : null}<Status state={state} labels={labels} /></div>
    </form>
  );
}

export function LecturerAcademicRecordsManager({locale, lecturerId, records}: {locale: AppLocale; lecturerId: string; records: AdminLecturerAcademicRecords}) {
  const copy = COPY[locale];
  const types = ["PATEN", "HAK_CIPTA", "MEREK", "DESAIN_INDUSTRI", "LAINNYA"].map((value) => ({value, label: value.replaceAll("_", " ")}));
  const programs = [{value: "IAT", label: "IAT"}, {value: "IH", label: "IH"}, {value: "AFI", label: "AFI"}, {value: "FUS", label: locale === "id" ? "Lintas fakultas" : locale === "en" ? "Faculty-wide" : "على مستوى الكلية"}];
  const terms = [{value: "GANJIL", label: locale === "id" ? "Ganjil" : locale === "en" ? "Odd" : "الفصل الأول"}, {value: "GENAP", label: locale === "id" ? "Genap" : locale === "en" ? "Even" : "الفصل الثاني"}];
  return (
    <section id="lecturer-academic-records" aria-labelledby="admin-lecturer-academic-records-title" className="mt-10 border-t border-slate-200 pt-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-primary">{locale === "id" ? "REKAM AKADEMIK" : locale === "en" ? "ACADEMIC RECORD" : "السجل الأكاديمي"}</p><h2 id="admin-lecturer-academic-records-title" className="mt-2 font-display text-2xl tracking-tight text-slate-950">{locale === "id" ? "HKI & pengajaran" : locale === "en" ? "IP & teaching" : "الملكية الفكرية والتدريس"}</h2></div><p className="text-sm text-slate-500">{records.hki.length} {locale === "id" ? "HKI" : "IP"} · {records.teaching.length} {locale === "id" ? "mata kuliah" : locale === "en" ? "courses" : "مقررات"}</p></div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="space-y-4"><div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><LightbulbIcon aria-hidden className="size-5" /></div><div><h3 className="font-display text-lg font-semibold text-slate-950">{copy.hki.title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{copy.hki.description}</p></div></div>{records.hki.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">{copy.hki.empty}</p> : records.hki.map((item) => <HkiRow key={item.id} lecturerId={lecturerId} item={item} labels={{...copy.hki, types}} />)}<div><p className="mb-3 text-sm font-semibold text-slate-800">{copy.hki.addTitle}</p><HkiRow lecturerId={lecturerId} item={null} labels={{...copy.hki, types}} /></div></div>
        <div className="space-y-4"><div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><BookOpenIcon aria-hidden className="size-5" /></div><div><h3 className="font-display text-lg font-semibold text-slate-950">{copy.teaching.title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{copy.teaching.description}</p></div></div>{records.teaching.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">{copy.teaching.empty}</p> : records.teaching.map((item) => <TeachingRow key={item.id} lecturerId={lecturerId} item={item} labels={{...copy.teaching, programs, terms}} />)}<div><p className="mb-3 text-sm font-semibold text-slate-800">{copy.teaching.addTitle}</p><TeachingRow lecturerId={lecturerId} item={null} labels={{...copy.teaching, programs, terms}} /></div></div>
      </div>
    </section>
  );
}
