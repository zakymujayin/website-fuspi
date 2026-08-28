"use client";

import type { ChangeEvent } from "react";

import { useRouter } from "@/i18n/navigation";

export const ADMIN_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export type AdminPageSize = (typeof ADMIN_PAGE_SIZE_OPTIONS)[number];

type AdminPageSizeSelectProps = {
  value: AdminPageSize;
  buildHref: (size: AdminPageSize) => string;
  label: string;
  optionLabel: (size: AdminPageSize) => string;
};

export function AdminPageSizeSelect({ value, buildHref, label, optionLabel }: AdminPageSizeSelectProps) {
  const router = useRouter();

  function change(event: ChangeEvent<HTMLSelectElement>) {
    const next = Number(event.target.value) as AdminPageSize;
    if (next !== value) router.push(buildHref(next));
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm text-slate-500">
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={change}
        className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-700 focus:border-royal-500 focus:outline-none focus:ring-1 focus:ring-royal-500"
      >
        {ADMIN_PAGE_SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {optionLabel(size)}
          </option>
        ))}
      </select>
    </label>
  );
}
