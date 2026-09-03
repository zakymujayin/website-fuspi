"use client";

import { useRouter } from "@/i18n/navigation";
import { useId, useState, type FormEvent } from "react";
import { CheckCircle2Icon, ExternalLinkIcon, SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { AppLocale } from "@/i18n/routing";
import { EMPTY_LECTURER_TRANSLATION, LECTURER_LOCALES, emptyLecturerDraft, type LecturerDraft, type LecturerLocale, type LecturerProgramOption } from "./lecturer-types";

type LecturerEditorFormProps = {
  locale: AppLocale;
  mode: "create" | "edit";
  initialDraft?: LecturerDraft;
  programs: readonly LecturerProgramOption[];
};

const ui = {
  id: { back: "Kembali ke daftar", create: "Tambah dosen", edit: "Sunting dosen", introCreate: "Tambahkan profil pengajar dan tempatkan ke program studi yang tepat.", introEdit: "Perbarui identitas, penugasan prodi, dan informasi publik dosen.", identity: "Identitas utama", identityHint: "Nama dan slug dipakai untuk menemukan profil dosen di CMS.", name: "Nama lengkap", slug: "Slug", nidn: "NIDN", nip: "NIP", orcid: "ORCID", contact: "Kontak & tautan", email: "Surel", phone: "Telepon", scholar: "Google Scholar", sinta: "SINTA", program: "Program studi", noProgram: "Belum ditentukan", order: "Urutan", profile: "Profil publik", profileHint: "ID wajib diisi. EN dan AR boleh dilengkapi kapan saja.", position: "Jabatan", expertise: "Bidang keahlian", bio: "Biografi", officeHours: "Jam layanan", active: "Tampilkan di direktori publik", mediaNote: "Foto saat ini dipertahankan. Ganti foto melalui Pustaka Media atau proses impor.", save: "Simpan dosen", saving: "Menyimpan…", required: "Wajib diisi", invalid: "Periksa kembali data yang ditandai.", unavailable: "Perubahan belum tersimpan. Coba lagi sebentar.", relation: "Program studi tidak valid.", conflict: "Slug atau identitas sudah digunakan dosen lain.", locales: { id: "Bahasa Indonesia", en: "English", ar: "العربية" }, saved: "Profil dosen tersimpan." },
  en: { back: "Back to list", create: "Add lecturer", edit: "Edit lecturer", introCreate: "Add a teaching profile and assign it to the right study program.", introEdit: "Update identity, program assignment, and public lecturer information.", identity: "Primary identity", identityHint: "The name and slug help editors find this lecturer in the CMS.", name: "Full name", slug: "Slug", nidn: "NIDN", nip: "NIP", orcid: "ORCID", contact: "Contact & links", email: "Email", phone: "Phone", scholar: "Google Scholar", sinta: "SINTA", program: "Study program", noProgram: "Not assigned", order: "Order", profile: "Public profile", profileHint: "ID is required. EN and AR can be added at any time.", position: "Position", expertise: "Area of expertise", bio: "Biography", officeHours: "Office hours", active: "Show in public directory", mediaNote: "The current photo is preserved. Replace it through Media Library or import.", save: "Save lecturer", saving: "Saving…", required: "Required", invalid: "Review the fields marked below.", unavailable: "The change was not saved. Try again shortly.", relation: "The selected study program is invalid.", conflict: "The slug or identity is already used by another lecturer.", locales: { id: "Bahasa Indonesia", en: "English", ar: "العربية" }, saved: "Lecturer profile saved." },
  ar: { back: "العودة إلى القائمة", create: "إضافة محاضر", edit: "تحرير المحاضر", introCreate: "أضف ملفاً تعليمياً وعيّنه إلى البرنامج الدراسي المناسب.", introEdit: "حدّث الهوية وتعيين البرنامج والمعلومات العامة للمحاضر.", identity: "الهوية الأساسية", identityHint: "يساعد الاسم والاسم المختصر المحررين في العثور على المحاضر داخل النظام.", name: "الاسم الكامل", slug: "الاسم المختصر", nidn: "NIDN", nip: "NIP", orcid: "ORCID", contact: "الاتصال والروابط", email: "البريد الإلكتروني", phone: "الهاتف", scholar: "Google Scholar", sinta: "SINTA", program: "البرنامج الدراسي", noProgram: "غير معيّن", order: "الترتيب", profile: "الملف العام", profileHint: "الإندونيسية مطلوبة. يمكن إضافة الإنجليزية والعربية في أي وقت.", position: "المنصب", expertise: "مجال الخبرة", bio: "السيرة الذاتية", officeHours: "ساعات المكتب", active: "إظهار في الدليل العام", mediaNote: "يتم الاحتفاظ بالصورة الحالية. استبدلها من مكتبة الوسائط أو عبر الاستيراد.", save: "حفظ المحاضر", saving: "جارٍ الحفظ…", required: "مطلوب", invalid: "راجع الحقول المحددة أدناه.", unavailable: "لم يُحفظ التغيير. حاول مرة أخرى.", relation: "البرنامج الدراسي المحدد غير صالح.", conflict: "الاسم المختصر أو الهوية مستخدمة لمحاضر آخر.", locales: { id: "Bahasa Indonesia", en: "English", ar: "العربية" }, saved: "تم حفظ ملف المحاضر." },
} as const;

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "").slice(0, 191);
}

function hasTranslation(value: LecturerDraft["translations"][LecturerLocale]) {
  return Object.values(value).some((item) => item.trim().length > 0);
}

function externalUrl(value: string) {
  const trimmed = value.trim();
  return trimmed ? { kind: "EXTERNAL", href: trimmed } : null;
}

export function LecturerEditorForm({ locale, mode, initialDraft, programs }: LecturerEditorFormProps) {
  const t = ui[locale];
  const router = useRouter();
  const formId = useId();
  const [draft, setDraft] = useState<LecturerDraft>(() => initialDraft ?? emptyLecturerDraft());
  const [activeLocale, setActiveLocale] = useState<LecturerLocale>("id");
  const [slugEdited, setSlugEdited] = useState(mode === "edit");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const translation = draft.translations[activeLocale] ?? EMPTY_LECTURER_TRANSLATION;

  function updateTranslation(field: keyof typeof EMPTY_LECTURER_TRANSLATION, value: string) {
    setDraft((current) => ({ ...current, translations: { ...current.translations, [activeLocale]: { ...current.translations[activeLocale], [field]: value } } }));
  }

  function updateName(value: string) {
    setDraft((current) => ({ ...current, name: value, slug: slugEdited ? current.slug : slugify(value) }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const nextErrors: Record<string, boolean> = {};
    if (!draft.name.trim()) nextErrors.name = true;
    if (!draft.slug.trim()) nextErrors.slug = true;
    if (!draft.translations.id.position.trim() && !draft.translations.id.expertise.trim() && !draft.translations.id.bio.trim() && !draft.translations.id.officeHours.trim()) {
      // The ID translation object is required by the contract even when all fields are optional.
    }
    setFieldErrors(nextErrors);
    setSaved(false);
    setError(nextErrors.name || nextErrors.slug ? t.invalid : null);
    if (Object.keys(nextErrors).length) return;
    setPending(true);
    const translations = Object.fromEntries(LECTURER_LOCALES.filter((item) => item === "id" || hasTranslation(draft.translations[item])).map((item) => [item, Object.fromEntries(Object.entries(draft.translations[item]).map(([key, value]) => [key, value.trim() || null]))]));
    const payload = {
      name: draft.name.trim(), slug: draft.slug.trim(), nidn: draft.nidn.trim() || null, nip: draft.nip.trim() || null, orcid: draft.orcid.trim() || null,
      googleScholarUrl: externalUrl(draft.googleScholarUrl), sintaUrl: externalUrl(draft.sintaUrl), email: draft.email.trim() || null, phone: draft.phone.trim() || null,
      photoMediaId: draft.photoMediaId, studyProgramId: draft.studyProgramId, order: draft.order, isActive: draft.isActive, translations,
    };
    try {
      const response = await fetch("/api/admin/academic/people", { method: "POST", headers: { "content-type": "application/json" }, credentials: "same-origin", body: JSON.stringify(mode === "create" ? { action: "CREATE", resource: "LECTURER", payload } : { action: "UPDATE", resource: "LECTURER", mutation: { id: initialDraft?.id, expectedVersion: null }, payload }) });
      const result: unknown = await response.json().catch(() => null);
      if (response.ok && typeof result === "object" && result !== null && (result as { ok?: unknown }).ok === true) {
        setSaved(true);
        router.push("/admin/dosen");
        router.refresh();
        return;
      }
      const code = typeof result === "object" && result !== null ? (result as { code?: unknown }).code : null;
      setError(code === "RELATION_INVALID" ? t.relation : code === "SLUG_CONFLICT" || code === "IDENTITY_CONFLICT" ? t.conflict : t.unavailable);
    } catch {
      setError(t.unavailable);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><Button type="button" variant="ghost" onClick={() => router.push("/admin/dosen")}>{t.back}</Button><div className="flex items-center gap-2 text-xs text-slate-500">{saved ? <><CheckCircle2Icon className="size-4 text-emerald-600" />{t.saved}</> : null}</div></div>
      {error ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p> : null}
      <FieldSet className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)] sm:p-7">
        <FieldLegend className="font-display text-xl text-slate-950">{t.identity}</FieldLegend><FieldDescription>{t.identityHint}</FieldDescription>
        <FieldGroup className="grid gap-5 md:grid-cols-2">
          <Field><FieldLabel htmlFor={`${formId}-name`}>{t.name} <span className="text-destructive">*</span></FieldLabel><Input id={`${formId}-name`} value={draft.name} onChange={(event) => updateName(event.target.value)} aria-invalid={fieldErrors.name || undefined} autoComplete="name" />{fieldErrors.name ? <FieldError>{t.required}</FieldError> : null}</Field>
          <Field><FieldLabel htmlFor={`${formId}-slug`}>{t.slug} <span className="text-destructive">*</span></FieldLabel><Input id={`${formId}-slug`} value={draft.slug} onChange={(event) => { setSlugEdited(true); setDraft((current) => ({ ...current, slug: event.target.value })); }} aria-invalid={fieldErrors.slug || undefined} autoComplete="off" /><FieldDescription>URL-safe: a-z, 0-9, dan tanda hubung.</FieldDescription>{fieldErrors.slug ? <FieldError>{t.required}</FieldError> : null}</Field>
          <Field><FieldLabel htmlFor={`${formId}-nidn`}>{t.nidn}</FieldLabel><Input id={`${formId}-nidn`} value={draft.nidn} onChange={(event) => setDraft((current) => ({ ...current, nidn: event.target.value }))} inputMode="numeric" /></Field>
          <Field><FieldLabel htmlFor={`${formId}-nip`}>{t.nip}</FieldLabel><Input id={`${formId}-nip`} value={draft.nip} onChange={(event) => setDraft((current) => ({ ...current, nip: event.target.value }))} inputMode="numeric" /></Field>
          <Field><FieldLabel htmlFor={`${formId}-orcid`}>{t.orcid}</FieldLabel><Input id={`${formId}-orcid`} value={draft.orcid} onChange={(event) => setDraft((current) => ({ ...current, orcid: event.target.value }))} placeholder="0000-0000-0000-0000" /></Field>
          <Field><FieldLabel htmlFor={`${formId}-order`}>{t.order}</FieldLabel><Input id={`${formId}-order`} type="number" min={0} step={1} value={draft.order} onChange={(event) => setDraft((current) => ({ ...current, order: Math.max(0, Number(event.target.value) || 0) }))} /></Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)] sm:p-7"><FieldLegend className="font-display text-xl text-slate-950">{t.contact}</FieldLegend><FieldGroup className="grid gap-5 md:grid-cols-2"><Field><FieldLabel htmlFor={`${formId}-email`}>{t.email}</FieldLabel><Input id={`${formId}-email`} type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} autoComplete="email" /></Field><Field><FieldLabel htmlFor={`${formId}-phone`}>{t.phone}</FieldLabel><Input id={`${formId}-phone`} value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} autoComplete="tel" /></Field><Field><FieldLabel htmlFor={`${formId}-scholar`}>{t.scholar}</FieldLabel><div className="relative"><Input id={`${formId}-scholar`} type="url" value={draft.googleScholarUrl} onChange={(event) => setDraft((current) => ({ ...current, googleScholarUrl: event.target.value }))} className="pe-10" placeholder="https://scholar.google.com/…" /><ExternalLinkIcon aria-hidden className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /></div></Field><Field><FieldLabel htmlFor={`${formId}-sinta`}>{t.sinta}</FieldLabel><div className="relative"><Input id={`${formId}-sinta`} type="url" value={draft.sintaUrl} onChange={(event) => setDraft((current) => ({ ...current, sintaUrl: event.target.value }))} className="pe-10" placeholder="https://sinta.kemdikbud.go.id/…" /><ExternalLinkIcon aria-hidden className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /></div></Field></FieldGroup></FieldSet>

      <FieldSet className="rounded-2xl border border-primary/20 bg-primary/[0.035] p-5 sm:p-7"><FieldLegend className="font-display text-xl text-slate-950">{t.program}</FieldLegend><FieldDescription>Pilih salah satu dari tiga program studi aktif FUSPI. Pilihan ini menentukan pengelompokan pada direktori publik.</FieldDescription><FieldGroup className="grid gap-5 md:grid-cols-[minmax(0,1fr)_10rem]"><Field><FieldLabel htmlFor={`${formId}-program`}>{t.program}</FieldLabel><select id={`${formId}-program`} value={draft.studyProgramId ?? ""} onChange={(event) => setDraft((current) => ({ ...current, studyProgramId: event.target.value || null }))} className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15"><option value="">{t.noProgram}</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.code} · {program.name}</option>)}</select></Field><Field><FieldLabel htmlFor={`${formId}-active`}>{t.active}</FieldLabel><div className="flex h-10 items-center gap-3"><Checkbox id={`${formId}-active`} checked={draft.isActive} onCheckedChange={(checked) => setDraft((current) => ({ ...current, isActive: checked === true }))} /><span className="text-sm text-slate-600">{draft.isActive ? t.active : locale === "id" ? "Tersembunyi" : locale === "en" ? "Hidden" : "مخفي"}</span></div></Field></FieldGroup></FieldSet>

      <FieldSet className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)] sm:p-7"><FieldLegend className="font-display text-xl text-slate-950">{t.profile}</FieldLegend><FieldDescription>{t.profileHint}</FieldDescription><div role="tablist" aria-label={t.profile} className="flex flex-wrap gap-1 border-b border-slate-200">{LECTURER_LOCALES.map((item) => <button key={item} type="button" role="tab" aria-selected={activeLocale === item} onClick={() => setActiveLocale(item)} className={`relative px-3 py-2 text-sm font-medium transition ${activeLocale === item ? "text-primary" : "text-slate-500 hover:text-slate-900"}`}>{t.locales[item]}{item === "id" || hasTranslation(draft.translations[item]) ? <span className="ms-2 inline-block size-1.5 rounded-full bg-emerald-500 align-middle" /> : null}{activeLocale === item ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" /> : null}</button>)}</div><div dir={activeLocale === "ar" ? "rtl" : "ltr"} className="grid gap-5 pt-2 md:grid-cols-2"><Field><FieldLabel htmlFor={`${formId}-${activeLocale}-position`}>{t.position}</FieldLabel><Input id={`${formId}-${activeLocale}-position`} value={translation.position} onChange={(event) => updateTranslation("position", event.target.value)} /></Field><Field><FieldLabel htmlFor={`${formId}-${activeLocale}-expertise`}>{t.expertise}</FieldLabel><Input id={`${formId}-${activeLocale}-expertise`} value={translation.expertise} onChange={(event) => updateTranslation("expertise", event.target.value)} /></Field><Field><FieldLabel htmlFor={`${formId}-${activeLocale}-office`}>{t.officeHours}</FieldLabel><Input id={`${formId}-${activeLocale}-office`} value={translation.officeHours} onChange={(event) => updateTranslation("officeHours", event.target.value)} /></Field><Field className="md:col-span-2"><FieldLabel htmlFor={`${formId}-${activeLocale}-bio`}>{t.bio}</FieldLabel><Textarea id={`${formId}-${activeLocale}-bio`} value={translation.bio} onChange={(event) => updateTranslation("bio", event.target.value)} rows={7} /></Field></div></FieldSet>
      <p className="text-xs leading-5 text-slate-500">{t.mediaNote}</p>
      <div className="flex justify-end"><Button type="submit" disabled={pending}>{pending ? <Spinner data-icon /> : <SaveIcon data-icon="inline-start" />}{pending ? t.saving : t.save}</Button></div>
    </form>
  );
}
