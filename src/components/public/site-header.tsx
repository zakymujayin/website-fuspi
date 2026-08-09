import { DesktopNav } from "@/components/public/desktop-nav";
import { IdentityBadges } from "@/components/public/identity-badges";
import { MobileNav } from "@/components/public/mobile-nav";
import { contentNav, pmbLink, ppidLink, primaryNav, utilityLinks } from "@/components/public/nav-items";
import { HeaderSearch } from "@/components/public/shell/header-search";
import { StickyHeader } from "@/components/public/shell/sticky-header";
import { UtilityLink } from "@/components/public/shell/utility-link";
import { TopBar } from "@/components/public/top-bar";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

/**
 * Two-tier header matching the reference pattern: a compact navy top bar for
 * utility systems (SIAKAD, E-Learning, GKM) and language switching, plus a
 * clean white main bar for primary navigation and the PPID/PMB entry points.
 * "Layanan" is not a header entry point — it has its own homepage section.
 */
export async function SiteHeader() {
  const t = await getTranslations("Nav");
  const externalHint = t("externalLinkHint");
  const restNav = primaryNav.filter((item) => item.key !== "services");

  return (
    <StickyHeader>
      <TopBar />
      <div className="h-24 border-b border-slate-200 bg-white">
        {/* Wider than the shared 1200px content container: the nav row needs
            more room for 8 top-level items plus search/PPID/PMB than a page's
            reading column does. */}
        <div className="mx-auto h-full w-full max-w-[1440px] px-4 sm:px-6">
          <div className="flex h-full items-center justify-between gap-3">
            <IdentityBadges />
            <DesktopNav primary={restNav} />
            <div className="hidden shrink-0 items-center gap-1 lg:flex">
              <HeaderSearch />
              <Link
                href={ppidLink.href}
                className="inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-lg border border-brass-500 px-3 text-[13px] font-semibold text-[#7d5621] transition-colors hover:bg-brass-500/10 xl:px-4 xl:text-sm"
              >
                {t(ppidLink.key)}
              </Link>
              <UtilityLink
                url={pmbLink.url}
                label={t(pmbLink.key)}
                externalHint={externalHint}
                showIcon={false}
                className="h-10 shrink-0 whitespace-nowrap rounded-lg bg-royal-500 px-3 text-[13px] font-medium text-white transition-colors hover:bg-royal-600 xl:px-4 xl:text-sm"
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
