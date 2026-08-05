import { BrandMark } from "@/components/public/brand-mark";
import { DesktopNav } from "@/components/public/desktop-nav";
import { MobileNav } from "@/components/public/mobile-nav";
import { contentNav, primaryNav, utilityLinks } from "@/components/public/nav-items";
import { StickyHeader } from "@/components/public/shell/sticky-header";
import { TopBar } from "@/components/public/top-bar";
import { Container } from "@/components/ui/container";
import { getTranslations } from "next-intl/server";

/**
 * Two-tier header matching the reference pattern: a compact navy top bar for
 * utility systems (PMB, SIAKAD, E-Learning, GKM) and language switching, plus
 * a clean white main bar for the primary navigation.
 */
export async function SiteHeader() {
  const t = await getTranslations("Nav");
  const externalHint = t("externalLinkHint");

  return (
    <StickyHeader>
      <TopBar />
      <div className="h-[72px] border-b border-slate-200 bg-white">
        <Container className="h-full">
          <div className="flex h-full items-center justify-between gap-4">
            <BrandMark className="shrink-0" />
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
