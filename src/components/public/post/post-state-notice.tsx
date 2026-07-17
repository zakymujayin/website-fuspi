import { CircleAlert, Newspaper, type LucideIcon } from "lucide-react";

type PostStateNoticeProps = {
  variant: "empty" | "unavailable";
  title: string;
  description: string;
  /**
   * Semantic heading level for `title`. The caller must pick this so the
   * page keeps exactly one `H1`: use `"h1"` only when this notice replaces
   * the page's own H1 (e.g. the detail route's env/DB-failure state, which
   * returns before the article H1 renders); use `"h2"` everywhere else
   * (list empty/unavailable, in-article unavailable) since an H1 already
   * exists elsewhere on those pages.
   */
  headingAs: "h1" | "h2";
};

const VARIANT_ICON: Record<PostStateNoticeProps["variant"], LucideIcon> = {
  empty: Newspaper,
  unavailable: CircleAlert,
};

/**
 * Empty archive vs. query-unavailable state (docs/17-H). Unavailable never
 * receives technical detail — only the translated, non-technical copy passed
 * in by the route (manifest data requirement 2).
 */
export function PostStateNotice({ variant, title, description, headingAs: Heading }: PostStateNoticeProps) {
  const Icon = VARIANT_ICON[variant];

  return (
    <div
      role={variant === "unavailable" ? "alert" : undefined}
      className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-12 text-center"
    >
      <Icon aria-hidden className="size-10 text-slate-300" strokeWidth={1.5} />
      <Heading className="text-balance font-display text-base font-medium text-slate-900">{title}</Heading>
      <p className="max-w-prose text-sm text-slate-500">{description}</p>
    </div>
  );
}
