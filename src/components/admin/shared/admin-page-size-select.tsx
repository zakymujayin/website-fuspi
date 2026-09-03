"use client";

import type { ChangeEvent } from "react";

import { useRouter } from "@/i18n/navigation";

import {
  ADMIN_PAGE_SIZE_OPTIONS,
  type AdminPageSize,
} from "./admin-page-size-options";

export { ADMIN_PAGE_SIZE_OPTIONS, type AdminPageSize } from "./admin-page-size-options";

type AdminPageSizeSelectProps = {
  value: AdminPageSize;
  href: string;
  label: string;
  optionLabels: readonly string[];
};

function withPageSize(href: string, size: AdminPageSize): string {
  const [pathname, query = ""] = href.split("?", 2);
  const params = new URLSearchParams(query);
  params.delete("page");

  if (size === 10) params.delete("pageSize");
  else params.set("pageSize", String(size));

  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

export function AdminPageSizeSelectClient({ value, href, label, optionLabels }: AdminPageSizeSelectProps) {
  const router = useRouter();

  function change(event: ChangeEvent<HTMLSelectElement>) {
    const next = Number(event.target.value) as AdminPageSize;
    if (next !== value) router.push(withPageSize(href, next));
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
        {ADMIN_PAGE_SIZE_OPTIONS.map((size, index) => (
          <option key={size} value={size}>
            {optionLabels[index] ?? String(size)}
          </option>
        ))}
      </select>
    </label>
  );
}
