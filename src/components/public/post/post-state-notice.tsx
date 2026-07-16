import { CircleAlert, Newspaper, type LucideIcon } from "lucide-react";

type PostStateNoticeProps = {
  variant: "empty" | "unavailable";
  title: string;
  description: string;
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
export function PostStateNotice({ variant, title, description }: PostStateNoticeProps) {
  const Icon = VARIANT_ICON[variant];

  return (
    <div
      role={variant === "unavailable" ? "alert" : undefined}
      className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-12 text-center"
    >
      <Icon aria-hidden className="size-10 text-slate-300" strokeWidth={1.5} />
      <p className="font-display text-base font-medium text-slate-900">{title}</p>
      <p className="max-w-prose text-sm text-slate-500">{description}</p>
    </div>
  );
}
