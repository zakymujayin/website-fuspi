import { ArrowRight, BookOpenText, CalendarCheck2, MessageSquareWarning, MonitorCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/public/reveal";
import { Link } from "@/i18n/navigation";

type ServiceCard = {
  key: "sila" | "complaints" | "booking" | "ejournal";
  icon: typeof MonitorCheck;
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
      icon: MonitorCheck,
      href: silaUrl && silaUrl.length > 0 ? silaUrl : "/layanan",
      external: Boolean(silaUrl && silaUrl.length > 0),
    },
    { key: "complaints", icon: MessageSquareWarning, href: "/pengaduan", external: false },
    { key: "booking", icon: CalendarCheck2, href: "/peminjaman", external: false },
    { key: "ejournal", icon: BookOpenText, href: "/layanan", external: false },
  ] as const;
}

export async function ServicesSection() {
  const t = await getTranslations("Home");
  const services = buildServices();

  return (
    <section className="relative overflow-hidden border-t border-slate-200 bg-gradient-to-b from-royal-50 to-royal-100/60 pt-10 pb-16 md:pt-14 md:pb-20">
      {/* Soft glow, not a shape: fades to nothing at its own edges, tucked
          into the top-right corner away from the card grid. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 55% 65% at 88% 5%, rgba(65,105,225,0.14), transparent 60%)",
        }}
      />

      <Container className="relative">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="section-rule font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
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

        {/* One panel split into four, not four repeated tiles: a single
            shape reads as a directory/toolbar rather than a stack of
            generic feature cards. The fill runs royal to navy across the
            panel (both already-locked identity colors) instead of one flat
            blue, so it isn't just "white on blue" end to end. */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-royal-600 via-royal-900 to-navy-950">
          <div className="grid divide-y divide-white/10 sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
            {services.map((service, index) => {
              const title = t(`service.${service.key}.title`);
              const description = t(`service.${service.key}.description`);
              const content = (
                <div className="group flex h-full flex-col gap-4 p-6 transition-colors duration-200 hover:bg-white/5 md:p-7">
                  <service.icon aria-hidden className="size-6 text-brass-400" strokeWidth={1.5} />
                  <div className="flex-1">
                    <h3 className="font-display text-base font-semibold text-white md:text-lg">{title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-300 md:text-sm">{description}</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/70 transition-colors duration-200 group-hover:text-white">
                    {t("serviceCta")}
                    <ArrowRight
                      aria-hidden
                      className="size-3.5 transition-transform duration-200 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180"
                      strokeWidth={1.5}
                    />
                  </span>
                </div>
              );

              return (
                <Reveal key={service.key} index={index}>
                  {service.external ? (
                    <a href={service.href} target="_blank" rel="noopener noreferrer" className="block h-full">
                      {content}
                    </a>
                  ) : (
                    <Link href={service.href} className="block h-full">
                      {content}
                    </Link>
                  )}
                </Reveal>
              );
            })}
          </div>
        </div>
      </Container>

      {/* Echoes the hero's signature wave at a smaller scale, so the section
          flows into News below instead of cutting off on a flat hairline.
          Fill matches News's own starting background exactly, same formula
          as the hero-to-dean seam: the curve is the transition, not a gap.
          No accent line: a soft shadow under the curve instead. */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-12 w-full text-white drop-shadow-[0_-4px_12px_rgba(15,23,42,0.10)] md:h-16"
        viewBox="0 0 1440 100"
        preserveAspectRatio="none"
      >
        <path d="M0,50 C480,100 960,0 1440,50 L1440,100 L0,100 Z" fill="currentColor" />
      </svg>
    </section>
  );
}
