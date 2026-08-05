"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

const STATS = [
  {key: "programs", value: 5, suffix: ""},
  {key: "lecturers", value: 62, suffix: "+"},
  {key: "staff", value: 18, suffix: "+"},
  {key: "students", value: 1200, suffix: "+"},
  {key: "partners", value: 24, suffix: "+"},
  {key: "publications", value: 80, suffix: "+"},
] as const;

function useAnimatedNumber(target: number, start: boolean) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (!start || hasRunRef.current) return;
    hasRunRef.current = true;
    const duration = 1200;
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(target * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [start, target]);

  return value;
}

function StatItem({
  item,
  index,
  inView,
}: {
  item: (typeof STATS)[number];
  index: number;
  inView: boolean;
}) {
  const t = useTranslations("Home");
  const value = useAnimatedNumber(item.value, inView);
  return (
    <div
      className={cn(
        "text-center transition-all duration-700",
        inView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
      )}
      style={{transitionDelay: `${index * 80}ms`}}
    >
      <p className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
        {value.toLocaleString("id-ID")}
        {item.suffix}
      </p>
      <p className="mt-1 text-sm text-slate-300">{t(`stat.${item.key}`)}</p>
    </div>
  );
}

export function StatsSection() {
  const t = useTranslations("Home");
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      {threshold: 0.3},
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-navy-900 py-14 md:py-20"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(65,105,225,.12),transparent_50%)]" />
      <Container className="relative z-10">
        <div className="mb-10 text-center">
          <h2 className="font-display text-xl font-bold tracking-tight text-white md:text-2xl">
            {t("statsTitle")}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-300">
            {t("statsDescription")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
          {STATS.map((item, index) => (
            <StatItem key={item.key} item={item} index={index} inView={inView} />
          ))}
        </div>
      </Container>
    </section>
  );
}
