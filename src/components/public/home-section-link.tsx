import type {ReactNode} from "react";
import {ArrowRight} from "lucide-react";

import {Link} from "@/i18n/navigation";
import {cn} from "@/lib/utils";
import styles from "./home-design.module.css";

/**
 * The single section-level call to action for the whole homepage: royal blue,
 * medium weight, one arrow, one hover (the rule reveals, the arrow travels). No
 * section invents its own treatment.
 *
 * Kept apart from HomeSectionHeading so purely presentational sections can use
 * the heading family without pulling in the localized router.
 */
export function HomeSectionLink({
  href,
  external = false,
  children,
  className,
}: {
  href: string;
  external?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const content = (
    <>
      {children}
      <ArrowRight aria-hidden className="size-4 shrink-0 rtl:rotate-180" strokeWidth={1.75} />
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cn(styles.sectionLink, className)}>{content}</a>
  ) : (
    <Link href={href} className={cn(styles.sectionLink, className)}>{content}</Link>
  );
}
