import { DesktopNav } from "@/components/public/desktop-nav";
import { IdentityBadges } from "@/components/public/identity-badges";
import { MobileNav } from "@/components/public/mobile-nav";
import { contentNav, pmbLink, ppidLink, primaryNav, utilityLinks } from "@/components/public/nav-items";
import { HeaderSearch } from "@/components/public/shell/header-search";
import { StickyHeader } from "@/components/public/shell/sticky-header";
import { UtilityLink } from "@/components/public/shell/utility-link";
import { TopBar } from "@/components/public/top-bar";
import {getPublicSiteSetting} from "@/features/home-nav/public-query";
import {getPrismaClient} from "@/lib/db/client";
import {getLocale, getTranslations} from "next-intl/server";

/**
 * Two-tier header matching the reference pattern: a compact navy top bar for
 * utility systems (SIAKAD, E-Learning, GKM) and language switching, plus a
 * clean white main bar for primary navigation and the PPID/PMB entry points.
 * Academic resources stay in one dropdown so the header does not duplicate
 * homepage shortcuts or scatter documents across unrelated menus.
 */
export async function SiteHeader() {
  const locale = await getLocale();
  const t = await getTranslations("Nav");
  const externalHint = t("externalLinkHint");
  const appLocale = locale === "en" || locale === "ar" ? locale : "id";
  const siteSetting = await getPublicSiteSetting(
    getPrismaClient(),
    appLocale,
    process.env.UPLOAD_PUBLIC_URL ?? "/uploads",
  );

  return (
    <StickyHeader>
      <TopBar />
      <div className="h-[76px] border-b border-slate-200 bg-white">
        {/* Wider than the shared 1280px content container: the nav row needs
            more room for the top-level items plus search/PPID/PMB than a page's
            reading column does. */}
        <div className="mx-auto h-full w-full max-w-[1440px] px-4 sm:px-6">
          <div className="flex h-full items-center justify-between gap-3">
            <div className="shrink-0">
              <IdentityBadges
                logo={siteSetting?.logo ?? null}
                accreditationLogo={siteSetting?.accreditationLogo ?? null}
                bluLogo={siteSetting?.bluLogo ?? null}
              />
            </div>
            <DesktopNav primary={primaryNav} />
            <div className="hidden shrink-0 items-center gap-1 xl:flex">
              <HeaderSearch />
              <UtilityLink
                url={ppidLink.url}
                label={t(ppidLink.key)}
                externalHint={externalHint}
                showIcon={false}
                className="h-10 shrink-0 whitespace-nowrap rounded-md border border-brass-500 px-3 text-[13px] font-semibold text-[#704b1b] transition-colors hover:bg-brass-500/10 xl:px-4 xl:text-sm"
              />
              <UtilityLink
                url={pmbLink.url}
                label={t(pmbLink.key)}
                externalHint={externalHint}
                showIcon={false}
                className="h-10 shrink-0 whitespace-nowrap rounded-md bg-royal-700 px-3 text-[13px] font-semibold text-white transition-colors hover:bg-royal-800 xl:px-4 xl:text-sm"
              />
            </div>
            <MobileNav
              primary={primaryNav}
              content={contentNav}
              utility={utilityLinks}
              actions={[ppidLink, pmbLink]}
              externalHint={externalHint}
            />
          </div>
        </div>
      </div>
    </StickyHeader>
  );
}
