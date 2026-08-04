type Visibility = "PUBLIC" | "HIDDEN" | "EXPIRED";

type PublicContentStatusBadgeProps = {
  visibility: Visibility;
  label: string;
};

export type {Visibility as PublicContentVisibility};

export function PublicContentStatusBadge({visibility, label}: PublicContentStatusBadgeProps) {
  const colors: Record<Visibility, string> = {
    PUBLIC: "bg-emerald-100 text-emerald-800 border-emerald-200",
    HIDDEN: "bg-slate-100 text-slate-600 border-slate-200",
    EXPIRED: "bg-amber-100 text-amber-800 border-amber-200",
  };
  return (
    <span className={`inline-flex h-6 items-center rounded-full border px-2 text-xs font-medium ${colors[visibility]}`}>
      {label}
    </span>
  );
}
