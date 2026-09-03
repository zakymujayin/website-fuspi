import { CircleAlertIcon, ImagesIcon, type LucideIcon } from "lucide-react";

type AdminMediaStateNoticeProps = {
  variant: "empty" | "unavailable";
  title: string;
  description: string;
};

const VARIANT_ICON: Record<AdminMediaStateNoticeProps["variant"], LucideIcon> = {
  empty: ImagesIcon,
  unavailable: CircleAlertIcon,
};

/**
 * Empty library vs. query-unavailable state (docs/17-H). Unavailable never
 * receives technical detail — only the translated, non-technical copy passed
 * in by the route (manifest data requirement 4). The page's own H1 always
 * renders above this notice, so the heading here is always an H2.
 */
export function AdminMediaStateNotice({ variant, title, description }: AdminMediaStateNoticeProps) {
  const Icon = VARIANT_ICON[variant];

  return (
    <div
      role={variant === "unavailable" ? "alert" : undefined}
      className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm"
    >
      <Icon aria-hidden className="size-10 text-slate-300" strokeWidth={1.5} />
      <h2 className="text-balance font-display text-base font-medium text-slate-900">{title}</h2>
      <p className="max-w-prose text-sm text-slate-500">{description}</p>
    </div>
  );
}
