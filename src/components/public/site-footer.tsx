import { MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { BrandMark } from "@/components/public/brand-mark";
import { contentNav, quickLinks, studyProgramLinks, type ExternalLink, type NavLink } from "@/components/public/nav-items";
import { Container } from "@/components/ui/container";
import { institution } from "@/config/institution";
import { Link } from "@/i18n/navigation";

const CURRENT_YEAR = 2026;
const CAMPUS_ADDRESS =
  "Kampus 2 — Jl. Syekh Nawawi Al-Bantani, Kp. Andamui, Kec. Curug, Kota Serang, Banten 42171";
const MAP_EMBED_SRC = `https://www.google.com/maps?q=${encodeURIComponent(
  `${CAMPUS_ADDRESS} UIN Sultan Maulana Hasanuddin Banten`,
)}&output=embed`;
const MAP_LINK_HREF = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${CAMPUS_ADDRESS} UIN Sultan Maulana Hasanuddin Banten`,
)}`;

function ColumnTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="section-rule mb-4 font-display text-sm font-medium text-white [&::after]:w-8">
      {children}
    </h2>
  );
}

/** `py-1` lifts each footer link past the WCAG 2.5.8 minimum target height. */
const LINK_CLASS =
  "inline-flex py-1 text-sm text-slate-400 transition-colors hover:text-white";

/**
 * `slate-400` not `slate-500`: at 13px on navy-900 the darker step lands at
 * 3.29:1 and fails WCAG AA (axe color-contrast).
 */
const LEGAL_LINK_CLASS =
  "inline-flex min-h-11 items-center text-[13px] text-slate-400 transition-colors hover:text-white";

function isExternalLink(item: NavLink | ExternalLink): item is ExternalLink {
  return "url" in item;
}

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  const tNav = await getTranslations("Nav");
  const externalHint = tNav("externalLinkHint");

  return (
    <footer className="border-t border-white/10 bg-navy-950 pt-16 text-slate-300">
      <Container>
        <div className="grid gap-8 pb-12 sm:grid-cols-2 lg:grid-cols-6">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <BrandMark tone="dark" showLabel={false} />
            <address className="text-sm leading-relaxed text-slate-400 not-italic">
              <p className="font-medium text-slate-200">{institution.name}</p>
              <p>{institution.university}</p>
              <p className="mt-1">{CAMPUS_ADDRESS}</p>
            </address>
            <div className="overflow-hidden rounded-lg border border-navy-800">
              <iframe
                src={MAP_EMBED_SRC}
                title={t("mapTitle")}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-56 w-full grayscale-[55%] contrast-[1.1]"
                style={{border: 0}}
              />
            </div>
            <a
              href={MAP_LINK_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
            >
              <MapPin aria-hidden className="size-4" strokeWidth={1.5} />
              {t("openMap")}
            </a>
          </div>

          <nav aria-labelledby="footer-programs">
            <ColumnTitle>
              <span id="footer-programs">{tNav("studyPrograms")}</span>
            </ColumnTitle>
            <ul className="flex flex-col gap-2">
              {studyProgramLinks.map((program) => (
                <li key={program.key}>
                  <Link href={program.href} className={LINK_CLASS}>
                    {tNav(program.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-content">
            <ColumnTitle>
              <span id="footer-content">{tNav("contentLabel")}</span>
            </ColumnTitle>
            <ul className="flex flex-col gap-2">
              {contentNav.map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className={LINK_CLASS}>
                    {tNav(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-quick">
            <ColumnTitle>
              <span id="footer-quick">{t("quickLinks")}</span>
            </ColumnTitle>
            <ul className="flex flex-col gap-2">
              {quickLinks.map((item) => (
                <li key={item.key}>
                  {isExternalLink(item) ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={LINK_CLASS}
                    >
                      {tNav(item.key)}
                      <span className="sr-only">{externalHint}</span>
                    </a>
                  ) : (
                    <Link href={item.href} className={LINK_CLASS}>
                      {tNav(item.key)}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <ColumnTitle>{t("contact")}</ColumnTitle>
            <p className="prose-measure text-sm text-slate-400">{t("contactHint")}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-navy-800 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-slate-400">
            © {CURRENT_YEAR} {institution.name}
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <nav aria-label="Sosial media" className="flex items-center gap-3">
              <a
                href="https://www.youtube.com/@humasuinbanten1673"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 transition-colors hover:text-white"
              >
                <span className="sr-only">YouTube UIN Banten</span>
                <svg aria-hidden className="size-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/uinbanten"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 transition-colors hover:text-white"
              >
                <span className="sr-only">Instagram</span>
                <svg aria-hidden className="size-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                </svg>
              </a>
            </nav>
            <nav aria-label={t("legalLabel")} className="flex flex-wrap items-center gap-4">
              <Link href="/privasi" className={LEGAL_LINK_CLASS}>
                {t("privacy")}
              </Link>
              <Link href="/aksesibilitas" className={LEGAL_LINK_CLASS}>
                {t("accessibility")}
              </Link>
              <Link href="/sitemap" className={LEGAL_LINK_CLASS}>
                {t("sitemap")}
              </Link>
            </nav>
          </div>
        </div>
      </Container>
    </footer>
  );
}
