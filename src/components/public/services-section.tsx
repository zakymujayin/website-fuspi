import {ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Files, MessageSquare} from "lucide-react";
import {getTranslations} from "next-intl/server";

import {Reveal} from "@/components/public/reveal";
import {Container} from "@/components/ui/container";
import {Link} from "@/i18n/navigation";
import styles from "./home-design.module.css";

const E_LAYANAN_URL = "https://fuspi.uinbanten.ac.id/e-layanan";
const services = [
  {key: "sila", href: E_LAYANAN_URL, external: true, icon: Files},
  {key: "ejournal", href: E_LAYANAN_URL, external: true, icon: BookOpen},
  {key: "booking", href: "/peminjaman", external: false, icon: CalendarDays},
  {key: "complaints", href: "/pengaduan", external: false, icon: MessageSquare},
] as const;

export async function ServicesSection() {
  const t = await getTranslations("Home");
  const tNav = await getTranslations("Nav");

  return (
    <section className={`${styles.section} border-y border-slate-200 bg-slate-100`}>
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <h2 className="text-[28px] font-bold tracking-[-0.01em] text-slate-900 md:text-[34px]">{t("servicesTitle")}</h2>
            <p className="mt-4 max-w-sm text-base leading-7 text-slate-600">{t("servicesDescription")}</p>
            <Link href="/layanan" className="mt-7 inline-flex min-h-11 items-center gap-2 border-b border-royal-500 text-sm font-semibold text-royal-700 transition-colors hover:text-royal-500">
              {t("viewAll")}<ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
            </Link>
          </div>
          <div className="lg:col-span-8">
            <Reveal className="w-full">
                <div className="w-full border-t-2 border-royal-500">
                  {services.map((service) => {
                    const content = (
                      <>
                        <service.icon aria-hidden className="size-6 text-royal-800" strokeWidth={1.5} />
                        <span>
                          <span className="block text-xl font-semibold leading-snug text-slate-900">{t(`service.${service.key}.title`)}</span>
                          <span className="mt-1.5 block max-w-xl text-base leading-6 text-slate-700">{t(`service.${service.key}.description`)}</span>
                        </span>
                        {service.external ? <ArrowUpRight aria-hidden className="size-4 shrink-0" strokeWidth={1.5} /> : <ArrowRight aria-hidden className="size-4 shrink-0 rtl:rotate-180" strokeWidth={1.5} />}
                      </>
                    );
                    const className = `${styles.service} group`;
                    return service.external ? (
                      <a key={service.key} href={service.href} target="_blank" rel="noopener noreferrer" className={className}>{content}<span className="sr-only">{tNav("externalLinkHint")}</span></a>
                    ) : (
                      <Link key={service.key} href={service.href} className={className}>{content}</Link>
                    );
                  })}
                </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
