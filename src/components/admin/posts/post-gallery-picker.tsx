"use client";

import { ImageOffIcon, PlusIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  buildAdminImagePickerHref,
  mergeAdminMediaPickerItems,
  parseAdminMediaPickerPage,
} from "@/components/admin/media/media-picker-pagination";
import { AdminMediaThumbnail } from "@/components/admin/media/media-thumbnail";
import { resolveAdminMediaThumbnail } from "@/components/admin/media/media-thumbnail-resolver";
import { MediaPickerUploadPanel } from "@/components/admin/media/media-picker-upload-panel";
import { useAdminMediaPickerState } from "@/components/admin/media/use-admin-media-picker-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { AdminMediaItem } from "@/contracts/media-admin";
import { cn } from "@/lib/utils";

import type { CoverPreview } from "./post-cover-picker";
import type { PostEditorImageDraft } from "./post-editor-payload";

const MAX_IMAGES = 20;

type PostGalleryPickerProps = {
  value: readonly PostEditorImageDraft[];
  onChange: (images: readonly PostEditorImageDraft[]) => void;
  /** Previews for images already attached (edit mode) so they render without a refetch. */
  initialPreviews?: Record<string, CoverPreview>;
  uploadPublicUrl: string;
};

export function PostGalleryPicker({
  value,
  onChange,
  initialPreviews = {},
  uploadPublicUrl,
}: PostGalleryPickerProps) {
  const t = useTranslations("AdminPostGalleryPicker");
  const {
    open, setOpen, items, setItems, loading, setLoading, loadError, setLoadError,
    page, setPage, hasNextPage, setHasNextPage, previews, setPreviews,
  } = useAdminMediaPickerState(initialPreviews);

  const atLimit = value.length >= MAX_IMAGES;
  const selectedIds = new Set(value.map((image) => image.mediaId));

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

  function add(item: AdminMediaItem) {
    if (atLimit || selectedIds.has(item.id)) return;
    setPreviews((current) => ({ ...current, [item.id]: item }));
    onChange([...value, { mediaId: item.id, caption: "" }]);
  }

  function remove(mediaId: string) {
    onChange(value.filter((image) => image.mediaId !== mediaId));
  }

  function setCaption(mediaId: string, caption: string) {
    onChange(value.map((image) => (image.mediaId === mediaId ? { ...image, caption } : image)));
  }

  return (
    <section aria-labelledby="admin-post-gallery-title" className="flex flex-col gap-3">
      <div>
        <h3 id="admin-post-gallery-title" className="text-sm font-medium text-slate-700">
          {t("label")}
        </h3>
        <p className="mt-1 text-sm text-slate-500">{t("description")}</p>
      </div>

      {value.length > 0 ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {value.map((image) => {
            const preview = previews[image.mediaId] ?? null;
            return (
              <li key={image.mediaId} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-2">
                <div className="relative">
                  {preview ? (
                    <AdminMediaThumbnail
                      thumbnail={resolveAdminMediaThumbnail(preview, uploadPublicUrl)}
                      className="aspect-video w-full rounded-md"
                    />
                  ) : (
                    <div
                      aria-hidden
                      className="flex aspect-video w-full items-center justify-center rounded-md bg-slate-50 text-slate-300"
                    >
                      <ImageOffIcon className="size-6" strokeWidth={1.5} />
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-xs"
                    aria-label={t("removeLabel")}
                    onClick={() => remove(image.mediaId)}
                    className="absolute end-1.5 top-1.5"
                  >
                    <XIcon aria-hidden data-icon strokeWidth={1.5} />
                  </Button>
                </div>
                <Input
                  value={image.caption}
                  onChange={(event) => setCaption(image.mediaId, event.target.value)}
                  placeholder={t("captionPlaceholder")}
                  aria-label={t("captionLabel")}
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">{t("empty")}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          aria-expanded={open}
          aria-controls="admin-post-gallery-list"
          onClick={toggle}
          disabled={atLimit}
        >
          <PlusIcon aria-hidden data-icon strokeWidth={1.5} />
          {t("addLabel")}
        </Button>
        {atLimit ? <span className="text-xs text-slate-400">{t("maxReached")}</span> : null}
      </div>

      {open ? (
        <div id="admin-post-gallery-list" className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4">
          {!atLimit ? <MediaPickerUploadPanel onUploaded={(item) => add(item)} /> : null}
          {loading && items === null ? (
            <p role="status" className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner data-icon />
              {t("loading")}
            </p>
          ) : loadError && items === null ? (
            <p role="alert" className="text-sm text-destructive">
              {t("loadError")}
            </p>
          ) : items && items.length > 0 ? (
            <>
              <ul aria-label={t("listLabel")} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={t("selectLabel", { name: item.originalName })}
                        onClick={() => add(item)}
                        disabled={isSelected || atLimit}
                        className={cn(
                          "group flex w-full flex-col overflow-hidden rounded-lg border text-start transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                          isSelected
                            ? "border-royal-500 ring-2 ring-royal-500/30"
                            : "border-slate-200 hover:border-slate-300",
                        )}
                      >
                        <AdminMediaThumbnail
                          thumbnail={resolveAdminMediaThumbnail(item, uploadPublicUrl)}
                          className="aspect-video w-full"
                        />
                        <span className="truncate px-2 py-1.5 text-xs text-slate-600">
                          {item.originalName}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {loadError ? (
                <p role="alert" className="text-sm text-destructive">
                  {t("loadError")}
                </p>
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
                  {t("loadMore")}
                </Button>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-slate-500">{t("libraryEmpty")}</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
