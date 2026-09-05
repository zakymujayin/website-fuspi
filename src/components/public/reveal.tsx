"use client";

import {useEffect, useRef, type CSSProperties, type ReactNode} from "react";
import {cn} from "@/lib/utils";
import styles from "./reveal.module.css";

let observer: IntersectionObserver | undefined;
const pending = new Map<Element, () => void>();

function observe(node: Element, reveal: () => void) {
  observer ??= new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) pending.get(entry.target)?.();
    }
  }, {threshold: 0, rootMargin: "0px 0px -32px 0px"});
  pending.set(node, reveal);
  observer.observe(node);
  return () => {
    observer?.unobserve(node);
    pending.delete(node);
    if (!pending.size) {
      observer?.disconnect();
      observer = undefined;
    }
  };
}

/** Visible SSR/no-JS baseline; one shared observer, no off-screen expiry timer. */
export function Reveal({children, index = 0, className, variant = "lift"}: {
  children: ReactNode;
  index?: number;
  className?: string;
  variant?: "lift" | "image" | "fade";
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || !window.IntersectionObserver) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Never delay content already visible on initial load, including the LCP.
    if (preference.matches || node.getBoundingClientRect().top < window.innerHeight) return;
    node.dataset.revealState = "pending";
    const finish = () => {
      node.dataset.revealState = "visible";
      stop?.();
    };
    const stop = observe(node, finish);
    const onPreference = () => {if (preference.matches) finish();};
    preference.addEventListener("change", onPreference);
    node.addEventListener("focusin", finish);
    return () => {
      stop?.();
      preference.removeEventListener("change", onPreference);
      node.removeEventListener("focusin", finish);
    };
  }, []);

  return (
    <div ref={ref} data-reveal={variant} className={cn("flex h-full", styles.reveal, className)} style={{"--reveal-delay": `${Math.min(Math.max(index, 0), 5) * 70}ms`} as CSSProperties}>
      {children}
    </div>
  );
}
