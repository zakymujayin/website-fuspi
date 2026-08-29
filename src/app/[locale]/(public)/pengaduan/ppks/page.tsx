import {Phone, ShieldCheck} from "lucide-react";
import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {Breadcrumb} from "@/components/public/breadcrumb";
import {PpksReportForm, type PpksFormLabels} from "@/components/public/ppks/ppks-report-form";
import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import {PPKS_EMERGENCY_CONTACTS, PPKS_INSTITUTIONAL_CONTACTS} from "@/config/ppks-support";
import type {AppLocale} from "@/i18n/routing";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Ppks"});
  /* Kept out of search results: a reporting page is for someone who came here
     on purpose, not something to surface beside a person's name. */
  return {title: t("title"), robots: {index: false, follow: false}};
}

export default async function PpksReportPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Ppks");
  const tNav = await getTranslations("Nav");
  const tPages = await getTranslations("Pages");

  const labels = {
    reporterRole: t("fieldReporterRole"),
    reporterRoleHint: t("hintReporterRole"),
    roleVictim: t("roleVictim"),
    roleWitness: t("roleWitness"),
    roleThirdParty: t("roleThirdParty"),
    rolePreferNot: t("rolePreferNot"),
    subject: t("fieldSubject"),
    subjectHint: t("hintSubject"),
    description: t("fieldDescription"),
    descriptionHint: t("hintDescription"),
    identity: t("fieldIdentity"),
    identityHint: t("hintIdentity"),
    attachments: t("fieldAttachments"),
    attachmentsHint: t("hintAttachments"),
    danger: t("fieldDanger"),
    dangerHint: t("hintDanger"),
    submit: t("submit"),
    submitting: t("submitting"),
    successTitle: t("successTitle"),
    successBody: t("successBody"),
    ticketNumberLabel: t("fieldTicketNumber"),
    tokenLabel: t("fieldToken"),
    tokenWarning: t("tokenWarning"),
    trackLink: t("trackLink"),
    errorCodes: {
      REQUEST_INVALID: t("errorRequestInvalid"),
      RATE_LIMITED: t("errorRateLimited"),
      UNAVAILABLE: t("errorUnavailable"),
    },
  } satisfies PpksFormLabels;

  const contacts = [...PPKS_EMERGENCY_CONTACTS, ...PPKS_INSTITUTIONAL_CONTACTS];

  return (
    <Container className="py-12 md:py-20">
      <Breadcrumb
        ariaLabel={tNav("breadcrumbLabel")}
        className="mb-6"
        items={[
          {label: tNav("home"), href: "/"},
          {label: tPages("complaintsTitle"), href: "/pengaduan"},
          {label: t("title")},
        ]}
      />
      <SectionHeading as="h1" title={t("title")} description={t("description")} />

      {/* docs/14 D3 requires the danger notice and the contacts to sit above the
          form, before anyone starts typing. */}
      <div className="mt-8 max-w-2xl rounded-xl border-2 border-danger bg-danger-surface p-5">
        <p className="flex items-start gap-2 text-sm font-semibold text-slate-900">
          <Phone aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
          {t("immediateDangerNotice")}
        </p>
        <ul className="mt-4 space-y-1.5 text-sm text-slate-800">
          {contacts.map((contact) => (
            <li key={contact.labelKey} className="flex flex-wrap items-baseline gap-x-2">
              <span>{t(contact.labelKey as "contactPolice")}</span>
              {contact.phone ? (
                <a dir="ltr" href={`tel:${contact.phone}`} className="font-mono font-semibold underline-offset-2 hover:underline">
                  {contact.phone}
                </a>
              ) : null}
              {contact.email ? (
                <a dir="ltr" href={`mailto:${contact.email}`} className="underline-offset-2 hover:underline">
                  {contact.email}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
        {PPKS_INSTITUTIONAL_CONTACTS.length === 0 ? (
          <p className="mt-4 text-xs text-slate-700">{t("institutionalContactPending")}</p>
        ) : null}
      </div>

      <div className="mt-6 max-w-2xl rounded-xl border border-royal-200 bg-royal-50 p-5">
        <p className="flex items-start gap-2 text-sm font-semibold text-royal-900">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
          {t("confidentialityTitle")}
        </p>
        <ul className="mt-3 space-y-2 text-sm text-royal-900">
          <li>{t("confidentialityRead")}</li>
          <li>{t("confidentialityAnonymous")}</li>
          <li>{t("confidentialityCompanion")}</li>
          <li>{t("confidentialityWithdraw")}</li>
        </ul>
      </div>

      <div className="mt-10">
        <PpksReportForm labels={labels} />
      </div>

      <p className="mt-10 max-w-2xl text-sm text-slate-500">{t("closingNote")}</p>
    </Container>
  );
}
