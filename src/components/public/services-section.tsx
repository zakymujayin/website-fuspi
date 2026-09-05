import {ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Files, MessageSquare} from "lucide-react";
import {getTranslations} from "next-intl/server";

import {Reveal} from "@/components/public/reveal";
import {Container} from "@/components/ui/container";
import {Link} from "@/i18n/navigation";
import styles from "./home-design.module.css";
import {HomeSectionHeading} from "./home-section-heading";
import {HomeSectionLink} from "./home-section-link";

const E_LAYANAN_URL = "https://fuspi.uinbanten.ac.id/e-layanan";
const services = [
  {key: "sila", href: E_LAYANAN_URL, external: true, icon: Files},
  {key: "ejournal", href: E_LAYANAN_URL, external: true, icon: BookOpen},
  {key: "booking", href: "/peminjaman", external: false, icon: CalendarDays},
  {key: "complaints", href: "/pengaduan", external: false, icon: MessageSquare},
] as const;

/**
 * Service directory. The row architecture is unchanged; depth comes from the
 * lifted index surface, the featured first entry, the framed icons and a full
 * Royal Blue fill on hover/focus — not from a card grid.
 */
export async function ServicesSection() {
  const t = await getTranslations("Home");
  const tNav = await getTranslations("Nav");

  return (
    <section className={`${styles.section} ${styles.services}`}>
      <Container>
        <HomeSectionHeading
          eyebrow={t("servicesEyebrow")}
          title={t("servicesTitle")}
          description={t("servicesDescription")}
          accent
          action={<HomeSectionLink href="/layanan">{t("serviceCta")}</HomeSectionLink>}
        />
        <div className={styles.serviceIndex}>
          {services.map((service, index) => {
            const className = `${styles.service} ${index === 0 ? styles.serviceFeatured : ""} group`;
            const content = (
              <>
                <span aria-hidden className={styles.serviceIcon}>
                  <service.icon className={index === 0 ? "size-7" : "size-6"} strokeWidth={1.5} />
                </span>
                <span className="block">
                  <span className={styles.serviceTitle}>{t(`service.${service.key}.title`)}</span>
                  <span className={styles.serviceDescription}>{t(`service.${service.key}.description`)}</span>
                </span>
                {service.external
                  ? <ArrowUpRight aria-hidden className={`${styles.serviceArrow} size-5 shrink-0`} strokeWidth={1.75} />
                  : <ArrowRight aria-hidden className={`${styles.serviceArrow} size-5 shrink-0 rtl:rotate-180`} strokeWidth={1.75} />}
              </>
            );
            return (
              <Reveal key={service.key} index={index} className="!block !h-auto">
                {service.external ? (
                  <a href={service.href} target="_blank" rel="noopener noreferrer" className={className}>
                    {content}<span className="sr-only">{tNav("externalLinkHint")}</span>
                  </a>
                ) : (
                  <Link href={service.href} className={className}>{content}</Link>
                )}
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
