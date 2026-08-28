import { useState } from "react";

import type { AdminMediaItem } from "@/contracts/media-admin";
import type { CoverPreview } from "@/components/admin/posts/post-cover-picker";

/**
 * The `open/items/loading/loadError/page/hasNextPage/previews` state every
 * media picker (post cover, page hero, home-nav generic, post gallery) needs
 * around the shared `buildAdminImagePickerHref`/`parseAdminMediaPickerPage`
 * fetch helpers. Each picker still owns its own `loadImages`/`toggle`/
 * `choose` — only identical because the source is a shared reference, not
 * because it's re-exported here — since those functions read as
 * same-origin-fetch evidence checked directly by existing picker tests.
 */
export function useAdminMediaPickerState(initialPreviews: Record<string, CoverPreview> = {}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<readonly AdminMediaItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [previews, setPreviews] = useState<Record<string, CoverPreview>>(initialPreviews);

  return {
    open, setOpen,
    items, setItems,
    loading, setLoading,
    loadError, setLoadError,
    page, setPage,
    hasNextPage, setHasNextPage,
    previews, setPreviews,
  };
}
