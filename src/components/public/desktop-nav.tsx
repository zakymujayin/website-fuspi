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
 * One panel row. 44px minimum target, generous inline padding so the label has
 * room to breathe inside its column.
 */
const PANEL_ITEM_CLASS =
  "flex min-h-11 cursor-pointer items-center rounded-md px-3 py-2.5 text-sm text-slate-700 outline-none transition-colors data-[highlighted]:bg-white data-[highlighted]:text-royal-700 data-[highlighted]:shadow-sm motion-reduce:transition-none";

/**
 * `whitespace-nowrap` keeps a long EN or AR label on one line: the unified
 * header row is fixed at 72px, so a wrapped label would spill out of it.
 */
const ITEM_CLASS =
  "flex min-h-11 shrink-0 items-center px-1 text-[13px] font-medium whitespace-nowrap text-slate-700 transition-colors hover:text-royal-600 xl:px-1.5 xl:text-sm 2xl:px-2.5";

/**
 * Dropdowns open on hover (pointer) and on click/keyboard; Esc closes them.
 * Open state is lifted here (not left to each Menu.Root) so moving from one
 * trigger to a sibling closes the first panel instead of leaving both open.
 */
export function DesktopNav({ primary }: { primary: readonly NavGroup[] }) {
  const t = useTranslations("Nav");
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    // Below xl the utility/action cluster and longer localized labels compete
    // for the same row, so the drawer stays in charge through tablet widths.
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

        const { sections } = item;
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
                    "rounded-md border border-slate-200/70 bg-slate-50/95 shadow-lg backdrop-blur-md outline-none",
                    sections
                      ? "grid w-[620px] grid-cols-2 p-5"
                      : isMega
                        ? "grid w-[440px] grid-cols-2 gap-x-2 gap-y-0.5 p-3"
                        : "flex w-[240px] flex-col gap-0.5 p-3",
                  )}
                >
                  {sections
                    ? sections.map((section, index) => (
                        <Menu.Group
                          key={section.key}
                          className={cn(
                            "flex flex-col gap-0.5",
                            // A hairline between columns, on the inline-start
                            // edge so it mirrors correctly in Arabic.
                            index === 0
                              ? "pe-6"
                              : "border-s border-slate-200 ps-6",
                          )}
                        >
                          <Menu.GroupLabel className="px-3 pb-2 text-[15px] font-semibold tracking-tight text-royal-800">
                            {t(section.key)}
                          </Menu.GroupLabel>
                          {section.items.map((child) => (
                            <Menu.LinkItem
                              key={child.key}
                              render={<Link href={child.href} />}
                              className={PANEL_ITEM_CLASS}
                            >
                              {t(child.key)}
                            </Menu.LinkItem>
                          ))}
                        </Menu.Group>
                      ))
                    : item.children.map((child) => (
                        <Menu.LinkItem
                          key={child.key}
                          render={<Link href={child.href} />}
                          className={PANEL_ITEM_CLASS}
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
