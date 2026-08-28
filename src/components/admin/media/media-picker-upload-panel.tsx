"use client";

import { UploadIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";

import { findAdminMediaItemById } from "@/components/admin/media/media-picker-pagination";
import {
  ImageUploadPreview,
  buildImageBatchFormData,
  cropLabels,
  newImageUploadRow,
  uploadFailureKey,
  validateImageBatch,
  type ImageUploadRow,
} from "@/components/admin/media/media-upload";
import { ImageCropEditor } from "@/components/admin/media/image-crop-editor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { AdminMediaItem } from "@/contracts/media-admin";

type MediaPickerUploadPanelProps = {
  /** Called once the uploaded file is committed and its full list item is known (matched off a page-1 refetch). */
  onUploaded: (item: AdminMediaItem) => void;
};

/** One new file, uploaded from inside a picker, immediately selected — no trip to the standalone Media Library page. */
export function MediaPickerUploadPanel({ onUploaded }: MediaPickerUploadPanelProps) {
  const t = useTranslations("AdminMediaPickerUpload");
  const formId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [row, setRow] = useState<ImageUploadRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function reset() {
    setRow(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function updateRow(patch: Partial<Omit<ImageUploadRow, "originalFile">>) {
    setRow((current) => (current ? { ...current, ...patch } : current));
  }

  async function upload() {
    if (!row || uploading) return;
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
        const uploaded = typeof mediaId === "string" ? await findAdminMediaItemById(mediaId) : null;
        if (uploaded) onUploaded(uploaded);
        reset();
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

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-700">{t("title")}</p>
        <Input
          id={`${formId}-file`}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          ref={inputRef}
          className="max-w-64"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            setError(null);
            setRow(file ? newImageUploadRow(file) : null);
          }}
        />
      </div>

      {row ? (
        <div className="flex flex-col gap-2">
          <ImageCropEditor
            file={row.originalFile}
            isCropped={row.file !== row.originalFile}
            onApply={(cropped) => updateRow({ file: cropped })}
            onReset={() => updateRow({ file: row.originalFile })}
            labels={cropLabels(t)}
          />
          <ImageUploadPreview
            file={row.file}
            x={row.focalX}
            y={row.focalY}
            onChange={(focalX, focalY) => updateRow({ focalX, focalY })}
            label={t("focalPointEditorLabel")}
            hint={t("focalPointHint", { x: row.focalX ?? 50, y: row.focalY ?? 50 })}
          />
          <Field orientation="horizontal">
            <Checkbox
              id={`${formId}-dec`}
              checked={row.isDecorative}
              onCheckedChange={(checked) => updateRow({ isDecorative: checked === true, alt: "" })}
            />
            <FieldLabel htmlFor={`${formId}-dec`}>{t("decorative")}</FieldLabel>
          </Field>
          {!row.isDecorative ? (
            <Field>
              <FieldLabel htmlFor={`${formId}-alt`}>{t("alt")}</FieldLabel>
              <Input
                id={`${formId}-alt`}
                value={row.alt}
                onChange={(event) => updateRow({ alt: event.target.value })}
                autoComplete="off"
              />
            </Field>
          ) : null}

          {error ? (
            <p role="alert" className="text-xs text-destructive">{error}</p>
          ) : null}

          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={reset} disabled={uploading}>
              <XIcon data-icon />
              {t("cancel")}
            </Button>
            <Button type="button" size="sm" onClick={() => void upload()} disabled={uploading}>
              {uploading ? <Spinner data-icon /> : <UploadIcon data-icon />}
              {uploading ? t("uploading") : t("action")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
