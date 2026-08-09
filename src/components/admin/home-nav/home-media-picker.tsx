"use client";

import { ImageOffIcon } from "lucide-react";
import { useState } from "react";

import { AdminMediaThumbnail } from "@/components/admin/media/media-thumbnail";
import { resolveAdminMediaThumbnail } from "@/components/admin/media/media-thumbnail-resolver";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { AdminMediaItem } from "@/contracts/media-admin";
import type { CoverPreview } from "@/components/admin/posts/post-cover-picker";

type HomeMediaPickerProps = {
  value: string | null;
  onChange: (id: string | null) => void;
  initialMedia: CoverPreview | null;
  uploadPublicUrl: string;
  label: string;
  description: string;
  chooseLabel: string;
  changeLabel: string;
  clearLabel: string;
  selectedLabel: string;
  noneLabel: string;
  loadingLabel: string;
  loadErrorLabel: string;
  emptyLabel: string;
  listLabel: string;
};

export function HomeMediaPicker({
  value, onChange, initialMedia, uploadPublicUrl,
  label, description, chooseLabel, changeLabel, clearLabel, selectedLabel, noneLabel,
  loadingLabel, loadErrorLabel, emptyLabel, listLabel,
}: HomeMediaPickerProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<readonly AdminMediaItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [previews, setPreviews] = useState<Record<string, CoverPreview>>(() =>
    initialMedia ? { [initialMedia.id]: initialMedia } : {},
  );

  const selected = value ? previews[value] ?? null : null;

  async function loadImages() {
    if (loading) return;
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch("/api/admin/media?kind=IMAGE", {
        credentials: "same-origin",
        headers: { accept: "application/json" },
      });
      const data: unknown = await response.json().catch(() => null);
      if (
        response.ok
        && typeof data === "object"
        && data !== null
        && Array.isArray((data as { items?: unknown }).items)
      ) {
        const list = (data as { items: AdminMediaItem[] }).items;
        setItems(list);
        setPreviews((current) => {
          const next = { ...current };
          for (const item of list) next[item.id] = item;
          return next;
        });
      } else {
        setLoadError(true);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && items === null && !loading) void loadImages();
  }

  function choose(item: AdminMediaItem) {
    setPreviews((current) => ({ ...current, [item.id]: item }));
    onChange(item.id);
    setOpen(false);
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-medium text-slate-700">{label}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {selected ? (
          <AdminMediaThumbnail
            thumbnail={resolveAdminMediaThumbnail(selected, uploadPublicUrl)}
            className="aspect-video w-40 rounded-lg"
          />
        ) : (
          <div
            aria-hidden
            className="flex aspect-video w-40 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-300"
          >
            <ImageOffIcon className="size-8" strokeWidth={1.5} />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <p className="text-sm text-slate-600">{selected ? selectedLabel : noneLabel}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" aria-expanded={open} onClick={toggle}>
              {value ? changeLabel : chooseLabel}
            </Button>
            {value ? (
              <Button type="button" variant="ghost" onClick={() => onChange(null)}>
                {clearLabel}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {open ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {loading ? (
            <p role="status" className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner data-icon />
              {loadingLabel}
            </p>
          ) : loadError ? (
            <p role="alert" className="text-sm text-destructive">{loadErrorLabel}</p>
          ) : items && items.length > 0 ? (
            <ul aria-label={listLabel} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((item) => {
                const isCurrent = item.id === value;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-pressed={isCurrent}
                      onClick={() => choose(item)}
                      className={
                        "group flex w-full flex-col overflow-hidden rounded-lg border text-start transition-colors "
                        + (isCurrent ? "border-royal-500 ring-2 ring-royal-500/30" : "border-slate-200 hover:border-slate-300")
                      }
                    >
                      <AdminMediaThumbnail
                        thumbnail={resolveAdminMediaThumbnail(item, uploadPublicUrl)}
                        className="aspect-video w-full"
                      />
                      <span className="truncate px-2 py-1.5 text-xs text-slate-600">{item.originalName}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">{emptyLabel}</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
