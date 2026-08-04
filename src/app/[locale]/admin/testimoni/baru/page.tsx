import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { TestimonialEditorForm } from "@/components/admin/public-content/testimonial-editor-form";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminPublicContent" });
  return { title: t("TESTIMONIAL.metaTitle"), robots: { index: false, follow: false } };
}

export default async function NewTestimonialPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/testimoni/baru`);
  if (!decision.allow) redirect(decision.redirectTo);

  const t = await getTranslations("AdminPublicContent");

  return (
    <section aria-labelledby="admin-testimonial-new-title" className="flex flex-col gap-6">
      <div>
        <h1 id="admin-testimonial-new-title" className="section-rule font-display text-2xl text-slate-900">
          {t("TESTIMONIAL.title")}
        </h1>
        <p className="mt-2 max-w-prose text-sm text-slate-500">{t("TESTIMONIAL.createDescription")}</p>
      </div>

      <TestimonialEditorForm mode="create" listHref="/admin/testimoni" />
    </section>
  );
}
