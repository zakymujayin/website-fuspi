"use client";

import { useEffect, useState } from "react";

import { isHeaderCompact } from "@/components/public/shell/header-scroll";
import { cn } from "@/lib/utils";

/**
 * Owns the only browser state in the public shell: whether the reader has
 * scrolled past the compact threshold (docs/17-B). Server render and first
 * client paint always emit the expanded state, so hydration cannot mismatch;
 * the effect then reconciles a page restored mid-scroll.
 *
 * Compaction is expressed as a transform, never as a height. The header keeps
 * its full flow height (36px content bar + 36px utility bar + 76px main bar on
 * desktop, 76px on mobile), so the pinned bar shrinks to the specified 60px
 * without moving a single pixel of page content.
 */
export function StickyHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const sync = () => setCompact(isHeaderCompact(window.scrollY));

    // Restored scroll positions fire no scroll event, so read once on mount.
    sync();
    window.addEventListener("scroll", sync, { passive: true });

    return () => window.removeEventListener("scroll", sync);
  }, []);

  return (
    <header
      data-compact={compact ? "true" : "false"}
      className={cn(
        // Tailwind v4 emits translate utilities as the standalone `translate`
        // property, so `transition-transform` alone would not animate them.
        "group sticky top-0 z-30 w-full transition-[translate,box-shadow] duration-200 ease-out",
        "data-[compact=true]:shadow-sm motion-reduce:transition-none",
        // Mobile hides 16px of the 76px bar; desktop also slides the two 36px
        // bars out of view. Both land on a 60px pinned bar.
        "data-[compact=true]:-translate-y-4 md:data-[compact=true]:-translate-y-[5.5rem]",
        className,
      )}
    >
      {children}
    </header>
  );
}
