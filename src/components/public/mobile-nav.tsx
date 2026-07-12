"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ChevronDown, Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { LanguageSwitcher } from "@/components/public/language-switcher";
import { Link } from "@/i18n/navigation";
import type { ExternalLink, NavGroup, NavLink } from "@/components/public/nav-items";

type MobileNavProps = {
  primary: readonly NavGroup[];
  content: readonly NavLink[];
  utility: readonly ExternalLink[];
};

/**
 * Drawer opens from the inline-end side, so it mirrors automatically in RTL.
 * Base UI Dialog supplies the focus trap, Esc handling, and focus restore.
 */
export function MobileNav({ primary, content, utility }: MobileNavProps) {
  const t = useTranslations("Nav");
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-label={t("openMenu")}
        className="grid size-11 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden"
      >
        <Menu aria-hidden className="size-6" strokeWidth={1.5} />
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed inset-y-0 end-0 z-50 flex w-[85vw] max-w-[360px] flex-col overflow-y-auto bg-white shadow-lg transition-transform data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full rtl:data-[ending-style]:-translate-x-full rtl:data-[starting-style]:-translate-x-full">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-4">
            <Dialog.Title className="font-display text-base font-bold text-royal-900">
              {t("menu")}
            </Dialog.Title>
            <Dialog.Close
              aria-label={t("closeMenu")}
              className="grid size-11 place-items-center rounded-lg text-slate-700 hover:bg-slate-100"
            >
              <X aria-hidden className="size-5" strokeWidth={1.5} />
            </Dialog.Close>
          </div>

          <nav aria-label={t("primaryLabel")} className="flex flex-col p-2">
            {primary.map((item) =>
              item.children ? (
                <details key={item.key} className="group">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                    {t(item.key)}
                    <ChevronDown
                      aria-hidden
                      className="size-4 transition-transform group-open:rotate-180"
                      strokeWidth={1.5}
                    />
                  </summary>
                  <ul className="flex flex-col ps-3">
                    {item.children.map((child) => (
                      <li key={child.key}>
                        <Link
                          href={child.href}
                          onClick={close}
                          className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-royal-50 hover:text-royal-700"
                        >
                          {t(child.key)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={close}
                  className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-royal-50 hover:text-royal-700"
                >
                  {t(item.key)}
                </Link>
              ),
            )}
          </nav>

          <nav
            aria-label={t("contentLabel")}
            className="flex flex-col border-t border-slate-200 p-2"
          >
            {content.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={close}
                className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-royal-50 hover:text-royal-700"
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>

          <nav
            aria-label={t("utilityLabel")}
            className="flex flex-col border-t border-slate-200 p-2"
          >
            {utility.map((item) => (
              <a
                key={item.key}
                href={item.url}
                onClick={close}
                className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-royal-50 hover:text-royal-700"
              >
                {t(item.key)}
              </a>
            ))}
          </nav>

          <div className="mt-auto border-t border-slate-200 p-4">
            <LanguageSwitcher
              tone="light"
              className="[&_a]:min-h-11 [&_a]:min-w-11 [&_a]:text-sm"
            />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
