import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {Breadcrumb} from "@/components/public/breadcrumb";
import {ComplaintSubmitForm, type ComplaintSubmitLabels} from "@/components/public/complaint/complaint-submit-form";
import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import type {AppLocale} from "@/i18n/routing";

/* PELECEHAN_SEKSUAL is deliberately absent. The public ticket workflow refuses
   that category, and routing such a report through the general queue would put
   it in front of staff the PPKS isolation exists to exclude. */
const PUBLIC_CATEGORIES = ["AKADEMIK", "KEMAHASISWAAN", "SARANA", "LAINNYA"] as const;

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Complaint"});
  return {title: t("submitTitle")};
}

export default async function ComplaintSubmitPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Complaint");
  const tNav = await getTranslations("Nav");
  const tPages = await getTranslations("Pages");

  const labels = {
    category: t("fieldCategory"),
    subject: t("fieldSubject"),
    subjectHint: t("hintSubject"),
    description: t("fieldDescription"),
    descriptionHint: t("hintDescription"),
    submit: t("submit"),
    submitting: t("submitting"),
    successTitle: t("successTitle"),
    successBody: t("successBody"),
    ticketNumberLabel: t("fieldTicketNumber"),
    tokenLabel: t("fieldToken"),
    tokenWarning: t("tokenWarning"),
    trackLink: t("trackLink"),
    categories: PUBLIC_CATEGORIES.map((value) => ({
      value,
      label: t(`category${value}` as "categoryAKADEMIK"),
    })),
    errorCodes: {
      REQUEST_INVALID: t("errorRequestInvalid"),
      RATE_LIMITED: t("errorRateLimited"),
      NOT_FOUND: t("errorNotFound"),
      VALIDATION_FAILED: t("errorValidationFailed"),
      UNAVAILABLE: t("errorUnavailable"),
    },
  } satisfies ComplaintSubmitLabels;

  return (
    <Container className="py-12 md:py-20">
      <Breadcrumb
        ariaLabel={tNav("breadcrumbLabel")}
        className="mb-6"
        items={[
          {label: tNav("home"), href: "/"},
          {label: tPages("complaintsTitle"), href: "/pengaduan"},
          {label: t("submitTitle")},
        ]}
      />
      <SectionHeading as="h1" title={t("submitTitle")} description={t("submitDescription")} />

      <div className="mt-6 max-w-2xl rounded-xl border border-royal-200 bg-royal-50 p-5">
        <p className="text-sm text-royal-900">{t("ppksNotice")}</p>
      </div>

      <div className="mt-10">
        <ComplaintSubmitForm labels={labels} />
      </div>
    </Container>
  );
}
