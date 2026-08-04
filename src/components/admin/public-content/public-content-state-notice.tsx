import {CircleAlertIcon, FileQuestionIcon} from "lucide-react";

type StateNoticeVariant = "empty" | "unavailable";

type PublicContentStateNoticeProps = {
  variant: StateNoticeVariant;
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function PublicContentStateNotice({
  variant,
  title,
  description,
  action,
}: PublicContentStateNoticeProps) {
  const Icon = variant === "empty" ? FileQuestionIcon : CircleAlertIcon;
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-12 text-center sm:px-8"
    >
      <Icon aria-hidden className="size-10 text-slate-300" strokeWidth={1.5} />
      <div>
        <h2 className="font-display text-base font-medium text-slate-900">{title}</h2>
        <p className="mt-1 max-w-prose text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}
