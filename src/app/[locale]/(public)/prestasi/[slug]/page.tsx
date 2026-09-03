import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Image from "next/image";

import { Breadcrumb } from "@/components/public/breadcrumb";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/public/section-heading";
import { PublicContentStateNotice } from "@/components/admin/public-content/public-content-state-notice";
import type { PublicContentDetail } from "@/contracts/public-content";
import { getPublicContentDetail } from "@/features/public-content/public-query";
import { getPrismaClient } from "@/lib/db/client";
import {formatDateDdMmYyyy} from "@/lib/format/date";

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

  const achievement = result.data as Extract<PublicContentDetail, { resource: typeof RESOURCE }>;

  return (
    <Container className="py-12 md:py-20">
      <Breadcrumb
        ariaLabel={tNav("breadcrumbLabel")}
        className="mb-6"
        items={[
          {label: tNav("home"), href: "/"},
          {label: t("achievement.listTitle"), href: LIST_PATH},
          {label: achievement.translation.title, resolvedLocale: achievement.translation.resolvedLocale},
        ]}
      />

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
                {formatDateDdMmYyyy(achievement.achievedAt)}
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
          <section>
            <div
              lang={achievement.translation.resolvedLocale}
              className="rich-text"
              dangerouslySetInnerHTML={{ __html: achievement.translation.description }}
            />
          </section>
        ) : null}
      </article>
    </Container>
  );
}
