import {ArrowRight, ArrowUpRight} from "lucide-react";
import {getTranslations} from "next-intl/server";

import {quickLinks, type ExternalLink, type NavLink} from "@/components/public/nav-items";
import {Container} from "@/components/ui/container";
import {Link} from "@/i18n/navigation";
import {cn} from "@/lib/utils";

function isExternal(item: NavLink | ExternalLink): item is ExternalLink {
  return "url" in item;
}

export async function HomeQuickAccess() {
  const t = await getTranslations("Home");
  const tNav = await getTranslations("Nav");
  const items = quickLinks.slice(0, 5);

  return (
    <section aria-labelledby="quick-access-title" className="bg-white py-16 md:py-20">
      <Container>
        <div className="mb-8 flex items-end justify-between gap-6">
          <h2 id="quick-access-title" className="text-2xl font-bold tracking-[-0.01em] text-slate-900 md:text-[28px]">
            {t("quickLinksLabel")}
          </h2>
          <span aria-hidden className="mb-2 h-px flex-1 bg-slate-200" />
        </div>
        <div className="grid grid-flow-dense overflow-hidden rounded-md border border-slate-300 md:grid-cols-12 md:grid-rows-2">
          {items.map((item, index) => {
            const className = cn(
              "group relative flex min-h-36 flex-col justify-between border-e border-b border-slate-300 bg-white p-6 transition-colors duration-200 hover:bg-royal-500 hover:text-white md:min-h-40",
              index === 0 ? "md:col-span-6 md:row-span-2 md:min-h-80 md:p-9" : "md:col-span-3",
            );
            const content = (
              <>
                <span className="text-xs tabular-nums tracking-[0.18em] text-slate-500 transition-colors group-hover:text-white">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className={cn("flex items-end justify-between gap-4 font-bold", index === 0 ? "text-2xl md:text-3xl" : "text-lg")}>
                  {tNav(item.key)}
                  {isExternal(item)
                    ? <ArrowUpRight aria-hidden className="size-5 shrink-0" strokeWidth={1.5} />
                    : <ArrowRight aria-hidden className="size-5 shrink-0 rtl:rotate-180" strokeWidth={1.5} />}
                </span>
              </>
            );
            return isExternal(item) ? (
              <a key={item.key} href={item.url} target="_blank" rel="noopener noreferrer" className={className}>{content}</a>
            ) : (
              <Link key={item.key} href={item.href} className={className}>{content}</Link>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
