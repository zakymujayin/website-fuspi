"use client";

import { ImageOffIcon } from "lucide-react";

import {
  buildAdminImagePickerHref,
  mergeAdminMediaPickerItems,
  parseAdminMediaPickerPage,
} from "@/components/admin/media/media-picker-pagination";
import { AdminMediaThumbnail } from "@/components/admin/media/media-thumbnail";
import { resolveAdminMediaThumbnail } from "@/components/admin/media/media-thumbnail-resolver";
import { MediaPickerCropPanel } from "@/components/admin/media/media-picker-crop-panel";
import { MediaPickerUploadPanel } from "@/components/admin/media/media-picker-upload-panel";
import { useAdminMediaPickerState } from "@/components/admin/media/use-admin-media-picker-state";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { AdminMediaItem } from "@/contracts/media-admin";
import type { CoverPreview } from "@/components/admin/posts/post-cover-picker";
import { cn } from "@/lib/utils";

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
  loadMoreLabel: string;
};

export function HomeMediaPicker({
  value, onChange, initialMedia, uploadPublicUrl,
  label, description, chooseLabel, changeLabel, clearLabel, selectedLabel, noneLabel,
  loadingLabel, loadErrorLabel, emptyLabel, listLabel, loadMoreLabel,
}: HomeMediaPickerProps) {
  const {
    open, setOpen, items, setItems, loading, setLoading, loadError, setLoadError,
    page, setPage, hasNextPage, setHasNextPage, previews, setPreviews,
  } = useAdminMediaPickerState(initialMedia ? { [initialMedia.id]: initialMedia } : {});

  const selected = value ? previews[value] ?? null : null;
  const selectedThumb = selected ? resolveAdminMediaThumbnail(selected, uploadPublicUrl) : null;

  async function loadImages(targetPage = 1) {
    if (loading) return;
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch(buildAdminImagePickerHref(targetPage), {
        credentials: "same-origin",
        headers: { accept: "application/json" },
      });
      const data: unknown = await response.json().catch(() => null);
      const result = parseAdminMediaPickerPage(data);
      if (response.ok && result) {
        const list = result.items;
        setItems((current) => (targetPage === 1 || current === null
          ? list
          : mergeAdminMediaPickerItems(current, list)));
        setPage(result.page);
        setHasNextPage(result.hasNextPage);
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
    <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div>
        <h3 className="text-sm font-medium text-slate-700">{label}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {selected && selectedThumb ? (
          <AdminMediaThumbnail
            thumbnail={selectedThumb}
            className="aspect-video w-40 rounded-xl border border-slate-200 shadow-sm"
          />
        ) : (
          <div
            aria-hidden
            className="flex aspect-video w-40 items-center justify-center rounded-xl border-2 border-dashed border-royal-200 bg-royal-50/40 text-royal-300"
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

      {selectedThumb?.kind === "image" ? (
        <MediaPickerCropPanel
          key={selectedThumb.src}
          imageSrc={selectedThumb.src}
          alt={selectedThumb.alt}
          isDecorative={selectedThumb.isDecorative}
          onReplaced={choose}
        />
      ) : null}

      {open ? (
        <div className="flex flex-col gap-4 rounded-2xl border-2 border-royal-100 bg-slate-50/70 p-4 shadow-sm sm:p-5">
          <MediaPickerUploadPanel onUploaded={(item) => choose(item)} />
          {loading && items === null ? (
            <p role="status" className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner data-icon />
              {loadingLabel}
            </p>
          ) : loadError && items === null ? (
            <p role="alert" className="text-sm text-destructive">{loadErrorLabel}</p>
          ) : items && items.length > 0 ? (
            <>
              <ul aria-label={listLabel} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((item) => {
                  const isCurrent = item.id === value;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        aria-pressed={isCurrent}
                        onClick={() => choose(item)}
                        className={cn(
                          "group flex w-full flex-col overflow-hidden rounded-xl border bg-white text-start transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-500",
                          isCurrent
                            ? "border-royal-500 ring-2 ring-royal-500/30"
                            : "border-slate-200 hover:-translate-y-0.5 hover:border-royal-300 hover:shadow-sm",
                        )}
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
              {loadError ? (
                <p role="alert" className="text-sm text-destructive">{loadErrorLabel}</p>
              ) : null}
              {hasNextPage ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadImages(page + 1)}
                  disabled={loading}
                  className="self-start"
                >
                  {loading ? <Spinner data-icon /> : null}
                  {loadMoreLabel}
                </Button>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-slate-500">{emptyLabel}</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
