import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {redirect} from "next/navigation";

import {Link} from "@/i18n/navigation";
import {institution} from "@/config/institution";
import {getPrismaClient} from "@/lib/db/client";
import {decideProtectedRoute, getRequestSession} from "@/lib/auth/runtime/request-session";
import {parseAppLocale} from "@/lib/auth/runtime/redirect";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Nav"});
  return {title: t("studyPrograms"), robots: {index: false, follow: false}};
}

export default async function ProgramStudioAdminPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);
  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/program-studi`, {roles: ["ADMIN"]});
  if (!decision.allow) redirect(decision.redirectTo);

  const t = await getTranslations("Nav");
  const rows = await getPrismaClient().studyProgram.findMany({
    where: {code: {in: institution.studyPrograms.map((program) => program.code)}},
    orderBy: [{order: "asc"}, {id: "asc"}],
    select: {id: true, code: true, slug: true, degree: true, accreditation: true, accreditationExpiry: true, isActive: true, version: true, translations: {select: {locale: true, name: true}}},
  });

  return (
    <section aria-labelledby="admin-study-programs-title" className="flex flex-col gap-6">
      <div>
        <h1 id="admin-study-programs-title" className="section-rule font-display text-2xl text-slate-900">{t("studyPrograms")}</h1>
        <p className="mt-2 max-w-prose text-sm text-slate-500">Kelola data resmi, narasi, akreditasi, dan masa berlaku setiap program studi.</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[44rem] text-start text-sm">
          <thead className="bg-muted text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-start font-semibold">Kode</th>
              <th className="px-4 py-3 text-start font-semibold">Nama</th>
              <th className="px-4 py-3 text-start font-semibold">Akreditasi</th>
              <th className="px-4 py-3 text-start font-semibold">Status</th>
              <th className="px-4 py-3 text-end font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const name = row.translations.find((translation) => translation.locale === "id")?.name ?? row.code;
              return (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-4 py-4 font-display font-semibold text-primary">{row.code}</td>
                  <td className="px-4 py-4 text-foreground">{name}<span className="mt-1 block text-xs text-muted-foreground">{row.degree} · {row.slug}</span></td>
                  <td className="px-4 py-4 text-muted-foreground">{row.accreditation ?? "—"}{row.accreditationExpiry ? <span className="mt-1 block text-xs">s.d. {row.accreditationExpiry.getUTCFullYear()}</span> : null}</td>
                  <td className="px-4 py-4">{row.isActive ? <span className="text-emerald-700">Aktif</span> : <span className="text-muted-foreground">Nonaktif</span>}</td>
                  <td className="px-4 py-4 text-end"><Link href={`/admin/program-studi/${row.id}/edit`} className="font-medium text-primary hover:underline">Sunting</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
