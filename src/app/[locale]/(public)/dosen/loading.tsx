import {getTranslations} from "next-intl/server";

import {Container} from "@/components/ui/container";
import {Skeleton} from "@/components/ui/skeleton";

export default async function LecturerListLoading() {
  const t = await getTranslations("LecturerProfile");

  return (
    <Container className="py-12 md:py-20">
      <output aria-live="polite" className="block">
        <span className="sr-only">{t("loading")}</span>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-3 h-5 w-full max-w-xl" />
        <Skeleton className="mt-8 h-11 w-full" />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({length: 6}, (_, index) => (
            <div key={index} className="overflow-hidden rounded-xl border border-slate-200">
              <Skeleton className="aspect-[4/3] rounded-none" />
              <div className="p-5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-2 h-5 w-40" />
                <Skeleton className="mt-2 h-4 w-28" />
                <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </output>
    </Container>
  );
}
