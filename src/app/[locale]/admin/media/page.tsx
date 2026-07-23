import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { AdminMediaFilterTabs } from "@/components/admin/media/media-filter-tabs";
import { AdminMediaGrid } from "@/components/admin/media/media-grid";
import { AdminMediaPagination } from "@/components/admin/media/media-pagination";
import { AdminMediaStateNotice } from "@/components/admin/media/media-state-notice";
import { normalizeAdminMediaQuery, totalPagesFor } from "@/components/admin/media/media-query";
import { loadAdminMediaSafely } from "@/components/admin/media/media-safe-load";
import { decideProtectedRoute, getRequestSession } from "@/lib/auth/runtime/request-session";
import { parseAppLocale } from "@/lib/auth/runtime/redirect";
import { listAdminMedia } from "@/lib/content/media-admin-transport";
import { getPrismaClient } from "@/lib/db/client";

type AdminMediaPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: AdminMediaPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminMediaLibrary" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function AdminMediaPage({ params, searchParams }: AdminMediaPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  const session = await getRequestSession();
  const decision = decideProtectedRoute(session, appLocale, `/${appLocale}/admin/media`);
  if (!decision.allow) redirect(decision.redirectTo);

  const rawSearchParams = await searchParams;
  const { page, kind } = normalizeAdminMediaQuery(rawSearchParams);

  const t = await getTranslations("AdminMediaLibrary");
  const uploadPublicUrl = process.env.UPLOAD_PUBLIC_URL ?? "";

  const result = await loadAdminMediaSafely(() =>
    listAdminMedia(
      getPrismaClient(),
      session.ok ? session.session : null,
      { page, kind },
      uploadPublicUrl,
    ),
  );

  return (
    <section aria-labelledby="admin-media-title" className="flex flex-col gap-6">
      <div>
        <h1 id="admin-media-title" className="section-rule font-display text-2xl text-slate-900">
          {t("title")}
        </h1>
        <p className="mt-2 max-w-prose text-sm text-slate-500">{t("description")}</p>
      </div>

      {result.ok ? (
        <>
          <AdminMediaFilterTabs
            active={kind}
            ariaLabel={t("filterAriaLabel")}
            labels={{ ALL: t("kind.all"), IMAGE: t("kind.image"), PDF: t("kind.pdf") }}
          />

          <p className="text-sm text-slate-500">{t("totalCount", { count: result.data.total })}</p>

          {result.data.items.length > 0 ? (
            <AdminMediaGrid
              items={result.data.items}
              locale={appLocale}
              uploadPublicUrl={uploadPublicUrl}
              ariaLabel={t("gridAriaLabel")}
              labels={{
                kindImage: t("kind.image"),
                kindPdf: t("kind.pdf"),
                decorative: t("decorative"),
                altLabel: (alt: string) => t("altLabel", { alt }),
                uploadedByLabel: (name: string) => t("uploadedBy", { name }),
              }}
            />
          ) : (
            <AdminMediaStateNotice
              variant="empty"
              title={t("empty.title")}
              description={t("empty.description")}
            />
          )}

          <AdminMediaPagination
            current={result.data.page}
            totalPages={totalPagesFor(result.data.total, result.data.pageSize)}
            kind={kind}
            ariaLabel={t("pagination.ariaLabel")}
            previousLabel={t("pagination.previous")}
            nextLabel={t("pagination.next")}
            pageStatusLabel={t("pagination.pageStatus", {
              page: result.data.page,
              totalPages: totalPagesFor(result.data.total, result.data.pageSize),
            })}
            goToPageLabel={(targetPage) => t("pagination.goToPage", { page: targetPage })}
          />
        </>
      ) : (
        <AdminMediaStateNotice
          variant="unavailable"
          title={t("unavailable.title")}
          description={t("unavailable.description")}
        />
      )}
    </section>
  );
}
