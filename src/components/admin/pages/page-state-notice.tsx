import { CircleAlertIcon, FileTextIcon, type LucideIcon } from "lucide-react";

type AdminPageStateNoticeProps = {
  variant: "empty" | "unavailable";
  title: string;
  description: string;
};

const VARIANT_ICON: Record<AdminPageStateNoticeProps["variant"], LucideIcon> = {
  empty: FileTextIcon,
  unavailable: CircleAlertIcon,
};

export function AdminPageStateNotice({ variant, title, description }: AdminPageStateNoticeProps) {
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
