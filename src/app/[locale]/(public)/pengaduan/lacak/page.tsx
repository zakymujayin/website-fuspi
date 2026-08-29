import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {Breadcrumb} from "@/components/public/breadcrumb";
import {ComplaintTrackForm, type ComplaintTrackLabels} from "@/components/public/complaint/complaint-track-form";
import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import type {AppLocale} from "@/i18n/routing";

const STATUSES = ["BARU", "DIVERIFIKASI", "DIPROSES", "MENUNGGU_PELAPOR", "SELESAI", "DITOLAK"] as const;
const CATEGORIES = ["AKADEMIK", "KEMAHASISWAAN", "SARANA", "LAINNYA"] as const;
const PRIORITIES = ["RENDAH", "SEDANG", "TINGGI", "URGENT"] as const;

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Complaint"});
  return {title: t("trackTitle"), robots: {index: false, follow: false}};
}

export default async function ComplaintTrackPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Complaint");
  const tNav = await getTranslations("Nav");
  const tPages = await getTranslations("Pages");

  const labels = {
    ticketNumber: t("fieldTicketNumber"),
    ticketNumberHint: t("hintTicketNumber"),
    token: t("fieldToken"),
    tokenHint: t("hintToken"),
    track: t("track"),
    tracking: t("tracking"),
    statusLabel: t("labelStatus"),
    categoryLabel: t("fieldCategory"),
    submittedLabel: t("labelSubmitted"),
    updatedLabel: t("labelUpdated"),
    descriptionLabel: t("fieldDescription"),
    resolutionLabel: t("labelResolution"),
    repliesLabel: t("labelReplies"),
    noReplies: t("noReplies"),
    replyLabel: t("fieldReply"),
    replyHint: t("hintReply"),
    sendReply: t("sendReply"),
    sendingReply: t("sendingReply"),
    statuses: Object.fromEntries(
      STATUSES.map((value) => [value, t(`status${value}` as "statusBARU")]),
    ),
    priorities: Object.fromEntries(
      PRIORITIES.map((value) => [value, t(`priority${value}` as "priorityRENDAH")]),
    ),
    priorityLabel: t("labelPriority"),
    confidentialTitle: t("confidentialTitle"),
    confidentialBody: t("confidentialBody"),
    categories: Object.fromEntries(
      CATEGORIES.map((value) => [value, t(`category${value}` as "categoryAKADEMIK")]),
    ),
    errorCodes: {
      REQUEST_INVALID: t("errorRequestInvalid"),
      RATE_LIMITED: t("errorRateLimited"),
      NOT_FOUND: t("errorNotFound"),
      VALIDATION_FAILED: t("errorValidationFailed"),
      UNAVAILABLE: t("errorUnavailable"),
    },
  } satisfies ComplaintTrackLabels;

  return (
    <Container className="py-12 md:py-20">
      <Breadcrumb
        ariaLabel={tNav("breadcrumbLabel")}
        className="mb-6"
        items={[
          {label: tNav("home"), href: "/"},
          {label: tPages("complaintsTitle"), href: "/pengaduan"},
          {label: t("trackTitle")},
        ]}
      />
      <SectionHeading as="h1" title={t("trackTitle")} description={t("trackDescription")} />
      <div className="mt-10">
        <ComplaintTrackForm labels={labels} locale={locale} />
      </div>
    </Container>
  );
}
