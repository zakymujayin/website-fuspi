import { Mail } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { LanguageSwitcher } from "@/components/public/language-switcher";
import { utilityLinks } from "@/components/public/nav-items";
import { UtilityLink } from "@/components/public/shell/utility-link";

const CONTACT_EMAIL = "surat@uinbanten.ac.id";

export async function TopBar() {
  const t = await getTranslations("Nav");
  const externalHint = t("externalLinkHint");

  return (
    <div className="bg-navy-900 text-slate-300">
      {/* Matches the wider main-header row (see site-header.tsx) so both bars align. */}
      <div className="mx-auto flex h-10 max-w-[1440px] items-center justify-between gap-4 px-4 text-xs sm:px-6">
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="inline-flex items-center gap-1.5 text-slate-300 transition-colors hover:text-white"
        >
          <Mail aria-hidden className="size-3.5" strokeWidth={1.5} />
          <span className="hidden sm:inline">{CONTACT_EMAIL}</span>
        </a>

        <nav
          aria-label={t("utilityLabel")}
          className="flex items-center gap-1"
        >
          {utilityLinks.map((item) => (
            <UtilityLink
              key={item.key}
              url={item.url}
              label={t(item.key)}
              externalHint={externalHint}
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            />
          ))}
          <LanguageSwitcher tone="dark" size="sm" />
        </nav>
      </div>
    </div>
  );
}
