import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {redirect} from "next/navigation";

import {TaxonomyEditorForm} from "@/components/admin/taxonomy/taxonomy-editor-form";
import {getEditableTaxonomy} from "@/components/admin/taxonomy/taxonomy-options";
import {TaxonomyKindSchema} from "@/contracts/admin-foundation";
import {decideProtectedRoute, getRequestSession} from "@/lib/auth/runtime/request-session";
import {parseAppLocale} from "@/lib/auth/runtime/redirect";
import {getPrismaClient} from "@/lib/db/client";

type Props = {
  params: Promise<{locale: string; id: string}>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "AdminTaxonomy"});
  return {title: t("editTitle"), robots: {index: false, follow: false}};
}

export default async function EditTaxonomyPage({params, searchParams}: Props) {
  const {locale, id} = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);
  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/taksonomi/${id}/edit`);
  if (!decision.allow) redirect(decision.redirectTo);
  const t = await getTranslations("AdminTaxonomy");
  const rawKind = (await searchParams).kind;
  const kind = TaxonomyKindSchema.safeParse(typeof rawKind === "string" ? rawKind : "");
  const initialData = kind.success
    ? await getEditableTaxonomy(getPrismaClient(), session.ok ? session.session : null, id, kind.data)
    : null;

  return (
    <section aria-labelledby="admin-taxonomy-edit-title" className="flex flex-col gap-6">
      <div>
        <h1 id="admin-taxonomy-edit-title" className="section-rule font-display text-2xl text-slate-900">
          {t("editTitle")}
        </h1>
        <p className="mt-2 max-w-prose text-sm text-slate-500">{t("editDescription")}</p>
      </div>
      {initialData ? (
        <TaxonomyEditorForm mode="edit" listHref="/admin/taksonomi" initialData={initialData} />
      ) : (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-6 text-sm text-destructive">
          {t("notFound")}
        </div>
      )}
    </section>
  );
}
