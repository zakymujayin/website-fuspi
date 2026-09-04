import {ArrowRight, ArrowUpRight} from "lucide-react";
import {getTranslations} from "next-intl/server";

import {Reveal} from "@/components/public/reveal";
import {Container} from "@/components/ui/container";
import {Link} from "@/i18n/navigation";

const E_LAYANAN_URL = "https://fuspi.uinbanten.ac.id/e-layanan";
const services = [
  {key: "sila", href: E_LAYANAN_URL, external: true},
  {key: "ejournal", href: E_LAYANAN_URL, external: true},
  {key: "booking", href: "/peminjaman", external: false},
  {key: "complaints", href: "/pengaduan", external: false},
] as const;

export async function ServicesSection() {
  const t = await getTranslations("Home");
  const [featured, ...secondary] = services;

  return (
    <section className="bg-white py-16 md:py-24">
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
            <Reveal>
              <div className="grid gap-8 md:grid-cols-2">
                <a href={featured.href} target="_blank" rel="noopener noreferrer" className="group flex flex-col justify-between rounded-md bg-royal-500 p-7 text-white transition-colors duration-200 hover:bg-royal-600 md:p-8">
                  <span className="flex items-start justify-between gap-6">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white">{t("servicesEyebrow")}</span>
                    <ArrowUpRight aria-hidden className="size-5" strokeWidth={1.5} />
                  </span>
                  <span>
                    <span className="mt-10 block text-2xl font-bold leading-tight text-white md:text-3xl">{t(`service.${featured.key}.title`)}</span>
                    <span className="mt-3 block max-w-xl text-sm leading-6 text-white md:text-[15px]">{t(`service.${featured.key}.description`)}</span>
                  </span>
                </a>
                <div className="flex flex-col justify-center border-t border-slate-300">
                  {secondary.map((service) => {
                    const content = (
                      <>
                        <span>
                          <span className="block text-lg font-bold leading-snug text-slate-900">{t(`service.${service.key}.title`)}</span>
                          <span className="mt-1.5 block max-w-xl text-sm leading-6 text-slate-600">{t(`service.${service.key}.description`)}</span>
                        </span>
                        {service.external ? <ArrowUpRight aria-hidden className="size-4 shrink-0" strokeWidth={1.5} /> : <ArrowRight aria-hidden className="size-4 shrink-0 rtl:rotate-180" strokeWidth={1.5} />}
                      </>
                    );
                    const className = "group grid grid-cols-[1fr_auto] items-center gap-4 border-b border-slate-300 py-5 transition-colors duration-200 hover:text-royal-600";
                    return service.external ? (
                      <a key={service.key} href={service.href} target="_blank" rel="noopener noreferrer" className={className}>{content}</a>
                    ) : (
                      <Link key={service.key} href={service.href} className={className}>{content}</Link>
                    );
                  })}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
