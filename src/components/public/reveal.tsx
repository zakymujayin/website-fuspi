"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  /** Stagger position within a group — each step adds ~70ms of delay. */
  index?: number;
  className?: string;
};

/**
 * Fades/lifts children in once they scroll into view. Same IntersectionObserver
 * shape as the stats counter, generalized so card grids don't all mount at once.
 *
 * Never stays hidden: reduced motion skips the animation outright, and a
 * bounded fallback timer forces visibility if the observer never reports an
 * intersection (odd viewport timing, a stitched/headless capture, a ref that
 * mounts already off-screen in a zero-height parent) so content can't get
 * stuck invisible the way it did before this existed.
 */
export function Reveal({ children, index = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
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
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(node);
    const fallback = window.setTimeout(() => setInView(true), 1200);
    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        // Only ever hidden/offset under motion-safe: with no preference set,
        // reduced motion never applies these, so content is always visible
        // by default and this can never get stuck invisible.
        "flex h-full opacity-100 motion-safe:transition-all motion-safe:duration-500 motion-safe:ease-out",
        inView ? "translate-y-0" : "motion-safe:translate-y-5 motion-safe:opacity-0",
        className,
      )}
      style={{ transitionDelay: `${index * 70}ms` }}
    >
      {children}
    </div>
  );
}
