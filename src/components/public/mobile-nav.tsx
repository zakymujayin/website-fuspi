"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ChevronDown, Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { LanguageSwitcher } from "@/components/public/language-switcher";
import { UtilityLink } from "@/components/public/shell/utility-link";
import { Link } from "@/i18n/navigation";
import type { ExternalLink, NavGroup, NavLink } from "@/components/public/nav-items";

type MobileNavProps = {
  primary: readonly NavGroup[];
  content?: readonly NavLink[];
  utility: readonly ExternalLink[];
  /** Prominent entry points (PPID, PMB) mirrored from the desktop header buttons. */
  actions?: ReadonlyArray<NavLink | ExternalLink>;
  externalHint: string;
};

function isExternalAction(item: NavLink | ExternalLink): item is ExternalLink {
  return "url" in item;
}

const SECTION_TITLE_CLASS =
  "px-3 pb-1 font-display text-[11px] font-medium tracking-wide text-slate-500 uppercase";

/** Every drawer target is at least 44px per docs/26-C. */
const TARGET_CLASS = "flex min-h-11 items-center rounded-md px-3 py-2 text-sm";

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className={SECTION_TITLE_CLASS}>
      {children}
    </h3>
  );
}

/**
 * All three header layers collapse into one drawer with named sections, the
 * language choice first (docs/26-C). The drawer is anchored to the inline-end
 * side, so it mirrors automatically in RTL. Base UI Dialog supplies the focus
 * trap, Escape handling, and focus restore to the trigger.
 */
export function MobileNav({ primary, content, utility, actions, externalHint }: MobileNavProps) {
  const t = useTranslations("Nav");
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-label={t("openMenu")}
        className="grid size-11 shrink-0 place-items-center rounded-md text-slate-700 hover:bg-slate-100 lg:hidden"
      >
        <Menu aria-hidden className="size-6" strokeWidth={1.5} />
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop
          data-slot="drawer-backdrop"
          className="fixed inset-0 z-40 bg-black/40 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none"
        />
        {/* `end-0` places the panel logically; the slide transform has no logical
            equivalent, so the RTL variant flips its direction explicitly. */}
        <Dialog.Popup
          data-slot="drawer-panel"
          className="fixed inset-y-0 end-0 z-50 flex w-[85vw] max-w-[360px] flex-col overflow-y-auto overscroll-contain bg-white shadow-lg transition-transform data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full motion-reduce:transition-none rtl:data-[ending-style]:-translate-x-full rtl:data-[starting-style]:-translate-x-full"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-4">
            <Dialog.Title className="font-display text-base font-bold text-royal-900">
              {t("menu")}
            </Dialog.Title>
            <Dialog.Close
              aria-label={t("closeMenu")}
              className="grid size-11 shrink-0 place-items-center rounded-md text-slate-700 hover:bg-slate-100"
            >
              <X aria-hidden className="size-5" strokeWidth={1.5} />
            </Dialog.Close>
          </div>

          <div className="border-b border-slate-200 py-3">
            <SectionTitle id="drawer-language">{t("languageLabel")}</SectionTitle>
            <LanguageSwitcher
              tone="light"
              size="lg"
              labelledBy="drawer-language"
              className="px-2"
            />
          </div>

          {actions?.length ? (
            <div className="flex items-center gap-2 border-b border-slate-200 p-3">
              {actions.map((item) =>
                isExternalAction(item) ? (
                  <UtilityLink
                    key={item.key}
                    url={item.url}
                    label={t(item.key)}
                    externalHint={externalHint}
                    onClick={close}
                    className="h-11 flex-1 justify-center rounded-md bg-royal-500 text-sm font-medium text-white hover:bg-royal-600"
                  />
                ) : (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={close}
                    className="flex h-11 flex-1 items-center justify-center rounded-md border border-slate-300 text-sm font-medium text-slate-700 hover:border-royal-300 hover:bg-royal-50 hover:text-royal-700"
                  >
                    {t(item.key)}
                  </Link>
                ),
              )}
            </div>
          ) : null}

          <nav aria-labelledby="drawer-primary" className="flex flex-col py-3">
            <SectionTitle id="drawer-primary">{t("primaryLabel")}</SectionTitle>
            {primary.map((item) =>
              item.children ? (
                <details key={item.key} className="group/item">
                  <summary
                    className={`${TARGET_CLASS} cursor-pointer list-none justify-between gap-2 font-medium text-slate-700 hover:bg-slate-100`}
                  >
                    {t(item.key)}
                    <ChevronDown
                      aria-hidden
                      className="size-4 shrink-0 transition-transform group-open/item:rotate-180 motion-reduce:transition-none"
                      strokeWidth={1.5}
                    />
                  </summary>
                  <ul className="flex flex-col ps-3">
                    {item.children.map((child) => (
                      <li key={child.key}>
                        <Link
                          href={child.href}
                          onClick={close}
                          className={`${TARGET_CLASS} text-slate-600 hover:bg-royal-50 hover:text-royal-700`}
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
                  className={`${TARGET_CLASS} font-medium text-slate-700 hover:bg-royal-50 hover:text-royal-700`}
                >
                  {t(item.key)}
                </Link>
              ),
            )}
          </nav>

          {content?.length ? (
            <nav aria-labelledby="drawer-content" className="flex flex-col border-t border-slate-200 py-3">
              <SectionTitle id="drawer-content">{t("contentLabel")}</SectionTitle>
              {content.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={close}
                  className={`${TARGET_CLASS} text-slate-600 hover:bg-royal-50 hover:text-royal-700`}
                >
                  {t(item.key)}
                </Link>
              ))}
            </nav>
          ) : null}

          <nav aria-labelledby="drawer-utility" className="flex flex-col border-t border-slate-200 py-3">
            <SectionTitle id="drawer-utility">{t("utilityLabel")}</SectionTitle>
            {utility.map((item) => (
              <UtilityLink
                key={item.key}
                url={item.url}
                label={t(item.key)}
                externalHint={externalHint}
                onClick={close}
                className={`${TARGET_CLASS} text-slate-600 hover:bg-royal-50 hover:text-royal-700`}
              />
            ))}
          </nav>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
