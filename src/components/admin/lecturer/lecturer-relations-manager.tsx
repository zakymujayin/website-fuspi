"use client";

import {BookOpenIcon, CircleAlertIcon, CircleCheckIcon, GraduationCapIcon} from "lucide-react";
import {useActionState} from "react";

import {
  saveAdminEducationAction,
  saveAdminPublicationAction,
  type AdminLecturerRelationFormState,
} from "./lecturer-relations-actions";
import type {AdminLecturerRelations} from "@/features/academic/lecturer-relations";
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {PortalSubmitButton} from "@/components/portal/portal-form-status";
import type {AppLocale} from "@/i18n/routing";

type Labels = {
  education: {title: string; description: string; degree: string; field: string; institution: string; city: string; year: string; add: string; save: string; remove: string; addTitle: string; empty: string; saved: string; error: string};
  publication: {title: string; description: string; name: string; type: string; year: string; publisher: string; url: string; doi: string; add: string; save: string; remove: string; addTitle: string; empty: string; saved: string; error: string};
  types: ReadonlyArray<{value: string; label: string}>;
};

const COPY = {
  id: {
    education: {title: "Riwayat pendidikan", description: "Atur kredensial akademik yang tampil di profil publik dosen.", degree: "Gelar", field: "Bidang studi", institution: "Institusi", city: "Kota", year: "Tahun", add: "Tambah pendidikan", save: "Simpan perubahan", remove: "Hapus", addTitle: "Tambah riwayat pendidikan", empty: "Belum ada riwayat pendidikan.", saved: "Riwayat pendidikan tersimpan.", error: "Perubahan belum tersimpan. Periksa data dan coba lagi."},
    publication: {title: "Publikasi", description: "Kelola karya ilmiah yang ditampilkan pada profil dosen.", name: "Judul publikasi", type: "Jenis", year: "Tahun", publisher: "Penerbit / jurnal", url: "Tautan", doi: "DOI", add: "Tambah publikasi", save: "Simpan perubahan", remove: "Hapus", addTitle: "Tambah publikasi", empty: "Belum ada publikasi.", saved: "Publikasi tersimpan.", error: "Perubahan belum tersimpan. Periksa data dan coba lagi."},
  },
  en: {
    education: {title: "Education history", description: "Manage the academic credentials shown on the public lecturer profile.", degree: "Degree", field: "Field of study", institution: "Institution", city: "City", year: "Year", add: "Add education", save: "Save changes", remove: "Delete", addTitle: "Add education history", empty: "No education history yet.", saved: "Education history saved.", error: "The change was not saved. Check the fields and try again."},
    publication: {title: "Publications", description: "Manage scholarly work shown on the lecturer profile.", name: "Publication title", type: "Type", year: "Year", publisher: "Publisher / journal", url: "Link", doi: "DOI", add: "Add publication", save: "Save changes", remove: "Delete", addTitle: "Add publication", empty: "No publications yet.", saved: "Publication saved.", error: "The change was not saved. Check the fields and try again."},
  },
  ar: {
    education: {title: "المؤهلات العلمية", description: "إدارة المؤهلات الأكاديمية الظاهرة في الملف العام للمحاضر.", degree: "الدرجة", field: "مجال الدراسة", institution: "المؤسسة", city: "المدينة", year: "السنة", add: "إضافة مؤهل", save: "حفظ التغييرات", remove: "حذف", addTitle: "إضافة مؤهل علمي", empty: "لا توجد مؤهلات علمية بعد.", saved: "تم حفظ المؤهل.", error: "لم يُحفظ التغيير. راجع الحقول وحاول مرة أخرى."},
    publication: {title: "المنشورات", description: "إدارة الأعمال العلمية الظاهرة في ملف المحاضر.", name: "عنوان المنشور", type: "النوع", year: "السنة", publisher: "الناشر / المجلة", url: "الرابط", doi: "DOI", add: "إضافة منشور", save: "حفظ التغييرات", remove: "حذف", addTitle: "إضافة منشور", empty: "لا توجد منشورات بعد.", saved: "تم حفظ المنشور.", error: "لم يُحفظ التغيير. راجع الحقول وحاول مرة أخرى."},
  },
} as const;

function Status({state, labels}: {state: AdminLecturerRelationFormState; labels: {saved: string; error: string}}) {
  return (
    <p role="status" aria-live="polite" className={state.status === "saved" ? "flex items-center gap-2 text-xs font-medium text-emerald-700" : state.status === "error" ? "flex items-center gap-2 text-xs font-medium text-destructive" : "sr-only"}>
      {state.status === "saved" ? <CircleCheckIcon aria-hidden className="size-4" /> : state.status === "error" ? <CircleAlertIcon aria-hidden className="size-4" /> : null}
      {state.status === "saved" ? labels.saved : state.status === "error" ? labels.error : ""}
    </p>
  );
}

function EducationRow({lecturerId, item, labels}: {lecturerId: string; item: AdminLecturerRelations["educations"][number] | null; labels: Labels["education"]}) {
  const [state, action, pending] = useActionState(saveAdminEducationAction, {status: "idle"} satisfies AdminLecturerRelationFormState);
  const isNew = item === null;
  const key = item?.id ?? "new";
  return (
    <form action={action} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <input type="hidden" name="lecturerId" value={lecturerId} />
      {!isNew ? <input type="hidden" name="id" value={item.id} /> : null}
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field><FieldLabel htmlFor={`admin-education-degree-${key}`}>{labels.degree}</FieldLabel><Input id={`admin-education-degree-${key}`} name="degree" required maxLength={100} defaultValue={item?.degree ?? ""} dir="auto" /></Field>
        <Field><FieldLabel htmlFor={`admin-education-field-${key}`}>{labels.field}</FieldLabel><Input id={`admin-education-field-${key}`} name="field" maxLength={200} defaultValue={item?.field ?? ""} dir="auto" /></Field>
        <Field><FieldLabel htmlFor={`admin-education-institution-${key}`}>{labels.institution}</FieldLabel><Input id={`admin-education-institution-${key}`} name="institution" required maxLength={300} defaultValue={item?.institution ?? ""} dir="auto" /></Field>
        <Field><FieldLabel htmlFor={`admin-education-city-${key}`}>{labels.city}</FieldLabel><Input id={`admin-education-city-${key}`} name="city" maxLength={120} defaultValue={item?.city ?? ""} dir="auto" /></Field>
        <Field><FieldLabel htmlFor={`admin-education-year-${key}`}>{labels.year}</FieldLabel><Input id={`admin-education-year-${key}`} name="year" type="number" min={1900} max={2100} defaultValue={item?.year ?? ""} dir="ltr" /></Field>
      </FieldGroup>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <PortalSubmitButton pending={pending} label={isNew ? labels.add : labels.save} pendingLabel={labels.save} />
        {!isNew ? <PortalSubmitButton pending={pending} variant="quiet" name="intent" value="delete" label={labels.remove} pendingLabel={labels.remove} /> : null}
        <Status state={state} labels={labels} />
      </div>
    </form>
  );
}

function PublicationRow({lecturerId, item, labels, types}: {lecturerId: string; item: AdminLecturerRelations["publications"][number] | null; labels: Labels["publication"]; types: Labels["types"]}) {
  const [state, action, pending] = useActionState(saveAdminPublicationAction, {status: "idle"} satisfies AdminLecturerRelationFormState);
  const isNew = item === null;
  const key = item?.id ?? "new";
  return (
    <form action={action} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <input type="hidden" name="lecturerId" value={lecturerId} />
      {!isNew ? <input type="hidden" name="id" value={item.id} /> : null}
      <FieldGroup>
        <Field><FieldLabel htmlFor={`admin-publication-title-${key}`}>{labels.name}</FieldLabel><Input id={`admin-publication-title-${key}`} name="title" required maxLength={500} defaultValue={item?.title ?? ""} dir="auto" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field><FieldLabel htmlFor={`admin-publication-type-${key}`}>{labels.type}</FieldLabel><select id={`admin-publication-type-${key}`} name="type" defaultValue={item?.type ?? "JURNAL"} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15">{types.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></Field>
          <Field><FieldLabel htmlFor={`admin-publication-year-${key}`}>{labels.year}</FieldLabel><Input id={`admin-publication-year-${key}`} name="year" type="number" min={1900} max={2100} defaultValue={item?.year ?? ""} dir="ltr" /></Field>
          <Field><FieldLabel htmlFor={`admin-publication-publisher-${key}`}>{labels.publisher}</FieldLabel><Input id={`admin-publication-publisher-${key}`} name="publisher" maxLength={300} defaultValue={item?.publisher ?? ""} dir="auto" /></Field>
          <Field><FieldLabel htmlFor={`admin-publication-doi-${key}`}>{labels.doi}</FieldLabel><Input id={`admin-publication-doi-${key}`} name="doi" maxLength={200} defaultValue={item?.doi ?? ""} dir="ltr" /></Field>
        </div>
        <Field><FieldLabel htmlFor={`admin-publication-url-${key}`}>{labels.url}</FieldLabel><Input id={`admin-publication-url-${key}`} name="url" type="url" maxLength={2048} defaultValue={item?.url ?? ""} dir="ltr" /></Field>
      </FieldGroup>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <PortalSubmitButton pending={pending} label={isNew ? labels.add : labels.save} pendingLabel={labels.save} />
        {!isNew ? <PortalSubmitButton pending={pending} variant="quiet" name="intent" value="delete" label={labels.remove} pendingLabel={labels.remove} /> : null}
        <Status state={state} labels={labels} />
      </div>
    </form>
  );
}

export function LecturerRelationsManager({locale, lecturerId, relations}: {locale: AppLocale; lecturerId: string; relations: AdminLecturerRelations}) {
  const t = COPY[locale];
  const types = ["JURNAL", "BUKU", "BAB_BUKU", "PROSIDING", "ARTIKEL", "LAINNYA"].map((value) => ({value, label: value.replace("_", " ")}));
  return (
    <section id="academic-records" aria-labelledby="admin-lecturer-records-title" className="pt-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-primary">{locale === "id" ? "KELENGKAPAN PROFIL" : locale === "en" ? "PROFILE COMPLETENESS" : "اكتمال الملف"}</p><h2 id="admin-lecturer-records-title" className="mt-2 font-display text-2xl tracking-tight text-slate-950">{locale === "id" ? "Rekam akademik" : locale === "en" ? "Academic record" : "السجل الأكاديمي"}</h2></div>
        <p className="text-sm text-slate-500">{relations.educations.length} {locale === "id" ? "pendidikan" : locale === "en" ? "education entries" : "مؤهلات"} · {relations.publications.length} {locale === "id" ? "publikasi" : locale === "en" ? "publications" : "منشورات"}</p>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><GraduationCapIcon aria-hidden className="size-5" /></div><div><h3 className="font-display text-lg font-semibold text-slate-950">{t.education.title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{t.education.description}</p></div></div>
          {relations.educations.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">{t.education.empty}</p> : relations.educations.map((item) => <EducationRow key={item.id} lecturerId={lecturerId} item={item} labels={t.education} />)}
          <div><p className="mb-3 text-sm font-semibold text-slate-800">{t.education.addTitle}</p><EducationRow lecturerId={lecturerId} item={null} labels={t.education} /></div>
        </div>
        <div className="space-y-4">
          <div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><BookOpenIcon aria-hidden className="size-5" /></div><div><h3 className="font-display text-lg font-semibold text-slate-950">{t.publication.title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{t.publication.description}</p></div></div>
          {relations.publications.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">{t.publication.empty}</p> : relations.publications.map((item) => <PublicationRow key={item.id} lecturerId={lecturerId} item={item} labels={t.publication} types={types} />)}
          <div><p className="mb-3 text-sm font-semibold text-slate-800">{t.publication.addTitle}</p><PublicationRow lecturerId={lecturerId} item={null} labels={t.publication} types={types} /></div>
        </div>
      </div>
    </section>
  );
}
