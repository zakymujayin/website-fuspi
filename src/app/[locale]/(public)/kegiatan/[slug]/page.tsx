import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Image from "next/image";

import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/public/section-heading";
import { PublicContentStateNotice } from "@/components/admin/public-content/public-content-state-notice";
import type { PublicContentDetail } from "@/contracts/public-content";
import { getPublicContentDetail } from "@/features/public-content/public-query";
import { getPrismaClient } from "@/lib/db/client";

const RESOURCE = "STUDENT_ACTIVITY" as const;
const LIST_PATH = "/kegiatan";

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "PublicContent" });
  const result = await getPublicContentDetail(getPrismaClient(), { resource: RESOURCE, slug, locale });
  if (!result.ok) {
    return { title: t("publicContent.studentActivity.listTitle"), description: t("publicContent.studentActivity.listDescription") };
  }
  const studentActivity = result.data as Extract<PublicContentDetail, { resource: typeof RESOURCE }>;
  return {
    title: studentActivity.translation.title,
    description: studentActivity.translation.description ?? undefined,
    alternates: { canonical: `/${locale}${LIST_PATH}/${studentActivity.slug}` },
  };
}

export default async function StudentActivityDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("PublicContent");

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

  const studentActivity = result.data as Extract<PublicContentDetail, { resource: typeof RESOURCE }>;

  return (
    <Container className="py-12 md:py-20">
      <nav aria-label={t("breadcrumb")} className="mb-6 text-sm text-slate-500">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li>
            <a href={`/${locale}`} className="hover:text-royal-500 transition-colors">{t("breadcrumbHome")}</a>
          </li>
          <li aria-hidden>/</li>
          <li>
            <a href={`/${locale}${LIST_PATH}`} className="hover:text-royal-500 transition-colors">{t("publicContent.studentActivity.listTitle")}</a>
          </li>
          <li aria-hidden>/</li>
          <li className="truncate text-slate-700">{studentActivity.translation.title}</li>
        </ol>
      </nav>

      <article>
        <header className="mb-8">
          <SectionHeading as="h1" title={studentActivity.translation.title} />
          {studentActivity.date ? (
            <time
              dateTime={studentActivity.date}
              className="mt-4 inline-block text-sm text-slate-500"
            >
              {new Date(studentActivity.date).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })}
            </time>
          ) : null}
        </header>

        {studentActivity.images.length > 0 ? (
          <section className="mb-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {studentActivity.images.map((item) => (
                <figure key={item.media.id}>
                  <Image
                    src={item.media.url}
                    alt={item.media.isDecorative ? "" : item.media.alt}
                    width={item.media.width ?? undefined}
                    height={item.media.height ?? undefined}
                    className="w-full rounded-xl object-cover aspect-video bg-slate-100"
                  />
                  {item.caption ? (
                    <figcaption className="mt-2 text-[13px] text-slate-500 italic break-words">
                      {item.caption}
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        {studentActivity.translation.description ? (
          <section className="prose prose-slate max-w-none">
            <div
              lang={studentActivity.translation.resolvedLocale}
              dangerouslySetInnerHTML={{ __html: studentActivity.translation.description }}
            />
          </section>
        ) : null}
      </article>
    </Container>
  );
}
