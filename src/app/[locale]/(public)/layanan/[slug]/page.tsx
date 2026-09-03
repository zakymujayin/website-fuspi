import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/public/breadcrumb";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/public/section-heading";
import { PublicContentStateNotice } from "@/components/admin/public-content/public-content-state-notice";
import type { PublicContentDetail } from "@/contracts/public-content";
import { getPublicContentDetail } from "@/features/public-content/public-query";
import { getPrismaClient } from "@/lib/db/client";

const RESOURCE = "SERVICE" as const;
const LIST_PATH = "/layanan";

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "PublicContent" });
  const result = await getPublicContentDetail(getPrismaClient(), { resource: RESOURCE, slug, locale });
  if (!result.ok) {
    return { title: t("publicContent.service.listTitle"), description: t("publicContent.service.listDescription") };
  }
  const service = result.data as Extract<PublicContentDetail, { resource: typeof RESOURCE }>;
  return {
    title: service.translation.name,
    description: service.translation.description ?? undefined,
    alternates: { canonical: `/${locale}${LIST_PATH}/${service.slug}` },
  };
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("PublicContent");
const tNav = await getTranslations("Nav");

  const result = await getPublicContentDetail(getPrismaClient(), { resource: RESOURCE, slug, locale });

  if (!result.ok) {
    if (result.code === "NOT_FOUND") notFound();
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

  const service = result.data as Extract<PublicContentDetail, { resource: typeof RESOURCE }>;

  return (
    <Container className="py-12 md:py-20">
      <Breadcrumb
        ariaLabel={tNav("breadcrumbLabel")}
        className="mb-6"
        items={[
          {label: tNav("home"), href: "/"},
          {label: t("service.listTitle"), href: LIST_PATH},
          {label: service.translation.name, resolvedLocale: service.translation.resolvedLocale},
        ]}
      />

      <article>
        <header className="mb-8">
          {service.category ? (
            <span className="mb-3 inline-block rounded-full bg-royal-500/10 px-3 py-1 text-[13px] font-medium text-royal-500">
              {service.category}
            </span>
          ) : null}
          <SectionHeading as="h1" title={service.translation.name} />
          {service.icon ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <span aria-hidden className="font-mono">{service.icon}</span>
            </p>
          ) : null}
        </header>

        {service.translation.description ? (
          <section>
            <div
              lang={service.translation.resolvedLocale}
              className="rich-text"
              dangerouslySetInnerHTML={{ __html: service.translation.description }}
            />
          </section>
        ) : null}

        {service.link ? (
          <section className="mt-8">
            <a
              href={service.link.href}
              target={service.link.kind === "EXTERNAL" ? "_blank" : undefined}
              rel={service.link.kind === "EXTERNAL" ? "noopener noreferrer" : undefined}
              className="inline-flex items-center gap-2 rounded-lg bg-royal-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-royal-600 transition-colors"
            >
              {t("detail.accessService")}
              {service.link.kind === "EXTERNAL" ? <span aria-hidden>&#8599;</span> : null}
            </a>
          </section>
        ) : null}
      </article>
    </Container>
  );
}
