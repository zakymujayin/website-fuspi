import type { AdminMediaItem } from "@/contracts/media-admin";
import type { AppLocale } from "@/i18n/routing";

import { AdminMediaItemCard, type AdminMediaItemCardLabels } from "./media-item-card";

type AdminMediaGridProps = {
  items: readonly AdminMediaItem[];
  locale: AppLocale;
  uploadPublicUrl: string;
  ariaLabel: string;
  labels: AdminMediaItemCardLabels;
};

/** Responsive Media Library grid: 4 columns (desktop) → 2 (tablet) → 1 (mobile), per docs/03 and docs/17-D. */
export function AdminMediaGrid({ items, locale, uploadPublicUrl, ariaLabel, labels }: AdminMediaGridProps) {
  return (
    <ul aria-label={ariaLabel} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <AdminMediaItemCard
          key={item.id}
          item={item}
          locale={locale}
          uploadPublicUrl={uploadPublicUrl}
          labels={labels}
        />
      ))}
    </ul>
  );
}
