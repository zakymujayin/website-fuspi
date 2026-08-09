"use client";

import { cn } from "@/lib/utils";

/**
 * Single-bar sticky header. The full 96px bar stays pinned on scroll; the
 * previous compaction transform targeted the three-layer layout and is no
 * longer needed after the header was unified into one row.
 */
export function StickyHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 w-full bg-white shadow-sm transition-shadow duration-200 ease-out motion-reduce:transition-none",
        className,
      )}
    >
      {children}
    </header>
  );
}
