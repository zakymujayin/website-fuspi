"use client";

import { BarChart3, BookOpen, Briefcase, FileText, GraduationCap, Handshake, Users } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";
import type { PublicStatisticItem } from "@/features/home-nav/public-query";

const iconProps = { "aria-hidden": true as const, className: "size-8", strokeWidth: 1.5 };

const ICONS: Record<string, ReactNode> = {
  "book-open": <BookOpen {...iconProps} />, users: <Users {...iconProps} />, briefcase: <Briefcase {...iconProps} />,
  "graduation-cap": <GraduationCap {...iconProps} />, handshake: <Handshake {...iconProps} />, "file-text": <FileText {...iconProps} />,
};
const DEFAULT_ICON = <BarChart3 {...iconProps} />;

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
  item: PublicStatisticItem;
  index: number;
  inView: boolean;
}) {
  const numeric = Number.parseInt(item.value, 10);
  const value = useAnimatedNumber(Number.isFinite(numeric) ? numeric : 0, inView);
  const icon = (item.icon && ICONS[item.icon]) || DEFAULT_ICON;
  return (
    <div
      className={cn(
        "text-center transition-all duration-700",
        inView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
      )}
      style={{transitionDelay: `${index * 80}ms`}}
    >
      <span className="mx-auto mb-2 flex items-center justify-center text-royal-300">
        {icon}
      </span>
      <p className="font-display text-2xl font-bold tracking-tight text-white md:text-3xl">
        {Number.isFinite(numeric) ? value.toLocaleString("id-ID") : item.value}
        {item.suffix}
      </p>
      <p className="mt-1 text-xs text-slate-300 md:text-sm">{item.label}</p>
    </div>
  );
}

type StatsSectionProps = { items: readonly PublicStatisticItem[] };

export function StatsSection({ items }: StatsSectionProps) {
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

  if (items.length === 0) return null;

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-navy-900 py-16 md:py-20"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(65,105,225,.14),transparent_55%)]" />
      <Container className="relative z-10">
        <div className="grid grid-cols-2 gap-y-12 gap-x-8 md:grid-cols-3 lg:grid-cols-6">
          {items.map((item, index) => (
            <StatItem key={item.id} item={item} index={index} inView={inView} />
          ))}
        </div>
      </Container>
    </section>
  );
}
