"use client";

import {FileCheck2, Link2, Trash2, Upload} from "lucide-react";
import {useTranslations} from "next-intl";
import {useId, useRef, useState} from "react";

import {Button} from "@/components/ui/button";
import {Field, FieldDescription, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Spinner} from "@/components/ui/spinner";
import {
  buildPdfFormData,
  validatePdf,
  uploadFailureKey,
  type BatchValidation,
} from "@/components/admin/media/media-upload";

export type CertificatePreview = {
  id: string;
  url: string;
  originalName: string;
  size: number;
};

type Props = {
  value: string | null;
  onChange: (id: string | null) => void;
  initialCertificate: CertificatePreview | null;
};

function fileSize(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

async function findPdf(mediaId: string): Promise<CertificatePreview | null> {
  try {
    const response = await fetch("/api/admin/media?kind=PDF&page=1&pageSize=48", {
      credentials: "same-origin",
      headers: {accept: "application/json"},
    });
    const result: unknown = await response.json().catch(() => null);
    if (!response.ok || typeof result !== "object" || result === null) return null;
    const items = (result as {items?: unknown}).items;
    if (!Array.isArray(items)) return null;
    const item = items.find((entry) => typeof entry === "object" && entry !== null && (entry as {id?: unknown}).id === mediaId) as {
      id?: unknown; url?: unknown; originalName?: unknown; size?: unknown;
    } | undefined;
    if (
      !item || typeof item.id !== "string" || typeof item.url !== "string"
      || typeof item.originalName !== "string" || typeof item.size !== "number"
    ) return null;
    return {id: item.id, url: item.url, originalName: item.originalName, size: item.size};
  } catch {
    return null;
  }
}

export function ProgramCertificatePicker({value, onChange, initialCertificate}: Props) {
  const t = useTranslations("AdminMediaUpload");
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<CertificatePreview | null>(initialCertificate);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    const file = inputRef.current?.files?.[0] ?? null;
    const validation: BatchValidation = validatePdf(file);
    if (!validation.ok) {
      setError(t(`validation.${validation.reason}`));
      return;
    }
    if (uploading) return;
    setUploading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/media/upload", {
        method: "POST",
        credentials: "same-origin",
        body: buildPdfFormData(file as File),
      });
      const result: unknown = await response.json().catch(() => null);
      const mediaId = typeof result === "object" && result !== null
        ? (result as {items?: Array<{mediaId?: unknown}>}).items?.[0]?.mediaId
        : null;
      const next = typeof mediaId === "string" ? await findPdf(mediaId) : null;
      if (response.ok && next) {
        setPreview(next);
        onChange(next.id);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
      const code = typeof result === "object" && result !== null ? (result as {code?: unknown}).code : undefined;
      setError(t(uploadFailureKey(code)));
    } catch {
      setError(t("error.UNAVAILABLE"));
    } finally {
      setUploading(false);
    }
  }

  function clear() {
    setPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-medium text-slate-700">Sertifikat akreditasi</h3>
        <p className="mt-1 text-sm text-slate-500">Unggah satu file PDF sertifikat yang akan ditampilkan untuk publik.</p>
      </div>
      {preview && value ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-royal-100 bg-royal-50/60 px-3 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <FileCheck2 aria-hidden className="size-5 shrink-0 text-royal-600" strokeWidth={1.5} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">{preview.originalName}</p>
              <p className="text-xs text-slate-500">{fileSize(preview.size)}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={preview.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-royal-700 hover:underline"
            >
              <Link2 aria-hidden className="size-4" />
              Lihat PDF
            </a>
            <Button type="button" variant="ghost" size="icon-sm" onClick={clear} aria-label="Hapus sertifikat">
              <Trash2 data-icon />
            </Button>
          </div>
        </div>
      ) : null}
      <Field>
        <FieldLabel htmlFor={`${id}-file`}>{preview ? "Ganti sertifikat" : "Pilih file PDF"}</FieldLabel>
        <Input
          id={`${id}-file`}
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="h-auto min-h-12 cursor-pointer rounded-xl border-2 border-dashed border-royal-200 bg-royal-50/40 px-3 py-2.5 text-sm text-slate-600 transition-colors file:me-3 file:inline-flex file:h-8 file:min-h-8 file:items-center file:align-middle file:box-border file:cursor-pointer file:rounded-lg file:border-0 file:bg-royal-500 file:px-4 file:py-1.5 file:font-semibold file:leading-5 file:text-white file:transition-colors hover:border-royal-400 hover:bg-royal-50/70 hover:file:bg-royal-600 focus-visible:border-royal-500 focus-visible:ring-3 focus-visible:ring-royal-500/25"
        />
        <FieldDescription>Maksimal 20 MB.</FieldDescription>
      </Field>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" variant="outline" onClick={() => void upload()} disabled={uploading} className="w-fit">
        {uploading ? <Spinner data-icon /> : <Upload data-icon />}
        {uploading ? t("uploading") : "Unggah sertifikat"}
      </Button>
    </section>
  );
}
