import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {Breadcrumb} from "@/components/public/breadcrumb";
import {BookingTrackForm, type BookingTrackLabels} from "@/components/public/booking/booking-track-form";
import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import type {AppLocale} from "@/i18n/routing";

const STATUSES = ["MENUNGGU", "DISETUJUI", "DITOLAK", "DIBATALKAN", "SELESAI"] as const;

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Booking"});
  return {title: t("trackTitle"), robots: {index: false, follow: false}};
}

export default async function BookingTrackPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Booking");
  const tNav = await getTranslations("Nav");

  const labels = {
    bookingNumber: t("fieldBookingNumber"),
    bookingNumberHint: t("hintBookingNumber"),
    token: t("fieldToken"),
    tokenHint: t("hintToken"),
    track: t("track"),
    tracking: t("tracking"),
    roomLabel: t("location"),
    scheduleLabel: t("labelSchedule"),
    participantLabel: t("fieldParticipantCount"),
    purposeLabel: t("fieldPurpose"),
    submittedLabel: t("labelSubmitted"),
    cancelReasonLabel: t("labelCancelReason"),
    cancelTitle: t("cancelTitle"),
    cancelHint: t("cancelHint"),
    cancelSubmit: t("cancelSubmit"),
    cancelling: t("cancelling"),
    historyLabel: t("labelHistory"),
    participantUnit: t("participantUnit"),
    statuses: Object.fromEntries(
      STATUSES.map((value) => [value, t(`status${value}` as "statusMENUNGGU")]),
    ),
    errorCodes: {
      REQUEST_INVALID: t("errorTrackInvalid"),
      NOT_FOUND: t("errorNotFound"),
      INVALID_STATE: t("errorInvalidState"),
      UNAVAILABLE: t("errorUnavailable"),
    },
  } satisfies BookingTrackLabels;

  return (
    <Container className="py-12 md:py-20">
      <Breadcrumb
        ariaLabel={tNav("breadcrumbLabel")}
        className="mb-6"
        items={[
          {label: tNav("home"), href: "/"},
          {label: t("listTitle"), href: "/peminjaman"},
          {label: t("trackTitle")},
        ]}
      />
      <SectionHeading as="h1" title={t("trackTitle")} description={t("trackDescription")} />
      <div className="mt-10">
        <BookingTrackForm labels={labels} locale={locale} />
      </div>
    </Container>
  );
}
