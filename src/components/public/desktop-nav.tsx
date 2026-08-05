"use client";

import { Menu } from "@base-ui/react/menu";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { NavGroup } from "@/components/public/nav-items";

/**
 * `whitespace-nowrap` keeps a long EN or AR label on one line: the unified
 * header row is fixed at 72px, so a wrapped label would spill out of it.
 */
const ITEM_CLASS =
  "flex min-h-11 shrink-0 items-center rounded-lg px-1.5 text-[14px] font-medium whitespace-nowrap text-slate-700 transition-colors hover:text-royal-600 lg:px-2 xl:text-[15px]";

/** Dropdowns open on hover (pointer) and on click/keyboard; Esc closes them. */
export function DesktopNav({ primary }: { primary: readonly NavGroup[] }) {
  const t = useTranslations("Nav");

  return (
    // Below lg the longest locale (EN) overflows a 768px line, so the drawer
    // stays in charge up to lg rather than md.
    <nav
      aria-label={t("primaryLabel")}
      className="hidden shrink-0 items-center gap-0.5 lg:flex"
    >
      {primary.map((item) =>
        item.children ? (
          <Menu.Root key={item.key} modal={false}>
            <Menu.Trigger openOnHover className={`${ITEM_CLASS} gap-1.5`}>
              {t(item.key)}
              <ChevronDown
                aria-hidden
                className="size-4 shrink-0 transition-transform data-[popup-open]:rotate-180 motion-reduce:transition-none"
                strokeWidth={1.5}
              />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner sideOffset={4} align="start" className="z-50">
                <Menu.Popup className="min-w-[220px] rounded-xl border border-slate-200 bg-white p-2 shadow-lg outline-none">
                  {item.children.map((child) => (
                    <Menu.LinkItem
                      key={child.key}
                      render={<Link href={child.href} />}
                      className="flex min-h-11 cursor-pointer items-center rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none data-[highlighted]:bg-royal-50 data-[highlighted]:text-royal-700"
                    >
                      {t(child.key)}
                    </Menu.LinkItem>
                  ))}
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        ) : (
          <Link key={item.key} href={item.href} className={ITEM_CLASS}>
            {t(item.key)}
          </Link>
        ),
      )}
    </nav>
  );
}
