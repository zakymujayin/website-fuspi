"use client";

import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { FocalPointEditor } from "./focal-point-editor";
import { ImageCropEditor, type ImageCropLabels } from "./image-crop-editor";

export const MAX_IMAGE_BYTES = 5_242_880;
export const MAX_PDF_BYTES = 20_971_520;
export const MAX_IMAGE_COUNT = 20;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ACCEPTED_IMAGE_TYPE = "image/webp";
export const ACCEPTED_PDF_TYPE = "application/pdf";
const ACCEPTED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;
const ACCEPTED_IMAGE_INPUT = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_IMAGE_EXTENSIONS].join(",");
const IMAGE_EXTENSIONS_BY_MIME: Record<(typeof ACCEPTED_IMAGE_TYPES)[number], readonly string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};
const FALLBACK_BROWSER_IMAGE_TYPES = new Set(["", "application/octet-stream"]);

export type UploadPolicy = "CMS_IMAGE" | "PUBLIC_PDF";

/** One selected image and its per-file accessibility metadata. */
export type ImageUploadRow = {
  /** The file that gets uploaded — the cropped result once `originalFile` has been cropped, else identical to it. */
  file: File;
  /** The pristine pick, kept so a crop can be re-done or reverted without compounding quality loss. */
  originalFile: File;
  alt: string;
  isDecorative: boolean;
  focalX: number | null;
  focalY: number | null;
};

/** A fresh row for a newly picked file — nothing cropped yet. */
export function newImageUploadRow(file: File): ImageUploadRow {
  return { file, originalFile: file, alt: "", isDecorative: false, focalX: null, focalY: null };
}

/** The parts of a row that shape the upload request; `originalFile` is editor-only state. */
export type ImageUploadIntent = Omit<ImageUploadRow, "originalFile">;

const FAILURE_CODES = [
  "SESSION_INVALID",
  "CSRF_INVALID",
  "REQUEST_INVALID",
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "MEDIA_IN_USE",
  "UPLOAD_FAILED",
  "UNAVAILABLE",
] as const;

export function uploadFailureKey(code: unknown): string {
  return typeof code === "string" && (FAILURE_CODES as readonly string[]).includes(code)
    ? `error.${code}`
    : "error.UNAVAILABLE";
}

export function isAcceptedImageFile(file: Pick<File, "name" | "type">): boolean {
  const mimeType = file.type.trim().toLowerCase();
  const extension = imageUploadExtension(file);
  if (!extension) return false;
  if (FALLBACK_BROWSER_IMAGE_TYPES.has(mimeType)) return true;
  return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(mimeType)
    && IMAGE_EXTENSIONS_BY_MIME[mimeType as (typeof ACCEPTED_IMAGE_TYPES)[number]].includes(extension);
}

export function imageUploadExtension(file: Pick<File, "name" | "type">): string | null {
  const normalizedName = file.name.normalize("NFKC").trim().toLowerCase();
  const nameExtension = ACCEPTED_IMAGE_EXTENSIONS.find((extension) => normalizedName.endsWith(extension));
  const mimeType = file.type.trim().toLowerCase();
  if (nameExtension) return nameExtension;
  if ((ACCEPTED_IMAGE_TYPES as readonly string[]).includes(mimeType)) {
    return IMAGE_EXTENSIONS_BY_MIME[mimeType as (typeof ACCEPTED_IMAGE_TYPES)[number]][0] ?? null;
  }
  return null;
}

export function toSafeImageUploadName(file: Pick<File, "name" | "type">): string {
  const normalized = file.name.normalize("NFKC").trim();
  const lower = normalized.toLowerCase();
  const extension = imageUploadExtension(file) ?? ".webp";
  const stem = lower.endsWith(extension)
    ? normalized.slice(0, -extension.length)
    : normalized.replace(/\.[^.]*$/u, "");
  const safeStem = stem
    .replace(/[^\p{L}\p{N} _()-]+/gu, "-")
    .replace(/\s+/gu, " ")
    .replace(/-+/gu, "-")
    .replace(/^[- ]+|[- ]+$/gu, "");
  return `${safeStem || "media"}${extension}`;
}

export type BatchValidation =
  | { ok: true }
  | {
      ok: false;
      index: number | null;
      reason: "missing" | "count" | "type" | "size" | "altRequired" | "altNotEmpty";
    };

/** Client-side pre-check for a CMS image batch; mirrors the per-file metadata refine. */
export function validateImageBatch(rows: readonly ImageUploadIntent[]): BatchValidation {
  if (rows.length === 0) return { ok: false, index: null, reason: "missing" };
  if (rows.length > MAX_IMAGE_COUNT) return { ok: false, index: null, reason: "count" };
  for (let index = 0; index < rows.length; index += 1) {
    const { file, alt, isDecorative } = rows[index];
    if (!isAcceptedImageFile(file)) return { ok: false, index, reason: "type" };
    if (file.size > MAX_IMAGE_BYTES) return { ok: false, index, reason: "size" };
    if (isDecorative && alt.trim().length > 0) return { ok: false, index, reason: "altNotEmpty" };
    if (!isDecorative && alt.trim().length === 0) return { ok: false, index, reason: "altRequired" };
  }
  return { ok: true };
}

/** Client-side pre-check for the single PDF policy. */
export function validatePdf(file: File | null): BatchValidation {
  if (!file) return { ok: false, index: null, reason: "missing" };
  if (file.type !== ACCEPTED_PDF_TYPE) return { ok: false, index: null, reason: "type" };
  if (file.size > MAX_PDF_BYTES) return { ok: false, index: null, reason: "size" };
  return { ok: true };
}

/** Assemble the frozen multipart body for a CMS image batch, one intent + one file per row, in order. */
export function buildImageBatchFormData(rows: readonly ImageUploadIntent[]): FormData {
  const metadata = {
    policy: "CMS_IMAGE" as const,
    uploadCount: rows.length,
    intents: rows.map((row) => ({
      policy: "CMS_IMAGE" as const,
      alt: row.isDecorative ? "" : row.alt.trim(),
      isDecorative: row.isDecorative,
      focalX: row.focalX,
      focalY: row.focalY,
    })),
  };
  const form = new FormData();
  form.append("metadata", JSON.stringify(metadata));
  for (const row of rows) form.append("files", row.file, toSafeImageUploadName(row.file));
  return form;
}

/** Assemble the frozen multipart body for the single public PDF (no accessibility metadata). */
export function buildPdfFormData(file: File): FormData {
  const metadata = {
    policy: "PUBLIC_PDF" as const,
    uploadCount: 1,
    intents: [{ policy: "PUBLIC_PDF" as const, alt: "", isDecorative: false }],
  };
  const form = new FormData();
  form.append("metadata", JSON.stringify(metadata));
  form.append("files", file);
  return form;
}

type ImageUploadPreviewProps = {
  file: File;
  x: number | null;
  y: number | null;
  onChange: (x: number, y: number) => void;
  label: string;
  hint: string;
};

/**
 * Owns the object-URL lifecycle for one row's local file preview. Create and
 * revoke live in the same effect so StrictMode's mount/unmount/mount cycle
 * revokes then recreates the URL, instead of leaving a revoked src on the img.
 */
export function ImageUploadPreview({ file, x, y, onChange, label, hint }: ImageUploadPreviewProps) {
  const [url, setUrl] = useState<string | null>(null);

  // Create and revoke stay paired in one effect so StrictMode's mount/unmount/mount
  // recreates the URL it just revoked; deriving it in render instead leaves a revoked
  // src on the img after that cycle.
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- paired create/revoke, see above
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!url) return null;

  return <FocalPointEditor imageUrl={url} alt="" x={x} y={y} onChange={onChange} label={label} hint={hint} />;
}

type CropTranslator = (key: string, values?: Record<string, string | number>) => string;

/** Label bundle for `ImageCropEditor`, off any translator whose namespace carries a `crop.*` block. */
export function cropLabels(t: CropTranslator): ImageCropLabels {
  return {
    title: t("crop.title"),
    instructions: t("crop.instructions"),
    apply: t("crop.apply"),
    reset: t("crop.reset"),
    applied: t("crop.applied"),
    error: t("crop.error"),
  };
}

export function MediaUpload() {
  const t = useTranslations("AdminMediaUpload");
  const router = useRouter();
  const formId = useId();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [policy, setPolicy] = useState<UploadPolicy>("CMS_IMAGE");
  const [images, setImages] = useState<ImageUploadRow[]>([]);
  const [pdf, setPdf] = useState<File | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function resetAll() {
    setImages([]);
    setPdf(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  }

  function switchPolicy(next: UploadPolicy) {
    if (next === policy) return;
    setPolicy(next);
    setFieldError(null);
    setFormError(null);
    setSuccess(null);
    resetAll();
  }

  function updateImage(index: number, patch: Partial<Omit<ImageUploadRow, "originalFile">>) {
    setImages((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    );
  }

  function removeImage(index: number) {
    setImages((current) => current.filter((_, rowIndex) => rowIndex !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading) return;
    setFieldError(null);
    setFormError(null);
    setSuccess(null);

    const validation = policy === "CMS_IMAGE" ? validateImageBatch(images) : validatePdf(pdf);
    if (!validation.ok) {
      const suffix = validation.index === null ? "" : ` (${validation.index + 1})`;
      setFieldError(`${t(`validation.${validation.reason}`)}${suffix}`);
      return;
    }

    setUploading(true);
    try {
      const body =
        policy === "CMS_IMAGE" ? buildImageBatchFormData(images) : buildPdfFormData(pdf as File);
      const response = await fetch("/api/admin/media/upload", {
        method: "POST",
        credentials: "same-origin",
        body,
      });
      const result: unknown = await response.json().catch(() => null);
      if (
        response.ok
        && typeof result === "object"
        && result !== null
        && (result as { ok?: unknown }).ok === true
      ) {
        const count = Array.isArray((result as { items?: unknown[] }).items)
          ? (result as { items: unknown[] }).items.length
          : 1;
        resetAll();
        setSuccess(t("success", { count }));
        router.refresh();
        return;
      }
      const code = typeof result === "object" && result !== null
        ? (result as { code?: unknown }).code
        : undefined;
      setFormError(t(uploadFailureKey(code)));
    } catch {
      setFormError(t("error.UNAVAILABLE"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby={`${formId}-title`}
      className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-4 py-4 sm:px-5"
    >
      <div>
        <h2 id={`${formId}-title`} className="font-display text-base font-medium text-slate-900">
          {t("title")}
        </h2>
        <p className="mt-1 max-w-prose text-sm text-slate-500">{t("description")}</p>
      </div>

      <div role="group" aria-label={t("policyLabel")} className="flex flex-wrap gap-2">
        {(["CMS_IMAGE", "PUBLIC_PDF"] as const).map((option) => (
          <Button
            key={option}
            type="button"
            variant={policy === option ? "default" : "outline"}
            aria-pressed={policy === option}
            onClick={() => switchPolicy(option)}
          >
            {t(`policy.${option}`)}
          </Button>
        ))}
      </div>

      {formError ? (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {formError}
        </div>
      ) : null}
      {success ? (
        <div role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      {policy === "CMS_IMAGE" ? (
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`${formId}-images`}>{t("images")}</FieldLabel>
            <Input
              id={`${formId}-images`}
              ref={imageInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_INPUT}
              multiple
              onChange={(event) => {
                const files = [...(event.target.files ?? [])];
                setImages(files.map(newImageUploadRow));
                setFieldError(null);
                setSuccess(null);
              }}
            />
            <FieldDescription>{t("imagesHint", { max: MAX_IMAGE_COUNT })}</FieldDescription>
          </Field>

          {images.length > 0 ? (
            <ul aria-label={t("selectedLabel")} className="flex flex-col gap-3">
              {images.map((row, index) => (
                <li
                  key={`${row.originalFile.name}-${index}`}
                  className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-slate-700">{row.originalFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("removeLabel", { name: row.originalFile.name })}
                      onClick={() => removeImage(index)}
                    >
                      <XIcon data-icon />
                    </Button>
                  </div>
                  <ImageCropEditor
                    file={row.originalFile}
                    isCropped={row.file !== row.originalFile}
                    onApply={(cropped) => updateImage(index, { file: cropped })}
                    onReset={() => updateImage(index, { file: row.originalFile })}
                    labels={cropLabels(t)}
                  />
                  <ImageUploadPreview
                    file={row.file}
                    x={row.focalX}
                    y={row.focalY}
                    onChange={(focalX, focalY) => updateImage(index, { focalX, focalY })}
                    label={t("focalPointEditorLabel")}
                    hint={t("focalPointHint", { x: row.focalX ?? 50, y: row.focalY ?? 50 })}
                  />
                  <Field orientation="horizontal">
                    <Checkbox
                      id={`${formId}-dec-${index}`}
                      checked={row.isDecorative}
                      onCheckedChange={(checked) =>
                        updateImage(index, { isDecorative: checked === true })
                      }
                    />
                    <FieldLabel htmlFor={`${formId}-dec-${index}`}>{t("decorative")}</FieldLabel>
                  </Field>
                  {!row.isDecorative ? (
                    <Field>
                      <FieldLabel htmlFor={`${formId}-alt-${index}`}>{t("alt")}</FieldLabel>
                      <Input
                        id={`${formId}-alt-${index}`}
                        value={row.alt}
                        onChange={(event) => updateImage(index, { alt: event.target.value })}
                        autoComplete="off"
                      />
                    </Field>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </FieldGroup>
      ) : (
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`${formId}-pdf`}>{t("pdf")}</FieldLabel>
            <Input
              id={`${formId}-pdf`}
              ref={pdfInputRef}
              type="file"
              accept={ACCEPTED_PDF_TYPE}
              onChange={(event) => {
                setPdf(event.target.files?.[0] ?? null);
                setFieldError(null);
                setSuccess(null);
              }}
            />
            <FieldDescription>{t("pdfHint")}</FieldDescription>
          </Field>
        </FieldGroup>
      )}

      {fieldError ? (
        <p role="alert" className="text-sm text-destructive">
          {fieldError}
        </p>
      ) : null}

      <Button type="submit" disabled={uploading} className="w-fit">
        {uploading ? <Spinner data-icon /> : null}
        {uploading ? t("uploading") : t("action")}
      </Button>
    </form>
  );
}
