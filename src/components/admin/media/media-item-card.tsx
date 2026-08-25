import type { AdminMediaItem } from "@/contracts/media-admin";
import type { AppLocale } from "@/i18n/routing";

import {
  AdminMediaDeleteAction,
  type AdminMediaDeleteErrorLabels,
} from "./media-delete-action";
import { formatAdminMediaBytes, formatAdminMediaCreatedAt, formatAdminMediaDimensions } from "./media-format";
import { AdminMediaThumbnail } from "./media-thumbnail";
import { resolveAdminMediaThumbnail } from "./media-thumbnail-resolver";

export type AdminMediaItemCardLabels = {
  kindImage: string;
  kindPdf: string;
  decorative: string;
  altLabel: (alt: string) => string;
  uploadedByLabel: (name: string) => string;
  deleteAction: string;
  deletePending: string;
  deleteConfirmTitle: string;
  deleteConfirmDescription: (name: string) => string;
  deleteConfirmAction: string;
  deleteCancel: string;
  deleteErrors: AdminMediaDeleteErrorLabels;
};

type AdminMediaItemCardProps = {
  item: AdminMediaItem;
  locale: AppLocale;
  uploadPublicUrl: string;
  labels: AdminMediaItemCardLabels;
};

/** One read-only Media Library grid item (manifest presentation requirement 3). */
export function AdminMediaItemCard({ item, locale, uploadPublicUrl, labels }: AdminMediaItemCardProps) {
  const thumbnail = resolveAdminMediaThumbnail(item, uploadPublicUrl);
  const isImage = item.mimeType === "image/webp";
  const sizeLabel =
    item.width !== null && item.height !== null
      ? `${formatAdminMediaBytes(item.size, locale)} · ${formatAdminMediaDimensions(item.width, item.height, locale)} px`
      : formatAdminMediaBytes(item.size, locale);

  return (
    <li className="flex flex-col overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
      <AdminMediaThumbnail thumbnail={thumbnail} className="aspect-square w-full" />
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <span className="w-fit rounded-full bg-royal-50 px-2 py-0.5 text-xs font-medium tracking-wide text-royal-700 uppercase">
          {isImage ? labels.kindImage : labels.kindPdf}
        </span>
        <p className="line-clamp-2 text-sm font-medium break-words text-slate-900" title={item.originalName}>
          {item.originalName}
        </p>
        <p className="text-xs text-slate-500">{sizeLabel}</p>
        {isImage ? (
          <p className="line-clamp-2 text-xs break-words text-slate-500">
            {item.isDecorative ? labels.decorative : labels.altLabel(item.alt)}
          </p>
        ) : null}
        {item.uploaderName ? (
          <p className="text-xs text-slate-500">{labels.uploadedByLabel(item.uploaderName)}</p>
        ) : null}
        <div className="mt-auto flex flex-col gap-2 pt-2">
          <time dateTime={item.createdAt} className="text-xs text-slate-500">
            {formatAdminMediaCreatedAt(item.createdAt, locale)}
          </time>
          <AdminMediaDeleteAction
            mediaId={item.id}
            labels={{
              action: labels.deleteAction,
              pending: labels.deletePending,
              confirmTitle: labels.deleteConfirmTitle,
              confirmDescription: labels.deleteConfirmDescription(item.originalName),
              confirmAction: labels.deleteConfirmAction,
              cancel: labels.deleteCancel,
              errors: labels.deleteErrors,
            }}
          />
        </div>
      </div>
    </li>
  );
}
