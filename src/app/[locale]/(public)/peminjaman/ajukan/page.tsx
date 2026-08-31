import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {Breadcrumb} from "@/components/public/breadcrumb";
import {BookingRequestForm, type BookingRequestLabels} from "@/components/public/booking/booking-request-form";
import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import {listPublicRooms} from "@/features/booking/domain";
import {getPrismaClient} from "@/lib/db/client";
import type {AppLocale} from "@/i18n/routing";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Booking"});
  return {title: t("requestTitle")};
}

/* Today in Jakarta, so the date field cannot offer a day that has already passed
   for the campus even when the reader's device sits in another zone. */
function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {timeZone: "Asia/Jakarta"}).format(new Date());
}

export default async function BookingRequestPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Booking");
  const tNav = await getTranslations("Nav");

  const result = await listPublicRooms(getPrismaClient(), locale);
  const rooms = result.ok
    ? result.items.map((room) => ({
        id: room.id,
        name: room.name,
        capacity: room.capacity,
        location: room.location,
      }))
    : [];

  const labels = {
    room: t("fieldRoom"),
    roomHint: t("hintRoom"),
    date: t("fieldDate"),
    startTime: t("fieldStartTime"),
    endTime: t("fieldEndTime"),
    timeHint: t("hintTime"),
    participantCount: t("fieldParticipantCount"),
    purpose: t("fieldPurpose"),
    purposeHint: t("hintPurpose"),
    applicationLetter: t("fieldApplicationLetter"),
    applicationLetterHint: t("hintApplicationLetter"),
    requesterSection: t("sectionRequester"),
    bookingSection: t("sectionBooking"),
    requesterName: t("fieldRequesterName"),
    requesterEmail: t("fieldRequesterEmail"),
    requesterPhone: t("fieldRequesterPhone"),
    organization: t("fieldOrganization"),
    optional: t("optional"),
    submit: t("submit"),
    submitting: t("submitting"),
    successTitle: t("successTitle"),
    successBody: t("successBody"),
    bookingNumberLabel: t("fieldBookingNumber"),
    tokenLabel: t("fieldToken"),
    tokenWarning: t("tokenWarning"),
    trackLink: t("trackLink"),
    capacityUnit: t("capacityUnit"),
    errorCodes: {
      REQUEST_INVALID: t("errorRequestInvalid"),
      ROOM_NOT_FOUND: t("errorRoomNotFound"),
      ROOM_INACTIVE: t("errorRoomInactive"),
      TIME_INVALID: t("errorTimeInvalid"),
      TIME_OVERLAP: t("errorTimeOverlap"),
      CAPACITY_EXCEEDED: t("errorCapacityExceeded"),
      OPERATING_HOURS: t("errorOperatingHours"),
      BLACKOUT: t("errorBlackout"),
      NOT_FOUND: t("errorNotFound"),
      UNAVAILABLE: t("errorUnavailable"),
    },
  } satisfies BookingRequestLabels;

  return (
    <Container className="py-12 md:py-20">
      <Breadcrumb
        ariaLabel={tNav("breadcrumbLabel")}
        className="mb-6"
        items={[
          {label: tNav("home"), href: "/"},
          {label: t("listTitle"), href: "/peminjaman"},
          {label: t("requestTitle")},
        ]}
      />
      <SectionHeading as="h1" title={t("requestTitle")} description={t("requestDescription")} />
      <div className="mt-10">
        {rooms.length === 0 ? (
          <p className="text-sm text-slate-500">{t("noRooms")}</p>
        ) : (
          <BookingRequestForm rooms={rooms} labels={labels} minDate={jakartaToday()} />
        )}
      </div>
    </Container>
  );
}
