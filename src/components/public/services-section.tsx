import { ArrowRight, ArrowUpRight, BookOpen, DoorOpen, FileText, Headset } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/public/reveal";
import { Link } from "@/i18n/navigation";

type ServiceCard = {
  key: "sila" | "ejournal" | "booking" | "complaints";
  icon: typeof FileText;
  href: string;
  external: boolean;
  /** Full utility strings per accent so Tailwind keeps them (no dynamic class names). */
  accent: { chip: string; rule: string; hoverBorder: string; hoverArrow: string };
};

const ACCENTS = {
  royal: {
    chip: "bg-royal-50 text-royal-600",
    rule: "bg-royal-500",
    hoverBorder: "group-hover:border-royal-300",
    hoverArrow: "group-hover:text-royal-500",
  },
  brass: {
    chip: "bg-brass-400/15 text-brass-600",
    rule: "bg-brass-500",
    hoverBorder: "group-hover:border-brass-400",
    hoverArrow: "group-hover:text-brass-600",
  },
  teal: {
    chip: "bg-emerald-50 text-emerald-600",
    rule: "bg-emerald-500",
    hoverBorder: "group-hover:border-emerald-300",
    hoverArrow: "group-hover:text-emerald-600",
  },
  navy: {
    chip: "bg-navy-900/10 text-navy-900",
    rule: "bg-navy-900",
    hoverBorder: "group-hover:border-navy-800/40",
    hoverArrow: "group-hover:text-navy-900",
  },
} as const;

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
      icon: FileText,
      href: silaUrl && silaUrl.length > 0 ? silaUrl : "/layanan",
      external: Boolean(silaUrl && silaUrl.length > 0),
      accent: ACCENTS.royal,
    },
    { key: "ejournal", icon: BookOpen, href: "/layanan", external: false, accent: ACCENTS.brass },
    { key: "booking", icon: DoorOpen, href: "/peminjaman", external: false, accent: ACCENTS.teal },
    { key: "complaints", icon: Headset, href: "/pengaduan", external: false, accent: ACCENTS.navy },
  ] as const;
}

export async function ServicesSection() {
  const t = await getTranslations("Home");
  const services = buildServices();

  return (
    <section className="bg-slate-50 py-14 md:py-20">
      <Container>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-medium tracking-wide text-royal-600 uppercase">{t("servicesEyebrow")}</span>
            <h2 className="section-rule mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
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

        <div className="grid gap-4 sm:grid-cols-2 md:gap-5">
          {services.map((service, index) => {
            const title = t(`service.${service.key}.title`);
            const description = t(`service.${service.key}.description`);
            const content = (
              <div
                className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md md:p-8 ${service.accent.hoverBorder}`}
              >
                <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${service.accent.rule}`} />
                <div className="flex items-start justify-between">
                  <span className={`flex size-14 items-center justify-center rounded-2xl ${service.accent.chip}`}>
                    <service.icon aria-hidden className="size-7" strokeWidth={1.75} />
                  </span>
                  <ArrowUpRight
                    aria-hidden
                    className={`size-5 text-slate-300 transition-all duration-200 group-hover:-translate-y-0.5 rtl:-scale-x-100 ${service.accent.hoverArrow}`}
                    strokeWidth={1.75}
                  />
                </div>
                <h3 className="mt-6 font-display text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
                <span className="sr-only">{t("serviceCta")}</span>
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
      </Container>
    </section>
  );
}
