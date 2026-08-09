"use client";

import { Menu } from "@base-ui/react/menu";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Link } from "@/i18n/navigation";
import type { NavGroup } from "@/components/public/nav-items";
import { cn } from "@/lib/utils";

/** Groups above this many children render as a two-column mega panel instead of a single list. */
const MEGA_THRESHOLD = 6;

/**
 * `whitespace-nowrap` keeps a long EN or AR label on one line: the unified
 * header row is fixed at 72px, so a wrapped label would spill out of it.
 */
const ITEM_CLASS =
  "flex min-h-11 shrink-0 items-center rounded-lg px-1 text-[12.5px] font-medium whitespace-nowrap text-slate-700 transition-colors hover:text-royal-600 2xl:px-2.5 2xl:text-[14.5px]";

/**
 * Dropdowns open on hover (pointer) and on click/keyboard; Esc closes them.
 * Open state is lifted here (not left to each Menu.Root) so moving from one
 * trigger to a sibling closes the first panel instead of leaving both open.
 */
export function DesktopNav({ primary }: { primary: readonly NavGroup[] }) {
  const t = useTranslations("Nav");
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    // Below lg the longest locale (EN) overflows a 768px line, so the drawer
    // stays in charge up to lg rather than md.
    <nav
      aria-label={t("primaryLabel")}
      className="hidden shrink-0 items-center gap-0.5 lg:flex 2xl:gap-1"
    >
      {primary.map((item) => {
        if (!item.children) {
          return (
            <Link key={item.key} href={item.href} className={ITEM_CLASS}>
              {t(item.key)}
            </Link>
          );
        }

        const isMega = item.children.length >= MEGA_THRESHOLD;

        return (
          <Menu.Root
            key={item.key}
            modal={false}
            open={openKey === item.key}
            onOpenChange={(isOpen) => setOpenKey(isOpen ? item.key : null)}
          >
            <Menu.Trigger openOnHover className={`${ITEM_CLASS} group gap-1.5`}>
              {t(item.key)}
              <ChevronDown
                aria-hidden
                className="size-4 shrink-0 transition-transform duration-200 group-data-[popup-open]:rotate-180 motion-reduce:transition-none"
                strokeWidth={1.5}
              />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner sideOffset={8} align="start" className="z-50">
                <Menu.Popup
                  className={cn(
                    "rounded-xl border border-slate-200/70 bg-slate-50/95 p-3 shadow-lg backdrop-blur-md outline-none",
                    isMega
                      ? "grid w-[440px] grid-cols-2 gap-x-2 gap-y-0.5"
                      : "flex w-[240px] flex-col gap-0.5",
                  )}
                >
                  {item.children.map((child) => (
                    <Menu.LinkItem
                      key={child.key}
                      render={<Link href={child.href} />}
                      className="flex min-h-11 cursor-pointer items-center rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none data-[highlighted]:bg-white data-[highlighted]:text-royal-700 data-[highlighted]:shadow-sm"
                    >
                      {t(child.key)}
                    </Menu.LinkItem>
                  ))}
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        );
      })}
    </nav>
  );
}
