"use client";

import { PlusIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type RecordColumn<T> = {
  key: string;
  label: string;
  align?: "start" | "end";
  render: (row: T) => ReactNode;
};

type RecordTableProps<T> = {
  title: string;
  description?: string;
  addLabel: string;
  actionsLabel: string;
  onAdd: () => void;
  columns: ReadonlyArray<RecordColumn<T>>;
  rows: readonly T[];
  rowKey: (row: T) => string;
  emptyLabel: string;
  renderActions: (row: T) => ReactNode;
  renderCard: (row: T) => ReactNode;
};

export function RecordTable<T>({
  title, description, addLabel, actionsLabel, onAdd, columns, rows, rowKey, emptyLabel, renderActions, renderCard,
}: RecordTableProps<T>) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-semibold text-slate-950">{title}</h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
              {rows.length}
            </span>
          </div>
          {description ? <p className="mt-1 max-w-prose text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
        <Button type="button" size="sm" onClick={onAdd}>
          <PlusIcon data-icon="inline-start" />
          {addLabel}
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500">
          {emptyLabel}
        </p>
      ) : (
        <>
          <ul className="grid gap-3 md:hidden">
            {rows.map((row) => (
              <li key={rowKey(row)} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                {renderCard(row)}
                <div className="mt-3 flex items-center justify-end gap-1 border-t border-slate-100 pt-3">
                  {renderActions(row)}
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        scope="col"
                        className={cn("px-5 py-3", column.align === "end" ? "text-end" : "text-start")}
                      >
                        {column.label}
                      </th>
                    ))}
                    <th scope="col" className="px-5 py-3 text-end">
                      <span className="sr-only">{actionsLabel}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={rowKey(row)} className="border-t border-slate-200 align-middle transition hover:bg-slate-50/70">
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={cn("px-5 py-4 text-slate-700", column.align === "end" ? "text-end" : "text-start")}
                        >
                          {column.render(row)}
                        </td>
                      ))}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">{renderActions(row)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
