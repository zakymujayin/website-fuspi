import { FileQuestion } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";

/**
 * Unknown, invalid, unpublished, future, or wrong-type slugs all land here
 * via `notFound()` (manifest detail requirement 1) — never disclosing
 * whether a draft/private record actually exists.
 */
export default async function NewsDetailNotFound() {
  const t = await getTranslations("Post");

  return (
    <Container className="py-12 md:py-20">
      <div
        role="alert"
        className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-12 text-center"
      >
        <FileQuestion aria-hidden className="size-10 text-slate-300" strokeWidth={1.5} />
        <p className="font-display text-base font-medium text-slate-900">{t("notFound.title")}</p>
        <p className="max-w-prose text-sm text-slate-500">{t("notFound.description")}</p>
        <Link
          href="/berita"
          className="mt-2 inline-flex h-10 items-center rounded-lg bg-royal-500 px-4 text-sm font-medium text-white hover:bg-royal-600"
        >
          {t("notFound.backToList")}
        </Link>
      </div>
    </Container>
  );
}
