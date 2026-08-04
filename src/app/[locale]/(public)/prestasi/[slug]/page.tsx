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

const RESOURCE = "ACHIEVEMENT" as const;
const LIST_PATH = "/prestasi";

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "PublicContent" });
  const result = await getPublicContentDetail(getPrismaClient(), { resource: RESOURCE, slug, locale });
  if (!result.ok) {
    return { title: t("publicContent.achievement.listTitle"), description: t("publicContent.achievement.listDescription") };
  }
  const achievement = result.data as Extract<PublicContentDetail, { resource: typeof RESOURCE }>;
  return {
    title: achievement.translation.title,
    description: achievement.translation.description ?? undefined,
    alternates: { canonical: `/${locale}${LIST_PATH}/${achievement.slug}` },
  };
}

export default async function AchievementDetailPage({ params }: PageProps) {
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

  const achievement = result.data as Extract<PublicContentDetail, { resource: typeof RESOURCE }>;

  return (
    <Container className="py-12 md:py-20">
      <nav aria-label={t("breadcrumb")} className="mb-6 text-sm text-slate-500">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li>
            <a href={`/${locale}`} className="hover:text-royal-500 transition-colors">{t("breadcrumbHome")}</a>
          </li>
          <li aria-hidden>/</li>
          <li>
            <a href={`/${locale}${LIST_PATH}`} className="hover:text-royal-500 transition-colors">{t("publicContent.achievement.listTitle")}</a>
          </li>
          <li aria-hidden>/</li>
          <li className="truncate text-slate-700">{achievement.translation.title}</li>
        </ol>
      </nav>

      <article>
        <header className="mb-8">
          {achievement.level ? (
            <span className="mb-3 inline-block rounded-full bg-royal-500/10 px-3 py-1 text-[13px] font-medium text-royal-500">
              {achievement.level}
            </span>
          ) : null}
          <SectionHeading as="h1" title={achievement.translation.title} />
          <p className="mt-4 text-slate-600">
            {t("detail.achievedBy", { name: achievement.studentName })}
            {achievement.achievedAt ? (
              <>
                {" · "}
                {new Date(achievement.achievedAt).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })}
              </>
            ) : null}
          </p>
        </header>

        {achievement.image ? (
          <figure className="mb-8">
            <Image
              src={achievement.image.url}
              alt={achievement.image.isDecorative ? "" : achievement.image.alt}
              width={achievement.image.width ?? undefined}
              height={achievement.image.height ?? undefined}
              className="w-full max-w-xl rounded-xl object-cover aspect-video bg-slate-100"
            />
          </figure>
        ) : null}

        {achievement.translation.description ? (
          <section className="prose prose-slate max-w-none">
            <div
              lang={achievement.translation.resolvedLocale}
              dangerouslySetInnerHTML={{ __html: achievement.translation.description }}
            />
          </section>
        ) : null}
      </article>
    </Container>
  );
}
