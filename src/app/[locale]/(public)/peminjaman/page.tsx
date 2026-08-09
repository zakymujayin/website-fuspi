import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  await params;
  return {title: "Peminjaman Ruangan"};
}

export default async function PeminjamanPage({params}: {params: Promise<{locale: string}>}) {
  await params;
  setRequestLocale("id");
  const t = await getTranslations("Pages");

  return (
    <Container className="py-12 md:py-20">
      <SectionHeading as="h1" title={t("bookingTitle")} description={t("bookingDescription")} />
      <div className="mt-12 rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">{t("comingSoon")}</p>
      </div>
    </Container>
  );
}
