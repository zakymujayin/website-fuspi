import {ArrowUpRight, Facebook, Instagram, MapPin, Youtube} from "lucide-react";
import {getTranslations} from "next-intl/server";

import {BrandMark} from "@/components/public/brand-mark";
import {contentNav, quickLinks, studyProgramLinks, type ExternalLink, type NavLink} from "@/components/public/nav-items";
import {Container} from "@/components/ui/container";
import {institution} from "@/config/institution";
import {Link} from "@/i18n/navigation";

const CAMPUS_ADDRESS = "Kampus 2 — Jl. Syekh Nawawi Al-Bantani, Kp. Andamui, Kec. Curug, Kota Serang, Banten 42171";
const MAP_LINK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${CAMPUS_ADDRESS} UIN Sultan Maulana Hasanuddin Banten`)}`;
const LINK_CLASS = "inline-flex min-h-11 items-center text-sm text-white/65 transition-colors hover:text-white";

function isExternal(item: NavLink | ExternalLink): item is ExternalLink {
  return "url" in item;
}

function FooterNav({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <nav aria-label={title}>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">{title}</h2>
      <ul>{children}</ul>
    </nav>
  );
}

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  const tNav = await getTranslations("Nav");
  const externalHint = tNav("externalLinkHint");

  return (
    <footer className="bg-navy-950 text-white">
      <Container>
        <div className="grid gap-10 border-b border-white/15 py-14 lg:grid-cols-12 lg:items-end lg:py-20">
          <div className="lg:col-span-7">
            <BrandMark tone="dark" showLabel={false} className="bg-transparent" />
            <p className="mt-6 max-w-xl text-2xl font-bold leading-tight text-white md:text-[28px]">{institution.name}</p>
            <address className="mt-5 max-w-xl text-sm leading-6 text-white/60 not-italic">
              {institution.university}<br />{CAMPUS_ADDRESS}
            </address>
            <a href={MAP_LINK} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-royal-300 hover:text-white">
              <MapPin aria-hidden className="size-4" strokeWidth={1.5} />{t("openMap")}<ArrowUpRight aria-hidden className="size-4" strokeWidth={1.5} />
            </a>
          </div>
          <div className="lg:col-span-5 lg:text-end">
            <p className="text-lg font-semibold leading-7 text-white/90 md:text-xl md:leading-8">
              {t("slogan")}
            </p>
          </div>
        </div>

        <div className="grid gap-10 border-b border-white/15 py-12 sm:grid-cols-2 lg:grid-cols-3">
          <FooterNav title={t("quickLinks")}>
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
          <FooterNav title={tNav("contentLabel")}>
            {contentNav.map((item) => <li key={item.key}><Link href={item.href} className={LINK_CLASS}>{tNav(item.key)}</Link></li>)}
          </FooterNav>
        </div>

        <div className="grid gap-4 py-5 text-xs text-white/55 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <p className="text-center md:text-start">© {new Date().getFullYear()} {institution.name}</p>
          <nav aria-label="Sosial media" className="flex justify-center gap-2">
            {[
              {href: "https://www.youtube.com/@humasuinbanten1673", label: "YouTube UIN Banten", icon: Youtube},
              {href: "https://www.instagram.com/uinbanten", label: "Instagram UIN Banten", icon: Instagram},
              {href: "https://www.facebook.com/uinbanten", label: "Facebook UIN Banten", icon: Facebook},
            ].map((social) => (
              <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer" className="grid size-11 place-items-center text-white/60 transition-colors hover:bg-white/10 hover:text-white">
                <span className="sr-only">{social.label}</span><social.icon aria-hidden className="size-5" />
              </a>
            ))}
          </nav>
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
