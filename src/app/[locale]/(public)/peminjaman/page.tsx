import {ArrowRight, MapPin, Users} from "lucide-react";
import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {Breadcrumb} from "@/components/public/breadcrumb";
import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import {listPublicRooms} from "@/features/booking/domain";
import {Link} from "@/i18n/navigation";
import {getPrismaClient} from "@/lib/db/client";
import type {AppLocale} from "@/i18n/routing";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Booking"});
  return {title: t("listTitle")};
}

function formatMinute(minute: number): string {
  const hours = String(Math.floor(minute / 60)).padStart(2, "0");
  const minutes = String(minute % 60).padStart(2, "0");
  return `${hours}.${minutes}`;
}

export default async function BookingRoomsPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Booking");
  const tNav = await getTranslations("Nav");

  const result = await listPublicRooms(getPrismaClient(), locale);
  const rooms = result.ok ? result.items : [];

  return (
    <Container className="py-12 md:py-20">
      <Breadcrumb
        ariaLabel={tNav("breadcrumbLabel")}
        className="mb-6"
        items={[{label: tNav("home"), href: "/"}, {label: t("listTitle")}]}
      />
      <SectionHeading as="h1" title={t("listTitle")} description={t("listDescription")} />

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/peminjaman/ajukan"
          className="inline-flex items-center gap-2 rounded-lg bg-royal-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-royal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600"
        >
          {t("requestCta")}
          <ArrowRight aria-hidden data-icon className="size-4 rtl:rotate-180" strokeWidth={1.5} />
        </Link>
        <Link
          href="/peminjaman/lacak"
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600"
        >
          {t("trackCta")}
        </Link>
      </div>

      {rooms.length > 0 ? (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <li key={room.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-6">
              <h2 dir="auto" className="font-display text-base font-semibold text-slate-900">{room.name}</h2>
              <dl className="mt-3 space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <dt className="sr-only">{t("capacity")}</dt>
                  <Users aria-hidden className="size-4 shrink-0 text-slate-400" strokeWidth={1.5} />
                  <dd>{room.capacity} {t("capacityUnit")}</dd>
                </div>
                {room.location ? (
                  <div className="flex items-center gap-2">
                    <dt className="sr-only">{t("location")}</dt>
                    <MapPin aria-hidden className="size-4 shrink-0 text-slate-400" strokeWidth={1.5} />
                    <dd dir="auto">{room.location}</dd>
                  </div>
                ) : null}
              </dl>
              <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
                {room.todayOperatingHours
                  && room.todayOperatingHours.opensAtMinute !== null
                  && room.todayOperatingHours.closesAtMinute !== null
                  ? t("openToday", {
                      from: formatMinute(room.todayOperatingHours.opensAtMinute),
                      to: formatMinute(room.todayOperatingHours.closesAtMinute),
                    })
                  : t("closedToday")}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-10 rounded-xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">{t("noRooms")}</p>
        </div>
      )}
    </Container>
  );
}
