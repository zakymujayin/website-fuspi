import { institution } from "@/config/institution";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  tone?: "light" | "dark";
  className?: string;
  /** Hides the "FUSPI" wordmark and subtitle, leaving only the mark. */
  showLabel?: boolean;
};

/**
 * Wordmark placeholder. The faculty logo is a media asset that must not be
 * mirrored in RTL; it is swapped in once the asset lands (see handoff).
 * `showLabel: false` renders the mark alone (header/footer both use this —
 * the full name is still announced to assistive tech via the sr-only span).
 */
export function BrandMark({ tone = "light", className, showLabel = true }: BrandMarkProps) {
  return (
    <Link
      href="/"
      className={cn("flex min-w-0 items-center gap-3 text-start", className)}
      dir="ltr"
    >
      <span
        aria-hidden
        className={cn(
          "grid shrink-0 place-items-center rounded-lg font-display font-bold tracking-tight",
          showLabel ? "size-11 text-sm" : "size-11 text-base",
          tone === "light"
            ? "bg-royal-500 text-white"
            : "bg-white/10 text-white ring-1 ring-white/20",
        )}
      >
        {institution.shortName.slice(0, 2)}
      </span>
      {showLabel ? (
        <span className="flex min-w-0 flex-col leading-tight">
          <span
            className={cn(
              "font-display text-base font-bold",
              tone === "light" ? "text-royal-900" : "text-white",
            )}
          >
            {institution.shortName}
          </span>
          <span
            className={cn(
              "truncate text-[11px] tracking-wide",
              tone === "light" ? "text-slate-500" : "text-slate-400",
            )}
          >
            {institution.university}
          </span>
        </span>
      ) : null}
      <span className="sr-only">{institution.name}</span>
    </Link>
  );
}
