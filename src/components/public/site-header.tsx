import { getTranslations } from "next-intl/server";

import { BrandMark } from "@/components/public/brand-mark";
import { DesktopNav } from "@/components/public/desktop-nav";
import { LanguageSwitcher } from "@/components/public/language-switcher";
import { MobileNav } from "@/components/public/mobile-nav";
import { contentNav, primaryNav, utilityLinks } from "@/components/public/nav-items";
import { StickyHeader } from "@/components/public/shell/sticky-header";
import { UtilityLink } from "@/components/public/shell/utility-link";
import { Container } from "@/components/ui/container";

/**
 * Single unified header per user feedback: logo, primary navigation, campus
 * system links, and language dropdown all in one bar. The previous three-layer
 * shell (content bar + utility topbar + main header) is removed.
 */
export async function SiteHeader() {
  const t = await getTranslations("Nav");
  const externalHint = t("externalLinkHint");

  return (
    <StickyHeader>
      <div className="h-[72px] border-b border-slate-200 bg-white">
        <Container className="h-full">
          <div className="flex h-full items-center justify-between gap-4">
            <BrandMark className="shrink-0" />
            <DesktopNav primary={primaryNav} />
            <div className="hidden shrink-0 items-center gap-1 lg:flex">
              <nav aria-label={t("utilityLabel")} className="flex items-center gap-1">
                {utilityLinks.map((item) => (
                  <UtilityLink
                    key={item.key}
                    url={item.url}
                    label={t(item.key)}
                    externalHint={externalHint}
                    className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-royal-700"
                  />
                ))}
              </nav>
              <LanguageSwitcher tone="light" />
            </div>
            <MobileNav
              primary={primaryNav}
              content={contentNav}
              utility={utilityLinks}
              externalHint={externalHint}
            />
          </div>
        </Container>
      </div>
    </StickyHeader>
  );
}
