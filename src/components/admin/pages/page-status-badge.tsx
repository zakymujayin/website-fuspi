"use client";

import { cn } from "@/lib/utils";

export type AdminPagePublicationState = "DRAFT" | "PUBLISHED" | "ARCHIVED";

type AdminPageStatusBadgeProps = {
  state: AdminPagePublicationState;
  label: string;
};

const STATE_STYLE: Record<AdminPagePublicationState, string> = {
  DRAFT: "border-slate-300 bg-slate-50 text-slate-600",
  PUBLISHED: "border-emerald-300 bg-emerald-50 text-emerald-700",
  ARCHIVED: "border-slate-300 bg-white text-slate-500",
};

export function AdminPageStatusBadge({ state, label }: AdminPageStatusBadgeProps) {
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
