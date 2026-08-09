import { Info } from "lucide-react";

import { cn } from "@/lib/utils";

type PostFallbackBannerProps = {
  message: string;
  compact?: boolean;
};

/**
 * Calm notice shown when `translation.isFallback` is true (manifest data
 * requirement 5). `compact` renders a small inline note for list cards;
 * the full bar (docs/17-E info variant) is used on the detail page.
 */
export function PostFallbackBanner({ message, compact = false }: PostFallbackBannerProps) {
  if (compact) {
    return (
      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
        <Info aria-hidden className="size-3.5 shrink-0" strokeWidth={1.5} />
        {message}
      </p>
    );
  }

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
        "border-royal-200 bg-royal-50 text-royal-700",
      )}
    >
      <Info aria-hidden className="mt-0.5 size-[18px] shrink-0" strokeWidth={1.5} />
      <p>{message}</p>
    </div>
  );
}
