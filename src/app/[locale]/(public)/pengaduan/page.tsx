import {MessageSquare, Search, ShieldAlert} from "lucide-react";
import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import {Link} from "@/i18n/navigation";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  await params;
  return {title: "Pengaduan"};
}

export default async function PengaduanPage({params}: {params: Promise<{locale: string}>}) {
  await params;
  setRequestLocale("id");
  const t = await getTranslations("Pages");
  const tPpks = await getTranslations("Ppks");

  return (
    <Container className="py-12 md:py-20">
      <SectionHeading as="h1" title={t("complaintsTitle")} description={t("complaintsDescription")} />
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <Link href="/pengaduan/baru"
          className="group flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <span className="flex size-10 items-center justify-center rounded-lg bg-royal-50 text-royal-600">
            <MessageSquare data-icon aria-hidden className="size-5" strokeWidth={1.5} />
          </span>
          <div>
            <h2 className="font-display text-[15px] font-semibold text-slate-900">{t("submitComplaint")}</h2>
            <p className="mt-1.5 text-sm text-slate-500">{t("submitComplaintDesc")}</p>
          </div>
        </Link>
        <Link href="/pengaduan/lacak"
          className="group flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <span className="flex size-10 items-center justify-center rounded-lg bg-royal-50 text-royal-600">
            <Search data-icon aria-hidden className="size-5" strokeWidth={1.5} />
          </span>
          <div>
            <h2 className="font-display text-[15px] font-semibold text-slate-900">{t("trackComplaint")}</h2>
            <p className="mt-1.5 text-sm text-slate-500">{t("trackComplaintDesc")}</p>
          </div>
        </Link>
      </div>

      {/* Separated from the two cards above on purpose: this is a different
          channel with different confidentiality rules, not another complaint
          type sitting in the same queue. */}
      <Link
        href="/pengaduan/ppks"
        className="group mt-6 flex flex-col gap-4 rounded-xl border-2 border-royal-200 bg-royal-50 p-6 transition-colors hover:border-royal-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600"
      >
        <span className="flex size-10 items-center justify-center rounded-lg bg-white text-royal-600">
          <ShieldAlert data-icon aria-hidden className="size-5" strokeWidth={1.5} />
        </span>
        <div>
          <h2 className="font-display text-[15px] font-semibold text-slate-900">{tPpks("title")}</h2>
          <p className="mt-1.5 text-sm text-slate-600">{tPpks("description")}</p>
        </div>
      </Link>
    </Container>
  );
}
