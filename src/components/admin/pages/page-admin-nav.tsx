import { FileTextIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

type AdminPageNavProps = {
  locale: string;
};

export async function AdminPageNav({ locale }: AdminPageNavProps) {
  const t = await getTranslations({ locale, namespace: "AdminPageNavigation" });
  return (
    <nav aria-label={t("label")} className="mb-8">
      <ul className="flex flex-wrap items-center gap-2">
        <li>
          <Link
            href="/admin/pages"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            <FileTextIcon data-icon aria-hidden className="size-4" strokeWidth={1.5} />
            {t("pages")}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
