"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useId, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export const MAX_IMAGE_BYTES = 5_242_880;
export const ACCEPTED_IMAGE_TYPE = "image/webp";

/** The transport's failure codes, mapped to translation keys; unknown collapses to UNAVAILABLE. */
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

export type ImageUploadValidation =
  | { ok: true }
  | { ok: false; reason: "missing" | "type" | "size" | "altRequired" | "altNotEmpty" };

/** Client-side pre-check mirroring the CMS_IMAGE metadata refine; the server stays the authority. */
export function validateImageUpload(
  file: File | null,
  alt: string,
  isDecorative: boolean,
): ImageUploadValidation {
  if (!file) return { ok: false, reason: "missing" };
  if (file.type !== ACCEPTED_IMAGE_TYPE) return { ok: false, reason: "type" };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, reason: "size" };
  if (isDecorative && alt.trim().length > 0) return { ok: false, reason: "altNotEmpty" };
  if (!isDecorative && alt.trim().length === 0) return { ok: false, reason: "altRequired" };
  return { ok: true };
}

/** Assemble the exact multipart body the upload route accepts for a single CMS image. */
export function buildImageUploadFormData(
  file: File,
  alt: string,
  isDecorative: boolean,
): FormData {
  const metadata = {
    policy: "CMS_IMAGE" as const,
    uploadCount: 1,
    intents: [{ policy: "CMS_IMAGE" as const, alt: isDecorative ? "" : alt.trim(), isDecorative }],
  };
  const form = new FormData();
  form.append("metadata", JSON.stringify(metadata));
  form.append("files", file);
  return form;
}

export function MediaUpload() {
  const t = useTranslations("AdminMediaUpload");
  const router = useRouter();
  const formId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [isDecorative, setIsDecorative] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);

  function reset() {
    setFile(null);
    setAlt("");
    setIsDecorative(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading) return;
    setFieldError(null);
    setFormError(null);
    setSuccess(false);

    const check = validateImageUpload(file, alt, isDecorative);
    if (!check.ok) {
      setFieldError(t(`validation.${check.reason}`));
      return;
    }

    setUploading(true);
    try {
      const response = await fetch("/api/admin/media/upload", {
        method: "POST",
        credentials: "same-origin",
        body: buildImageUploadFormData(file as File, alt, isDecorative),
      });
      const result: unknown = await response.json().catch(() => null);
      if (
        response.ok
        && typeof result === "object"
        && result !== null
        && (result as { ok?: unknown }).ok === true
      ) {
        reset();
        setSuccess(true);
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

      {formError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {formError}
        </div>
      ) : null}
      {success ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {t("success")}
        </div>
      ) : null}

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${formId}-file`}>{t("file")}</FieldLabel>
          <Input
            id={`${formId}-file`}
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPE}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setFieldError(null);
              setSuccess(false);
            }}
          />
          <FieldDescription id={`${formId}-file-description`}>{t("fileHint")}</FieldDescription>
        </Field>

        <Field orientation="horizontal">
          <Checkbox
            id={`${formId}-decorative`}
            checked={isDecorative}
            onCheckedChange={(checked) => setIsDecorative(checked === true)}
          />
          <FieldLabel htmlFor={`${formId}-decorative`}>{t("decorative")}</FieldLabel>
        </Field>

        {!isDecorative ? (
          <Field>
            <FieldLabel htmlFor={`${formId}-alt`}>{t("alt")}</FieldLabel>
            <Input
              id={`${formId}-alt`}
              value={alt}
              onChange={(event) => setAlt(event.target.value)}
              aria-invalid={fieldError ? true : undefined}
              autoComplete="off"
            />
            <FieldDescription>{t("altHint")}</FieldDescription>
          </Field>
        ) : null}

        {fieldError ? (
          <p role="alert" className="text-sm text-destructive">
            {fieldError}
          </p>
        ) : null}
      </FieldGroup>

      <Button type="submit" disabled={uploading} className="w-fit">
        {uploading ? <Spinner data-icon /> : null}
        {uploading ? t("uploading") : t("action")}
      </Button>
    </form>
  );
}
