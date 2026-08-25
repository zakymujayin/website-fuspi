import { ArrowRight, BookMarked, CalendarClock, LayoutDashboard, MessageSquareWarning } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/public/reveal";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type ServiceCard = {
  key: "sila" | "complaints" | "booking" | "ejournal";
  icon: typeof LayoutDashboard;
  href: string;
  external: boolean;
};

/**
 * A tonal family, not four unrelated hues: every card sits on the same
 * royal-50 field, the accent cycles within the two locked identity colors
 * (royal blue, brass gold). Brass keeps navy-900 text/icon — white on
 * brass-500 fails WCAG AA (2.45:1).
 */
const ACCENT = [
  { chip: "bg-gradient-to-br from-royal-500 to-royal-600 text-white", ring: "bg-royal-500" },
  { chip: "bg-gradient-to-br from-royal-700 to-royal-800 text-white", ring: "bg-royal-700" },
  { chip: "bg-gradient-to-br from-brass-400 to-brass-500 text-navy-900", ring: "bg-brass-500" },
  { chip: "bg-gradient-to-br from-navy-800 to-navy-900 text-white", ring: "bg-navy-900" },
] as const;

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
    <section className="border-t border-slate-200 bg-gradient-to-b from-white to-royal-50/30 py-10 md:py-14">
      <Container>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service, index) => {
            const accent = ACCENT[index % ACCENT.length];
            const title = t(`service.${service.key}.title`);
            const description = t(`service.${service.key}.description`);
            const cardContent = (
              <>
                {/* Directional cue, not decoration: the rule only appears on
                    hover/focus, pointing at "this is the active item." */}
                <span
                  aria-hidden
                  className={cn("absolute inset-x-0 top-0 h-1 origin-left scale-x-0 transition-transform duration-200 group-hover:scale-x-100", accent.ring)}
                />
                <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-lg", accent.chip)}>
                  <service.icon aria-hidden className="size-5" strokeWidth={1.5} />
                </span>
                <div className="mt-5 flex-1">
                  <h3 className="font-display text-base font-semibold leading-snug text-slate-900">
                    {title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{description}</p>
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
              "group relative flex w-full flex-1 flex-col overflow-hidden rounded-xl border border-royal-100 bg-royal-50 p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-royal-200 hover:shadow-md";

            return (
              <Reveal key={service.key} index={index}>
                {service.external ? (
                  <a href={service.href} target="_blank" rel="noopener noreferrer" className={cardClass}>
                    {cardContent}
                  </a>
                ) : (
                  <Link href={service.href} className={cardClass}>
                    {cardContent}
                  </Link>
                )}
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
