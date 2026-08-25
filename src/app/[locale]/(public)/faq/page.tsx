import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Breadcrumb } from "@/components/public/breadcrumb";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/public/section-heading";
import { PublicContentStateNotice } from "@/components/admin/public-content/public-content-state-notice";
import { getPublicContentDetail } from "@/features/public-content/public-query";
import { listPublicContent } from "@/features/public-content/public-list";
import { getPrismaClient } from "@/lib/db/client";
import type { PublicContentDetail } from "@/contracts/public-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as "id" | "en" | "ar";

  try {
    const t = await getTranslations({ locale, namespace: "PublicContent" });
    return {
      title: t("faq.listTitle"),
      description: t("faq.listDescription"),
    };
  } catch {
    return {};
  }
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as "id" | "en" | "ar";
  setRequestLocale(locale);
  const t = await getTranslations("PublicContent");
  const tNav = await getTranslations("Nav");

  const prisma = getPrismaClient();
  const listResult = await listPublicContent(prisma, {
    resource: "FAQ",
    locale,
    page: 1,
    pageSize: 50,
  });

  if (!listResult.ok) {
    return (
      <Container className="py-12 md:py-20">
        <PublicContentStateNotice
          variant="unavailable"
          title={t("unavailable.title")}
          description={t("unavailable.description")}
        />
      </Container>
    );
  }

  const faqIds = listResult.items
    .filter((item): item is typeof listResult.items[number] & { id: string } => item.id !== null)
    .map((item) => item.id);

  if (faqIds.length === 0) {
    return (
      <Container className="py-12 md:py-20">
        <PublicContentStateNotice
          variant="empty"
          title={t("empty.title")}
          description={t("empty.faq")}
        />
      </Container>
    );
  }

  const details = await Promise.all(
    faqIds.map((id) =>
      getPublicContentDetail(prisma, { resource: "FAQ", id, locale }),
    ),
  );

  const faqs = details
    .filter(
      (d): d is { ok: true; data: PublicContentDetail } =>
        d.ok && d.data.resource === "FAQ",
    )
    .map((d) => d.data as Extract<PublicContentDetail, { resource: "FAQ" }>)
    .filter((faq) => faq.translation.question && faq.translation.answer)
    .sort((a, b) => a.order - b.order);

  return (
    <Container className="py-12 md:py-20">
      <div className="mx-auto max-w-3xl">
        <Breadcrumb
          ariaLabel={tNav("breadcrumbLabel")}
          className="mb-6"
          items={[
            {label: tNav("home"), href: "/"},
            {label: t("faq.listTitle")},
          ]}
        />
        <SectionHeading
          as="h1"
          title={t("faq.listTitle")}
          description={t("faq.listDescription")}
        />

        {faqs.length === 0 ? (
          <div className="mt-10">
            <PublicContentStateNotice
              variant="empty"
              title={t("empty.title")}
              description={t("empty.faq")}
            />
          </div>
        ) : (
          <div className="mt-10 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {faqs.map((faq) => {
              const contentDir =
                faq.translation.resolvedLocale === "ar" ? "rtl" : "ltr";
              return (
                <details
                  key={faq.id}
                  className="group"
                >
                  <summary className="flex cursor-pointer items-start gap-3 px-6 py-4 text-start font-medium text-slate-900 hover:text-royal-600 marker:content-none">
                    <svg
                      aria-hidden
                      className="mt-1 size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-90 rtl:group-open:-rotate-90"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m9 5 7 7-7 7"
                      />
                    </svg>
                    <span className="flex-1">
                      {faq.translation.category ? (
                        <span className="block text-xs font-medium uppercase tracking-wide text-royal-600">
                          {faq.translation.category}
                        </span>
                      ) : null}
                      <span className="block text-sm leading-snug">
                        {faq.translation.question}
                      </span>
                    </span>
                  </summary>
                  <div
                    lang={faq.translation.resolvedLocale}
                    dir={contentDir}
                    className="prose-measure px-6 pb-5 text-sm leading-relaxed text-slate-600 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_a]:text-royal-600 [&_a]:underline [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                    dangerouslySetInnerHTML={{
                      __html: faq.translation.answer,
                    }}
                  />
                </details>
              );
            })}
          </div>
        )}
      </div>
    </Container>
  );
}
