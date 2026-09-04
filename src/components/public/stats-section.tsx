"use client";

import {useLocale, useTranslations} from "next-intl";
import {useEffect, useRef, useState} from "react";

import {Container} from "@/components/ui/container";
import type {PublicStatisticItem} from "@/features/home-nav/public-query";

function useCount(target: number, enabled: boolean) {
  const [value, setValue] = useState(0);
  const completed = useRef(false);

  useEffect(() => {
    if (!enabled || completed.current) return;
    completed.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const reducedFrame = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(reducedFrame);
    }
    let frame = 0;
    const started = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - started) / 1200, 1);
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [enabled, target]);

  return value;
}

function Stat({item, enabled, locale}: {item: PublicStatisticItem; enabled: boolean; locale: string}) {
  const target = Number.parseInt(item.value, 10);
  const numeric = Number.isFinite(target);
  const animated = useCount(numeric ? target : 0, enabled);
  const finalValue = `${numeric ? target.toLocaleString(locale) : item.value}${item.suffix}`;
  return (
    <div className="border-t border-white/30 pt-6" aria-label={`${item.label}: ${finalValue}`}>
      <p aria-hidden className="text-[clamp(2.25rem,4vw,3.25rem)] font-bold leading-none tracking-[-0.02em] text-white">
        {numeric ? animated.toLocaleString(locale) : item.value}<span className="text-royal-100">{item.suffix}</span>
      </p>
      <p className="mt-3 text-sm text-white">{item.label}</p>
    </div>
  );
}

export function StatsSection({items, title, description}: {items: readonly PublicStatisticItem[]; title?: string; description?: string | null}) {
  const t = useTranslations("Home");
  const locale = useLocale();
  const root = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!root.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, {threshold: 0.22});
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);

  if (items.length === 0) return null;

  return (
    <section ref={root} className="bg-royal-500 py-16 text-white md:py-24">
      <Container>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white">FUSPI</p>
            <h2 className="mt-4 max-w-sm text-[28px] font-bold leading-tight tracking-[-0.01em] text-white md:text-[34px]">
              {title || t("statsTitle")}
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white">{description || t("statsDescription")}</p>
          </div>
          <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4">
            {items.map((item) => (
              <Stat key={item.id} item={item} enabled={visible} locale={locale} />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
