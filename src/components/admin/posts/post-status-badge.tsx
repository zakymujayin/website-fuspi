import { cn } from "@/lib/utils";

export type AdminPostPublicationState = "DRAFT" | "PUBLISHED" | "SCHEDULED" | "ARCHIVED";

type AdminPostStatusBadgeProps = {
  state: AdminPostPublicationState;
  label: string;
};

/**
 * Publication state, not raw status: the frozen contract models a future-dated PUBLISHED row as
 * SCHEDULED, and an editor must be able to tell those apart at a glance. Colour is paired with
 * distinct text so state is never conveyed by hue alone.
 */
const STATE_STYLE: Record<AdminPostPublicationState, string> = {
  DRAFT: "border-slate-300 bg-slate-50 text-slate-600",
  PUBLISHED: "border-emerald-300 bg-emerald-50 text-emerald-700",
  SCHEDULED: "border-amber-300 bg-amber-50 text-amber-700",
  ARCHIVED: "border-slate-300 bg-white text-slate-500",
};

export function AdminPostStatusBadge({ state, label }: AdminPostStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-full border px-2.5 text-xs font-medium",
        STATE_STYLE[state],
      )}
    >
      {label}
    </span>
  );
}
