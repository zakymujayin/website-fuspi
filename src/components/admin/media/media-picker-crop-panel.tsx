"use client";

import { CropIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ImageCropEditor } from "@/components/admin/media/image-crop-editor";
import { findAdminMediaItemById } from "@/components/admin/media/media-picker-pagination";
import {
  buildImageBatchFormData,
  cropLabels,
  uploadFailureKey,
  validateImageBatch,
} from "@/components/admin/media/media-upload";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { AdminMediaItem } from "@/contracts/media-admin";

type MediaPickerCropPanelProps = {
  /** Same-origin `/uploads/...` path of the currently selected image (from `resolveAdminMediaThumbnail`). */
  imageSrc: string;
  alt: string;
  isDecorative: boolean;
  /** Receives the freshly uploaded, cropped copy — the original media is left untouched. */
  onReplaced: (item: AdminMediaItem) => void;
};

/**
 * "Crop this image" for an already-uploaded pick: pull the stored file back into
 * the browser, crop it with {@link ImageCropEditor}, upload the result as a new
 * Media entry, and hand that back so the picker selects it.
 */
export function MediaPickerCropPanel({ imageSrc, alt, isDecorative, onReplaced }: MediaPickerCropPanelProps) {
  const t = useTranslations("AdminMediaPickerUpload");
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function expand() {
    setOpen(true);
    if (file || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(imageSrc, { credentials: "same-origin" });
      if (!response.ok) throw new Error("fetch failed");
      const blob = await response.blob();
      const name = imageSrc.split("/").pop() || "image.webp";
      setFile(new File([blob], name, { type: blob.type || "image/webp" }));
    } catch {
      setError(t("cropExisting.loadError"));
    } finally {
      setLoading(false);
    }
  }

  function collapse() {
    setOpen(false);
    setError(null);
  }

  async function handleCropped(cropped: File) {
    if (uploading) return;
    const decorative = isDecorative || alt.trim() === "";
    const row = {
      file: cropped,
      alt: decorative ? "" : alt.trim(),
      isDecorative: decorative,
      focalX: null,
      focalY: null,
    };
    const validation = validateImageBatch([row]);
    if (!validation.ok) {
      setError(t(`validation.${validation.reason}`));
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/media/upload", {
        method: "POST",
        credentials: "same-origin",
        body: buildImageBatchFormData([row]),
      });
      const result: unknown = await response.json().catch(() => null);
      if (
        response.ok
        && typeof result === "object"
        && result !== null
        && (result as { ok?: unknown }).ok === true
      ) {
        const mediaId = (result as { items?: Array<{ mediaId?: unknown }> }).items?.[0]?.mediaId;
        const item = typeof mediaId === "string" ? await findAdminMediaItemById(mediaId) : null;
        if (item) onReplaced(item);
        setFile(null);
        collapse();
        return;
      }
      const code = typeof result === "object" && result !== null
        ? (result as { code?: unknown }).code
        : undefined;
      setError(t(uploadFailureKey(code)));
    } catch {
      setError(t("error.UNAVAILABLE"));
    } finally {
      setUploading(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => void expand()}>
        <CropIcon data-icon />
        {t("cropExisting.button")}
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
      {loading ? (
        <p role="status" className="flex items-center gap-2 text-sm text-slate-500">
          <Spinner data-icon />
          {t("cropExisting.loading")}
        </p>
      ) : uploading ? (
        <p role="status" className="flex items-center gap-2 text-sm text-slate-500">
          <Spinner data-icon />
          {t("uploading")}
        </p>
      ) : file ? (
        <ImageCropEditor
          file={file}
          isCropped={false}
          onApply={(cropped) => void handleCropped(cropped)}
          onReset={collapse}
          labels={cropLabels(t)}
        />
      ) : null}

      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}

      <div className="flex">
        <Button type="button" size="sm" variant="ghost" onClick={collapse} disabled={uploading}>
          <XIcon data-icon />
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
