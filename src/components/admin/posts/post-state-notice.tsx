import { CircleAlertIcon, NewspaperIcon, type LucideIcon } from "lucide-react";

type AdminPostStateNoticeProps = {
  variant: "empty" | "unavailable";
  title: string;
  description: string;
};

const VARIANT_ICON: Record<AdminPostStateNoticeProps["variant"], LucideIcon> = {
  empty: NewspaperIcon,
  unavailable: CircleAlertIcon,
};

/**
 * Empty list vs. query-unavailable state. Only `unavailable` is an alert — an ordinary empty list
 * is not an error and must not interrupt assistive technology. Unavailable never receives technical
 * detail, only the translated copy passed in by the route.
 */
export function AdminPostStateNotice({ variant, title, description }: AdminPostStateNoticeProps) {
  const Icon = VARIANT_ICON[variant];

  return (
    <div
      role={variant === "unavailable" ? "alert" : undefined}
      className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-12 text-center"
    >
      <Icon aria-hidden className="size-10 text-slate-300" strokeWidth={1.5} />
      <h2 className="text-balance font-display text-base font-medium text-slate-900">{title}</h2>
      <p className="max-w-prose text-sm text-slate-500">{description}</p>
    </div>
  );
}
