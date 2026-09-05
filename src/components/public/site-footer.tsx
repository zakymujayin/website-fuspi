import {ArrowUpRight, Facebook, Instagram, MapPin, Youtube} from "lucide-react";
import {getTranslations} from "next-intl/server";

import {BrandMark} from "@/components/public/brand-mark";
import {contentNav, quickLinks, studyProgramLinks, type ExternalLink, type NavLink} from "@/components/public/nav-items";
import {Container} from "@/components/ui/container";
import {institution} from "@/config/institution";
import {Link} from "@/i18n/navigation";
import styles from "./home-design.module.css";
import {Reveal} from "./reveal";

const CAMPUS_ADDRESS = "Kampus 2 — Jl. Syekh Nawawi Al-Bantani, Kp. Andamui, Kec. Curug, Kota Serang, Banten 42171";
const MAP_LINK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${CAMPUS_ADDRESS} UIN Sultan Maulana Hasanuddin Banten`)}`;
const MAP_EMBED = `https://www.google.com/maps?q=${encodeURIComponent(`${CAMPUS_ADDRESS} UIN Sultan Maulana Hasanuddin Banten`)}&output=embed`;
const LINK_CLASS = "inline-flex min-h-11 items-center py-1 text-sm leading-5 text-slate-200 transition-colors hover:text-white";

function isExternal(item: NavLink | ExternalLink): item is ExternalLink {
  return "url" in item;
}

function FooterNav({title, children, compact = false}: {title: string; children: React.ReactNode; compact?: boolean}) {
  return (
    <nav aria-label={title}>
      <h2>{title}</h2>
      <ul className={compact ? styles.footerQuickLinks : undefined}>{children}</ul>
    </nav>
  );
}

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  const tNav = await getTranslations("Nav");
  const externalHint = tNav("externalLinkHint");

  return (
    <footer className={styles.footer}>
      <Container>
        <Reveal variant="fade" className="!block">
        <div className={styles.footerGrid}>
          <div className={styles.footerIdentity}>
            <div className="flex items-center gap-4">
              <BrandMark tone="dark" showLabel={false} className="shrink-0 bg-transparent" />
              <p className="max-w-xs text-lg font-semibold leading-snug text-white">{institution.name}</p>
            </div>
            <address className="mt-3 max-w-sm text-sm leading-6 text-slate-200 not-italic">
              <span className="mb-1 block font-medium text-white">{institution.university}</span>{CAMPUS_ADDRESS}
            </address>
            <a href="mailto:fuspi@uinbanten.ac.id" className={LINK_CLASS}>fuspi@uinbanten.ac.id</a>
            <nav aria-label="Sosial media" className="flex gap-1">
              {[
                {href: "https://www.youtube.com/@humasuinbanten1673", label: "YouTube UIN Banten", icon: Youtube},
                {href: "https://www.instagram.com/uinbanten", label: "Instagram UIN Banten", icon: Instagram},
                {href: "https://www.facebook.com/uinbanten", label: "Facebook UIN Banten", icon: Facebook},
              ].map((social) => (
                <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer" className="grid size-11 place-items-center rounded-md text-slate-200 transition-colors hover:bg-navy-800 hover:text-white">
                  <span className="sr-only">{social.label} {externalHint}</span><social.icon aria-hidden className="size-5" />
                </a>
              ))}
            </nav>
          </div>
          <div className={styles.footerNavigation}>
          <FooterNav title={t("quickLinks")} compact>
            {quickLinks.map((item) => (
              <li key={item.key}>
                {isExternal(item) ? (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>{tNav(item.key)}<span className="sr-only">{externalHint}</span></a>
                ) : <Link href={item.href} className={LINK_CLASS}>{tNav(item.key)}</Link>}
              </li>
            ))}
          </FooterNav>
          <FooterNav title={tNav("studyPrograms")}>
            {studyProgramLinks.map((item) => <li key={item.key}><Link href={item.href} className={LINK_CLASS}>{tNav(item.key)}</Link></li>)}
          </FooterNav>
          <nav aria-label={tNav("contentLabel")} className={styles.footerChannels}>
            <h2 className="sr-only">{tNav("contentLabel")}</h2>
            <ul className="flex flex-wrap gap-x-4">
              {contentNav.map((item) => <li key={item.key}><Link href={item.href} className={LINK_CLASS}>{tNav(item.key)}</Link></li>)}
            </ul>
          </nav>
          </div>
          <div className={styles.footerLocation}>
            <h2>{t("openMap")}</h2>
            <div className="overflow-hidden rounded-md border border-slate-600 bg-navy-900">
              <iframe src={MAP_EMBED} title={`${t("openMap")} — ${institution.name}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-40 w-full border-0 bg-slate-200" />
              <a href={MAP_LINK} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-between gap-2 px-3 py-3 text-sm font-semibold text-white">
                <MapPin aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
                <span>{t("openMap")}<span className="sr-only"> {externalHint}</span></span>
                <ArrowUpRight aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
              </a>
            </div>
          </div>
        </div>
        </Reveal>
        <div className="flex flex-col gap-2 border-t border-slate-600 py-4 text-sm text-slate-200 md:flex-row md:items-center md:justify-between md:gap-6">
          <p className="text-center md:text-start">© {new Date().getFullYear()} {institution.name}</p>
          <nav aria-label={t("legalLabel")} className="flex flex-wrap justify-center gap-x-5 md:justify-end">
            <Link href="/privasi" className={LINK_CLASS}>{t("privacy")}</Link>
            <Link href="/aksesibilitas" className={LINK_CLASS}>{t("accessibility")}</Link>
            <Link href="/sitemap" className={LINK_CLASS}>{t("sitemap")}</Link>
          </nav>
        </div>
      </Container>
    </footer>
  );
}
