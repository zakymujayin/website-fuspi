import { getTranslations } from "next-intl/server";

import { BrandMark } from "@/components/public/brand-mark";
import { DesktopNav } from "@/components/public/desktop-nav";
import { LanguageSwitcher } from "@/components/public/language-switcher";
import { MobileNav } from "@/components/public/mobile-nav";
import { contentNav, primaryNav, utilityLinks } from "@/components/public/nav-items";
import { StickyHeader } from "@/components/public/shell/sticky-header";
import { UtilityLink } from "@/components/public/shell/utility-link";
import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";

/**
 * Three layers per docs/17-B: content bar, utility topbar, main header. The bar
 * heights are load-bearing — `StickyHeader` compacts by translating exactly
 * 36 + 36 + 16px, so these rows must never grow or wrap.
 */
export async function SiteHeader() {
  const t = await getTranslations("Nav");
  const externalHint = t("externalLinkHint");

  return (
    <StickyHeader>
      {/* The height sits on the bordered wrapper, not on the row inside it:
          border-box then keeps each bar at exactly 36px including its rule. */}
      <div className="hidden h-9 border-b border-slate-200 bg-slate-100 md:block">
        <Container className="h-full">
          {/* overflow-x-auto keeps an unusually long locale inside the bar
              instead of widening the page (docs/17-M). */}
          <nav
            aria-label={t("contentLabel")}
            className="flex h-full items-center gap-5 overflow-x-auto"
          >
            {contentNav.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="shrink-0 text-[13px] whitespace-nowrap text-slate-600 transition-colors hover:text-royal-600"
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>
        </Container>
      </div>

      <div className="hidden h-9 bg-navy-900 md:block">
        <Container className="h-full">
          <div className="flex h-full items-center justify-end gap-4 overflow-x-auto">
            <nav
              aria-label={t("utilityLabel")}
              className="flex shrink-0 items-center gap-4"
            >
              {utilityLinks.map((item) => (
                <UtilityLink
                  key={item.key}
                  url={item.url}
                  label={t(item.key)}
                  externalHint={externalHint}
                  className="text-xs whitespace-nowrap text-slate-300 transition-colors hover:text-white"
                />
              ))}
            </nav>
            <LanguageSwitcher tone="dark" />
          </div>
        </Container>
      </div>

      <div className="h-[76px] border-b border-slate-200 bg-white">
        <Container className="h-full">
          {/* The inner nudge re-centres the row inside the 60px pinned band the
              compact transform leaves visible. */}
          <div className="flex h-full items-center justify-between gap-3 transition-[translate] duration-200 ease-out group-data-[compact=true]:translate-y-2 motion-reduce:transition-none">
            <BrandMark />
            <DesktopNav primary={primaryNav} />
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
