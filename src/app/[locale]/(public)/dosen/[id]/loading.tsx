import {getTranslations} from "next-intl/server";

import {Container} from "@/components/ui/container";
import {Skeleton} from "@/components/ui/skeleton";

export default async function LecturerDetailLoading() {
  const t = await getTranslations("LecturerProfile");

  return (
    <Container className="py-12 md:py-20">
      <output aria-live="polite" className="block">
        <span className="sr-only">{t("loading")}</span>
        <Skeleton className="h-4 w-72" />
        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="space-y-6 lg:col-span-4">
            <Skeleton className="aspect-[4/5] w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="lg:col-span-8">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-3 h-10 w-3/4" />
            <Skeleton className="mt-3 h-6 w-48" />
            <div className="mt-10 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            <div className="mt-12 space-y-5">
              {Array.from({length: 3}, (_, index) => (
                <div key={index} className="ps-6">
                  <Skeleton className="h-5 w-56" />
                  <Skeleton className="mt-2 h-4 w-72" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </output>
    </Container>
  );
}
