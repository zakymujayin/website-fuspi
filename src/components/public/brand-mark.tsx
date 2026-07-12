import { institution } from "@/config/institution";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  tone?: "light" | "dark";
  className?: string;
};

/**
 * Wordmark placeholder. The faculty logo is a media asset that must not be
 * mirrored in RTL; it is swapped in once the asset lands (see handoff).
 */
export function BrandMark({ tone = "light", className }: BrandMarkProps) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-3 text-start", className)}
      dir="ltr"
    >
      <span
        aria-hidden
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-lg font-display text-sm font-bold tracking-tight",
          tone === "light"
            ? "bg-royal-500 text-white"
            : "bg-white/10 text-white ring-1 ring-white/20",
        )}
      >
        {institution.shortName.slice(0, 2)}
      </span>
      <span className="flex flex-col leading-tight">
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
            "text-[11px] tracking-wide",
            tone === "light" ? "text-slate-500" : "text-slate-400",
          )}
        >
          {institution.university}
        </span>
      </span>
      <span className="sr-only">{institution.name}</span>
    </Link>
  );
}
