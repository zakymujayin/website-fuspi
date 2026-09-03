import Image from "next/image";

import { institution } from "@/config/institution";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Transparent-background marks; the navy variant is for light surfaces. */
const UIN_LOGO_SRC = {
  light: "/images/brand/uin-logo-navy.png",
  dark: "/images/brand/uin-logo-white.png",
} as const;

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
        className={cn(
          "relative grid shrink-0 place-items-center",
          showLabel ? "h-11 w-10" : "h-16 w-14",
        )}
      >
        <Image
          src={UIN_LOGO_SRC[tone]}
          alt=""
          aria-hidden
          width={1507}
          height={1748}
          sizes={showLabel ? "40px" : "56px"}
          className="h-full w-full object-contain"
          priority={showLabel}
        />
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
