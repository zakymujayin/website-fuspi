import type {ReactNode} from "react";

import {cn} from "@/lib/utils";
import styles from "./home-design.module.css";

/**
 * Homepage section heading family.
 *
 * Eyebrow, title and description are one connected block and always share a
 * column; only the optional CTA is allowed to sit on the opposite side. The
 * `accent` flag adds the short royal rule reserved for the page's important
 * headings — it is the only decorative rule this family emits.
 */
export function HomeSectionHeading({
  title,
  description,
  eyebrow,
  action,
  as: Heading = "h2",
  id,
  accent = false,
  compact = false,
  className,
}: {
  title: string;
  description?: string | null;
  eyebrow?: string | null;
  action?: ReactNode;
  as?: "h2" | "h3";
  id?: string;
  accent?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      data-home-heading
      className={cn(styles.sectionHeading, action && styles.withAction, compact && styles.compactHeading, className)}
    >
      <div className={cn(styles.headingCopy, accent && styles.headingAccent)}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <Heading id={id} className={cn("text-slate-900", Heading === "h2" ? "font-bold" : "text-2xl font-semibold tracking-[-0.015em] md:text-3xl")}>
          {title}
        </Heading>
        {description ? <p data-heading-description className={styles.headingDescription}>{description}</p> : null}
      </div>
      {action ? <div className={styles.headingAction}>{action}</div> : null}
    </div>
  );
}
