import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";

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
      title: t("testimonial.listTitle"),
      description: t("testimonial.listDescription"),
    };
  } catch {
    return {};
  }
}

export default async function TestimonialPage({
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
    resource: "TESTIMONIAL",
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

  const itemIds = listResult.items
    .filter((item): item is typeof listResult.items[number] & { id: string } => item.id !== null)
    .map((item) => item.id);

  if (itemIds.length === 0) {
    return (
      <Container className="py-12 md:py-20">
        <PublicContentStateNotice
          variant="empty"
          title={t("empty.title")}
          description={t("empty.testimoni")}
        />
      </Container>
    );
  }

  const details = await Promise.all(
    itemIds.map((id) =>
      getPublicContentDetail(prisma, { resource: "TESTIMONIAL", id, locale }),
    ),
  );

  const testimonials = details
    .filter(
      (d): d is { ok: true; data: PublicContentDetail } =>
        d.ok && d.data.resource === "TESTIMONIAL",
    )
    .map((d) =>
      d.data as Extract<PublicContentDetail, { resource: "TESTIMONIAL" }>,
    )
    .filter((tm) => tm.translation.quote)
    .sort((a, b) => a.order - b.order);

  return (
    <Container className="py-12 md:py-20">
      <Breadcrumb
        ariaLabel={tNav("breadcrumbLabel")}
        className="mb-6"
        items={[
          {label: tNav("home"), href: "/"},
          {label: t("testimonial.listTitle")},
        ]}
      />
      <SectionHeading
        as="h1"
        title={t("testimonial.listTitle")}
        description={t("testimonial.listDescription")}
      />

      {testimonials.length === 0 ? (
        <div className="mt-10">
          <PublicContentStateNotice
            variant="empty"
            title={t("testimonial.empty")}
            description={t("testimonial.emptyDescription")}
          />
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((tm) => {
            const contentDir =
              tm.translation.resolvedLocale === "ar" ? "rtl" : "ltr";
            return (
              <blockquote
                key={tm.id}
                lang={tm.translation.resolvedLocale}
                dir={contentDir}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                {tm.photo ? (
                  <Image
                    src={tm.photo.url}
                    alt={tm.photo.isDecorative ? "" : tm.photo.alt}
                    width={tm.photo.width ?? 80}
                    height={tm.photo.height ?? 80}
                    className="mb-4 size-16 rounded-full object-cover"
                    loading="lazy"
                  />
                ) : null}

                <div className="flex-1">
                  <div className="relative">
                    <svg
                      aria-hidden
                      className="absolute -start-1 -top-1 size-8 text-slate-100 rtl:scale-x-[-1]"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M9.983 3v7.391c0 5.704-3.731 9.57-8.983 10.609l-.995-2.151c2.432-.917 3.995-3.638 3.995-5.849h-4v-10h9.983zm14.017 0v7.391c0 5.704-3.748 9.571-9 10.609l-.996-2.151c2.433-.917 3.996-3.638 3.996-5.849h-3.983v-10h9.983z" />
                    </svg>
                    <div
                      className="relative pt-5 text-sm leading-relaxed text-slate-600 [&_p]:mb-3 [&_p:last-child]:mb-0"
                      dangerouslySetInnerHTML={{
                        __html: tm.translation.quote,
                      }}
                    />
                  </div>
                </div>

                <footer className="mt-4 border-t border-slate-100 pt-4">
                  <cite className="not-italic">
                    <div className="text-sm font-semibold text-slate-900">
                      {tm.name}
                    </div>
                    {tm.translation.currentRole || tm.graduationYear ? (
                      <div className="mt-0.5 text-xs text-slate-500">
                        {[
                          tm.translation.currentRole,
                          tm.graduationYear
                            ? `${t("testimonial.graduationYear")}: ${tm.graduationYear}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" \u00B7 ")}
                      </div>
                    ) : null}
                  </cite>
                </footer>
              </blockquote>
            );
          })}
        </div>
      )}
    </Container>
  );
}
