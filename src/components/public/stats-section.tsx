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

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = 1200;

    rafRef.current = requestAnimationFrame((firstFrame) => {
      if (reducedMotion) {
        setValue(target);
        return;
      }
      const tick = (now: number) => {
        const progress = Math.min((now - firstFrame) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.floor(target * eased));
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };
      tick(firstFrame);
    });

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
        "w-28 shrink-0 text-center motion-safe:transition-all motion-safe:duration-700 sm:w-32",
        inView ? "translate-y-0 opacity-100" : "opacity-100 motion-safe:translate-y-4 motion-safe:opacity-0",
      )}
      style={{transitionDelay: `${index * 80}ms`}}
    >
      <span className="mx-auto mb-2 flex items-center justify-center text-brass-400">
        {icon}
      </span>
      <p className="font-display text-3xl font-extrabold tracking-tight text-brass-400 md:text-4xl">
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
      {threshold: 0.3, rootMargin: "0px 0px -10% 0px"},
    );
    observer.observe(node);
    // Never leave the whole band blank: force it visible after a bounded
    // delay if the observer never reports an intersection.
    const fallback = window.setTimeout(() => setInView(true), 1200);
    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section
      ref={ref}
      // Royal blue, not navy: docs/03-design-system.md locks royal-500 as
      // the primary identity color and reserves navy for header/footer
      // depth specifically.
      className="grain relative overflow-hidden bg-gradient-to-br from-royal-800 to-royal-950 py-16 md:py-20"
    >
      {/* Two soft glows, not a shape: pure radial-gradient blobs fade to
          nothing at their own edges, so there's no hard boundary line
          cutting across the band the way a filled SVG path left behind. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 70% at 15% 15%, rgba(65,105,225,0.25), transparent 60%), radial-gradient(ellipse 55% 65% at 88% 80%, rgba(214,180,94,0.16), transparent 60%)",
        }}
      />
      <Container className="relative z-10">
        <div className="flex flex-wrap justify-center gap-x-10 gap-y-12 sm:gap-x-16 lg:gap-x-20">
          {items.map((item, index) => (
            <StatItem key={item.id} item={item} index={index} inView={inView} />
          ))}
        </div>
      </Container>
    </section>
  );
}
