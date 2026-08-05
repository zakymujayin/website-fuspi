import {
  BookOpen,
  Brain,
  Compass,
  GraduationCap,
  HeartHandshake,
  Scale,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

const ADVANTAGES = [
  {key: "quran", icon: BookOpen},
  {key: "hadith", icon: Scale},
  {key: "aqidah", icon: Brain},
  {key: "religions", icon: Compass},
  {key: "sufism", icon: HeartHandshake},
  {key: "integrated", icon: GraduationCap},
] as const;

export async function AdvantagesSection() {
  const t = await getTranslations("Home");

  return (
    <section className="bg-white py-14 md:py-20">
      <Container>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ADVANTAGES.map((item, i) => (
            <article
              key={item.key}
              className={cn(
                "group flex items-start gap-4 rounded-xl border border-slate-100 bg-slate-50 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-royal-200 hover:shadow-sm",
                i === 0 ? "sm:col-span-2 lg:col-span-1" : "",
              )}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-royal-50 text-royal-600 transition-colors group-hover:bg-royal-100">
                <item.icon aria-hidden className="size-5" strokeWidth={1.5} />
              </span>
              <div>
                <h3 className="font-display text-sm font-semibold text-slate-900">
                  {t(`advantage.${item.key}.title`)}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {t(`advantage.${item.key}.description`)}
                </p>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
