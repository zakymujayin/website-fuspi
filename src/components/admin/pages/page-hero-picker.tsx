"use client";

import { ImageOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  buildAdminImagePickerHref,
  mergeAdminMediaPickerItems,
  parseAdminMediaPickerPage,
} from "@/components/admin/media/media-picker-pagination";
import { AdminMediaThumbnail } from "@/components/admin/media/media-thumbnail";
import { resolveAdminMediaThumbnail } from "@/components/admin/media/media-thumbnail-resolver";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { AdminMediaItem } from "@/contracts/media-admin";
import { cn } from "@/lib/utils";

export type HeroPreview = Pick<
  AdminMediaItem,
  "id" | "url" | "mimeType" | "width" | "height" | "alt" | "isDecorative"
>;

type PageHeroPickerProps = {
  value: string | null;
  onChange: (id: string | null) => void;
  initialHero: HeroPreview | null;
  uploadPublicUrl: string;
};

export function PageHeroPicker({
  value,
  onChange,
  initialHero,
  uploadPublicUrl,
}: PageHeroPickerProps) {
  const t = useTranslations("AdminPageHeroPicker");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<readonly AdminMediaItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [previews, setPreviews] = useState<Record<string, HeroPreview>>(() =>
    initialHero ? { [initialHero.id]: initialHero } : {},
  );

  const selected = value ? previews[value] ?? null : null;

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
    <section aria-labelledby="admin-page-hero-title" className="flex flex-col gap-3">
      <div>
        <h3 id="admin-page-hero-title" className="text-sm font-medium text-slate-700">
          {t("label")}
        </h3>
        <p className="mt-1 text-sm text-slate-500">{t("description")}</p>
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
          <p className="text-sm text-slate-600">{selected ? t("selected") : t("none")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              aria-expanded={open}
              aria-controls="admin-page-hero-list"
              onClick={toggle}
            >
              {value ? t("change") : t("choose")}
            </Button>
            {value ? (
              <Button type="button" variant="ghost" onClick={() => onChange(null)}>
                {t("clear")}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {open ? (
        <div
          id="admin-page-hero-list"
          className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4"
        >
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
              <ul
                aria-label={t("listLabel")}
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
              >
                {items.map((item) => {
                  const isCurrent = item.id === value;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        aria-pressed={isCurrent}
                        aria-label={t("selectLabel", { name: item.originalName })}
                        onClick={() => choose(item)}
                        className={cn(
                          "group flex w-full flex-col overflow-hidden rounded-lg border text-start transition-colors",
                          isCurrent
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
            <p className="text-sm text-slate-500">{t("empty")}</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
