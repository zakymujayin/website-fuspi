import { ArrowUpRight } from "lucide-react";

import { classifyNavUrl } from "@/components/public/shell/nav-url";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type UtilityLinkProps = {
  /** Destination straight from the frozen nav contract; never rewritten here. */
  url: string;
  label: string;
  /** Announced after the label when the destination leaves this site. */
  externalHint: string;
  className?: string;
  /**
   * Optional: the drawer passes its close handler so activating any utility
   * destination dismisses the panel. Omitted by the server-rendered topbar,
   * which has no open/closed state to reconcile.
   */
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

/**
 * Renders one campus-system link with correct external semantics. Hook-free on
 * purpose so the same component serves the server-rendered utility topbar and
 * the client-rendered mobile drawer.
 */
export function UtilityLink({
  url,
  label,
  externalHint,
  className,
  onClick,
}: UtilityLinkProps) {
  const kind = classifyNavUrl(url);
  const shared = cn("inline-flex items-center gap-1.5", className);

  // A destination the shell cannot vouch for is shown as plain text rather than
  // handed to the browser. The frozen contract only carries paths and https
  // origins, so this branch is a guard against a future bad entry, not dead code.
  if (kind === "unsafe") {
    return <span className={shared}>{label}</span>;
  }

  // Site-relative destinations go through the localized Link so `localePrefix:
  // "always"` emits /id, /en, or /ar. A bare <a href="/gkm"> would drop the
  // prefix and lean on a proxy redirect. The destination itself is passed
  // through untouched; only the locale segment routing adds is applied.
  if (kind === "internal") {
    return (
      <Link href={url} onClick={onClick} className={shared}>
        {label}
      </Link>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={shared}
    >
      {label}
      {/* Directional glyph: mirrored in RTL so it keeps pointing away from the text. */}
      <ArrowUpRight
        aria-hidden
        className="size-3.5 shrink-0 rtl:-scale-x-100"
        strokeWidth={1.5}
      />
      <span className="sr-only">{externalHint}</span>
    </a>
  );
}
