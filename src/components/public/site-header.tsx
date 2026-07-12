import { getTranslations } from "next-intl/server";

import { BrandMark } from "@/components/public/brand-mark";
import { DesktopNav } from "@/components/public/desktop-nav";
import { LanguageSwitcher } from "@/components/public/language-switcher";
import { MobileNav } from "@/components/public/mobile-nav";
import { contentNav, primaryNav, utilityLinks } from "@/components/public/nav-items";
import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";

/** Three layers per docs/17-B: content bar, utility topbar, main header. */
export async function SiteHeader() {
  const t = await getTranslations("Nav");

  return (
    <header className="w-full">
      <div className="hidden border-b border-slate-200 bg-slate-100 md:block">
        <Container>
          <nav aria-label={t("contentLabel")} className="flex h-9 items-center gap-5">
            {contentNav.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="text-[13px] text-slate-600 transition-colors hover:text-royal-600"
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>
        </Container>
      </div>

      <div className="hidden bg-navy-900 md:block">
        <Container>
          <div className="flex h-9 items-center justify-end gap-4">
            <nav aria-label={t("utilityLabel")} className="flex items-center gap-4">
              {utilityLinks.map((item) => (
                <a
                  key={item.key}
                  href={item.url}
                  className="text-xs text-slate-300 transition-colors hover:text-white"
                >
                  {t(item.key)}
                </a>
              ))}
            </nav>
            <LanguageSwitcher tone="dark" />
          </div>
        </Container>
      </div>

      <div className="border-b border-slate-200 bg-white">
        <Container>
          <div className="flex h-[76px] items-center justify-between gap-4">
            <BrandMark />
            <DesktopNav primary={primaryNav} />
            <MobileNav primary={primaryNav} content={contentNav} utility={utilityLinks} />
          </div>
        </Container>
      </div>
    </header>
  );
}
