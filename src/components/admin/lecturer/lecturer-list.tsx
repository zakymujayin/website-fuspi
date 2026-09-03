import { ArrowUpRightIcon, PencilLineIcon, PlusIcon, SearchIcon, UploadIcon } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/i18n/routing";
import { LecturerDeleteAction } from "./lecturer-delete-action";
import type { LecturerListItem, LecturerProgramOption } from "./lecturer-types";

type LecturerListProps = {
  locale: AppLocale;
  items: readonly LecturerListItem[];
  programs: readonly LecturerProgramOption[];
  search: string;
  programId: string;
  counts: { total: number; active: number; assigned: number };
};

const copy = {
  id: {
    eyebrow: "AKADEMIK / DIREKTORI DOSEN", title: "Kelola dosen", description: "Perbarui profil pengajar, tempatkan ke program studi, dan jaga direktori publik tetap akurat.", add: "Tambah dosen", import: "Impor CSV", search: "Cari nama, NIP, atau bidang keahlian", filter: "Semua prodi", table: "Daftar dosen", name: "Nama & identitas", program: "Program studi", position: "Jabatan", status: "Status", actions: "Aksi", active: "Aktif", inactive: "Nonaktif", assigned: "Terpetakan", edit: "Sunting", delete: "Hapus", empty: "Belum ada dosen yang cocok.", clear: "Hapus filter", inUse: "Dosen tidak dapat dihapus karena masih terhubung ke riset, pengabdian, atau berita.", unavailable: "Perubahan belum tersimpan. Coba lagi.", confirmTitle: "Hapus data dosen?", confirmDescription: "Data {name} akan dihapus permanen dari direktori.", cancel: "Batal", confirm: "Ya, hapus", showing: "Menampilkan {count} dosen", public: "Lihat direktori publik", note: "Foto dikelola melalui Pustaka Media atau proses impor.",
    records: "Rekam akademik", view: "Lihat publik", education: "pendidikan", publication: "publikasi", programNames: { IAT: "Ilmu Al-Qur’an dan Tafsir", IH: "Ilmu Hadis", AFI: "Aqidah dan Filsafat Islam" },
  },
  en: {
    eyebrow: "ACADEMICS / LECTURER DIRECTORY", title: "Manage lecturers", description: "Update teaching profiles, assign study programs, and keep the public directory accurate.", add: "Add lecturer", import: "Import CSV", search: "Search name, NIDN, or expertise", filter: "All programs", table: "Lecturer list", name: "Name & identity", program: "Study program", position: "Position", status: "Status", actions: "Actions", active: "Active", inactive: "Inactive", assigned: "Assigned", edit: "Edit", delete: "Delete", empty: "No lecturers match these filters.", clear: "Clear filters", inUse: "This lecturer cannot be deleted while linked to research, community service, or posts.", unavailable: "The change was not saved. Try again.", confirmTitle: "Delete lecturer data?", confirmDescription: "{name} will be permanently removed from the directory.", cancel: "Cancel", confirm: "Yes, delete", showing: "Showing {count} lecturers", public: "View public directory", note: "Photos are managed through Media Library or import.",
    records: "Academic record", view: "View public", education: "education", publication: "publications", programNames: { IAT: "Qur’anic Sciences and Tafsir", IH: "Hadith Studies", AFI: "Aqidah and Islamic Philosophy" },
  },
  ar: {
    eyebrow: "الأكاديميون / دليل المحاضرين", title: "إدارة المحاضرين", description: "حدّث ملفات التدريس، وعيّن البرامج الدراسية، وحافظ على دقة الدليل العام.", add: "إضافة محاضر", import: "استيراد CSV", search: "ابحث بالاسم أو NIDN أو مجال الخبرة", filter: "كل البرامج", table: "قائمة المحاضرين", name: "الاسم والهوية", program: "البرنامج الدراسي", position: "المنصب", status: "الحالة", actions: "الإجراءات", active: "نشط", inactive: "غير نشط", assigned: "مُعيّن", edit: "تحرير", delete: "حذف", empty: "لا يوجد محاضرون يطابقون هذه المرشحات.", clear: "مسح المرشحات", inUse: "لا يمكن حذف المحاضر ما دام مرتبطاً ببحث أو خدمة مجتمعية أو خبر.", unavailable: "لم يُحفظ التغيير. حاول مرة أخرى.", confirmTitle: "حذف بيانات المحاضر؟", confirmDescription: "سيتم حذف {name} نهائياً من الدليل.", cancel: "إلغاء", confirm: "نعم، احذف", showing: "عرض {count} محاضرين", public: "عرض الدليل العام", note: "تُدار الصور عبر مكتبة الوسائط أو الاستيراد.",
    records: "السجل الأكاديمي", view: "عرض الملف العام", education: "مؤهلات", publication: "منشورات", programNames: { IAT: "علوم القرآن والتفسير", IH: "دراسات الحديث", AFI: "العقيدة والفلسفة الإسلامية" },
  },
} as const;

function initials(name: string) {
  return name.split(/\s+/u).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function programLabel(item: LecturerListItem, locale: AppLocale) {
  return item.studyProgramCode ? copy[locale].programNames[item.studyProgramCode] : "—";
}

export function LecturerList({ locale, items, programs, search, programId, counts }: LecturerListProps) {
  const t = copy[locale];
  return (
    <section aria-labelledby="admin-lecturers-title" className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)] sm:p-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-primary">{t.eyebrow}</p>
          <h1 id="admin-lecturers-title" className="mt-3 font-display text-3xl tracking-tight text-slate-950 sm:text-4xl">{t.title}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">{t.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/admin/impor-dosen" />} nativeButton={false}>
            <UploadIcon data-icon="inline-start" />{t.import}
          </Button>
          <Button render={<Link href="/admin/dosen/baru" />} nativeButton={false}>
            <PlusIcon data-icon="inline-start" />{t.add}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[{label: t.showing.replace("{count}", String(counts.total)), value: counts.total, tone: "text-slate-950"}, {label: t.active, value: counts.active, tone: "text-emerald-700"}, {label: t.assigned, value: counts.assigned, tone: "text-primary"}].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-4">
            <p className="text-xs font-medium text-slate-500">{stat.label}</p>
            <p className={`mt-1 font-display text-2xl ${stat.tone}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <form method="get" className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:p-4">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{t.search}</span>
          <SearchIcon aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input name="q" defaultValue={search} placeholder={t.search} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 ps-9 pe-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15" />
        </label>
        <label className="sm:w-60">
          <span className="sr-only">{t.filter}</span>
          <select name="prodi" defaultValue={programId} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15">
            <option value="">{t.filter}</option>
            {programs.map((program) => <option key={program.id} value={program.id}>{program.code} · {program.name}</option>)}
          </select>
        </label>
        <Button type="submit" variant="secondary">{locale === "id" ? "Terapkan" : locale === "en" ? "Apply" : "تطبيق"}</Button>
      </form>

      <div className="flex items-center justify-between gap-3">
        <div><h2 className="font-display text-xl text-slate-950">{t.table}</h2><p className="mt-1 text-sm text-slate-500">{t.note}</p></div>
        {(search || programId) ? <Link href="/admin/dosen" className="text-sm font-medium text-primary hover:underline">{t.clear}</Link> : null}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500">{t.empty}</div>
      ) : (
        <>
          <ul className="grid gap-3 md:hidden">
            {items.map((item) => (
              <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 font-display text-sm font-semibold text-primary">
                    {item.photoUrl ? <Image src={item.photoUrl} alt={item.photoAlt ?? item.name} width={44} height={44} unoptimized className="size-full object-cover" /> : initials(item.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="truncate font-semibold text-slate-900">{item.name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{item.email ?? item.slug}</p></div>
                      <span className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-medium ${item.isActive ? "text-emerald-700" : "text-slate-500"}`}><span className={`size-1.5 rounded-full ${item.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />{item.isActive ? t.active : t.inactive}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-primary/8 px-2.5 py-1 font-semibold text-primary">{programLabel(item, locale)}</span>
                      <span className="text-slate-500">{item.educationCount} {t.education}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500">{item.publicationCount} {t.publication}</span>
                    </div>
                    {item.position ? <p className="mt-2 truncate text-sm text-slate-600">{item.position}</p> : null}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  <Button variant="ghost" size="sm" render={<Link href={`/dosen/${item.slug}`} />} nativeButton={false}>{t.view}<ArrowUpRightIcon data-icon="inline-end" /></Button>
                  <Button size="sm" render={<Link href={`/admin/dosen/${item.id}/edit`} />} nativeButton={false}><PencilLineIcon data-icon="inline-start" />{t.edit}</Button>
                  <LecturerDeleteAction lecturerId={item.id} lecturerName={item.name} labels={{delete: t.delete, confirmTitle: t.confirmTitle, confirmDescription: t.confirmDescription, cancel: t.cancel, confirm: t.confirm, inUse: t.inUse, unavailable: t.unavailable}} />
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[50rem] text-start text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500"><tr><th className="px-5 py-3 text-start">{t.name}</th><th className="px-5 py-3 text-start">{t.program}</th><th className="px-5 py-3 text-start">{t.position}</th><th className="px-5 py-3 text-start">{t.records}</th><th className="px-5 py-3 text-start">{t.status}</th><th className="px-5 py-3 text-end">{t.actions}</th></tr></thead>
              <tbody>{items.map((item) => <tr key={item.id} className="border-t border-slate-200 align-middle transition hover:bg-slate-50/70">
                <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 font-display text-sm font-semibold text-primary">{item.photoUrl ? <Image src={item.photoUrl} alt={item.photoAlt ?? item.name} width={40} height={40} unoptimized className="size-full object-cover" /> : initials(item.name)}</div><div className="min-w-0"><p className="font-semibold text-slate-900">{item.name}</p><p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">{item.email ?? item.slug}</p></div></div></td>
                <td className="px-5 py-4"><span className="inline-flex rounded-full bg-primary/8 px-2.5 py-1 text-xs font-semibold text-primary">{programLabel(item, locale)}</span></td>
                <td className="max-w-xs px-5 py-4 text-slate-600">{item.position ?? "—"}</td>
                <td className="px-5 py-4 text-xs text-slate-500"><span className="font-medium text-slate-700">{item.educationCount}</span> {t.education} · <span className="font-medium text-slate-700">{item.publicationCount}</span> {t.publication}</td>
                <td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 text-xs font-medium ${item.isActive ? "text-emerald-700" : "text-slate-500"}`}><span className={`size-1.5 rounded-full ${item.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />{item.isActive ? t.active : t.inactive}</span></td>
                <td className="px-5 py-4"><div className="flex items-center justify-end gap-1"><Button variant="ghost" size="sm" render={<Link href={`/admin/dosen/${item.id}/edit`} />} nativeButton={false}><PencilLineIcon data-icon="inline-start" />{t.edit}</Button><LecturerDeleteAction lecturerId={item.id} lecturerName={item.name} labels={{delete: t.delete, confirmTitle: t.confirmTitle, confirmDescription: t.confirmDescription, cancel: t.cancel, confirm: t.confirm, inUse: t.inUse, unavailable: t.unavailable}} /></div></td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/60 px-5 py-3 text-xs text-slate-500"><span>{t.showing.replace("{count}", String(items.length))}</span><Link href="/dosen" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">{t.public}<ArrowUpRightIcon className="size-3.5" /></Link></div>
          </div>
        </>
      )}
    </section>
  );
}
