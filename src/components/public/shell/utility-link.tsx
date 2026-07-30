import { ArrowUpRight } from "lucide-react";

import { classifyNavUrl } from "@/components/public/shell/nav-url";
import { cn } from "@/lib/utils";

type UtilityLinkProps = {
  /** Destination straight from the frozen nav contract; never rewritten here. */
  url: string;
  label: string;
  /** Announced after the label when the destination leaves this site. */
  externalHint: string;
  className?: string;
};

/**
 * Renders one campus-system link with correct external semantics. Hook-free on
 * purpose so the same component serves the server-rendered utility topbar and
 * the client-rendered mobile drawer.
 */
export function UtilityLink({ url, label, externalHint, className }: UtilityLinkProps) {
  const kind = classifyNavUrl(url);
  const shared = cn("inline-flex items-center gap-1.5", className);

  // A destination the shell cannot vouch for is shown as plain text rather than
  // handed to the browser. The frozen contract only carries paths and https
  // origins, so this branch is a guard against a future bad entry, not dead code.
  if (kind === "unsafe") {
    return <span className={shared}>{label}</span>;
  }

  if (kind === "internal") {
    return (
      <a href={url} className={shared}>
        {label}
      </a>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={shared}>
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
