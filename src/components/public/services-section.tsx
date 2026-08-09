import { ArrowRight, BookMarked, CalendarClock, LayoutDashboard, MessageSquareWarning } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";

type ServiceCard = {
  key: "sila" | "complaints" | "booking" | "ejournal";
  icon: typeof LayoutDashboard;
  href: string;
  external: boolean;
};

/**
 * SILA has no configured public URL yet (`NEXT_PUBLIC_SILA_URL` is unset) and
 * E-Journal has no dedicated route in this build — both fall back to the
 * general services hub rather than a guessed destination (see AGENTS.md).
 */
function buildServices(): readonly ServiceCard[] {
  const silaUrl = process.env.NEXT_PUBLIC_SILA_URL;
  return [
    {
      key: "sila",
      icon: LayoutDashboard,
      href: silaUrl && silaUrl.length > 0 ? silaUrl : "/layanan",
      external: Boolean(silaUrl && silaUrl.length > 0),
    },
    { key: "complaints", icon: MessageSquareWarning, href: "/pengaduan", external: false },
    { key: "booking", icon: CalendarClock, href: "/peminjaman", external: false },
    { key: "ejournal", icon: BookMarked, href: "/layanan", external: false },
  ] as const;
}

export async function ServicesSection() {
  const t = await getTranslations("Home");
  const services = buildServices();

  return (
    <section className="bg-slate-50 py-12 md:py-16">
      <Container>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-medium tracking-wide text-royal-600 uppercase">
              {t("servicesEyebrow")}
            </span>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              {t("servicesTitle")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">{t("servicesDescription")}</p>
          </div>
          <Link
            href="/layanan"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-royal-600 transition-colors hover:text-royal-700"
          >
            {t("viewAll")}
            <ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => {
            const title = t(`service.${service.key}.title`);
            const description = t(`service.${service.key}.description`);
            const cardContent = (
              <>
                <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-royal-50 text-royal-600 transition-colors group-hover:bg-royal-100">
                  <service.icon aria-hidden className="size-5" strokeWidth={1.5} />
                </span>
                <div className="mt-4 flex-1">
                  <h3 className="font-display text-base font-semibold leading-snug text-slate-900">
                    {title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{description}</p>
                </div>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-royal-600 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
                  {t("serviceCta")}
                  {service.external ? (
                    <ArrowRight aria-hidden className="size-3 -rotate-45 rtl:scale-x-[-1]" strokeWidth={1.5} />
                  ) : (
                    <ArrowRight aria-hidden className="size-3 rtl:rotate-180" strokeWidth={1.5} />
                  )}
                </span>
              </>
            );
            const cardClass =
              "group flex flex-col rounded-xl border border-t-4 border-slate-200 border-t-royal-500 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-royal-200 hover:border-t-royal-500 hover:shadow-md";

            return service.external ? (
              <a
                key={service.key}
                href={service.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cardClass}
              >
                {cardContent}
              </a>
            ) : (
              <Link key={service.key} href={service.href} className={cardClass}>
                {cardContent}
              </Link>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
