import {ArrowRight, ArrowUpRight} from "lucide-react";
import {getTranslations} from "next-intl/server";

import {quickLinks, type ExternalLink, type NavLink} from "@/components/public/nav-items";
import {Container} from "@/components/ui/container";
import {Link} from "@/i18n/navigation";
import {cn} from "@/lib/utils";
import styles from "./home-design.module.css";

function isExternal(item: NavLink | ExternalLink): item is ExternalLink {
  return "url" in item;
}

export async function HomeQuickAccess() {
  const t = await getTranslations("Home");
  const tNav = await getTranslations("Nav");
  const items = quickLinks;

  return (
    <section aria-labelledby="quick-access-title" className={`${styles.section} border-b border-slate-200 bg-white !py-5 md:!py-6`}>
      <Container>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-6">
          <h2 id="quick-access-title" className="shrink-0 !text-base font-bold !tracking-normal text-slate-900">
            {t("quickLinksLabel")}
          </h2>
        <div className="grid flex-1 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {items.map((item) => {
            const className = cn(
              "group flex min-h-12 items-center justify-between gap-3 border-s border-slate-200 px-4 py-3 text-slate-900 transition-colors duration-200 hover:bg-royal-50 hover:text-royal-800",
            );
            const content = (
              <>
                <span className="flex w-full items-center justify-between gap-3 text-sm font-semibold">
                  {tNav(item.key)}
                  {isExternal(item)
                    ? <ArrowUpRight aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
                    : <ArrowRight aria-hidden className="size-4 shrink-0 rtl:rotate-180" strokeWidth={1.5} />}
                </span>
              </>
            );
            return isExternal(item) ? (
              <a key={item.key} href={item.url} target="_blank" rel="noopener noreferrer" className={className}>{content}<span className="sr-only">{tNav("externalLinkHint")}</span></a>
            ) : (
              <Link key={item.key} href={item.href} className={className}>{content}</Link>
            );
          })}
        </div>
        </div>
      </Container>
    </section>
  );
}
