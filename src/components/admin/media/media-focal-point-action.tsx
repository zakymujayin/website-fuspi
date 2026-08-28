"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { FocalPointEditor } from "./focal-point-editor";

/** `{x}`/`{y}` substitution for a raw (un-interpolated) i18n template — kept local so the
 * hint text can react to client-side coordinate changes without a function crossing the
 * server/client boundary (Server Components can't pass functions as props). */
function fillCoordinateTemplate(template: string, x: number, y: number): string {
  return template.replace(/\{x\}/g, String(x)).replace(/\{y\}/g, String(y));
}

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

export type AdminMediaFocalPointErrorCode = (typeof FAILURE_CODES)[number];
export type AdminMediaFocalPointErrorLabels = Record<AdminMediaFocalPointErrorCode, string>;

export type AdminMediaFocalPointActionLabels = {
  action: string;
  editorLabel: string;
  /** Raw (un-interpolated) template containing literal `{x}`/`{y}` tokens — filled in client-side as the point moves. */
  hintTemplate: string;
  cancel: string;
  save: string;
  saving: string;
  errors: AdminMediaFocalPointErrorLabels;
};

type AdminMediaFocalPointActionProps = {
  mediaId: string;
  imageUrl: string;
  alt: string;
  isDecorative: boolean;
  initialFocalX: number | null;
  initialFocalY: number | null;
  labels: AdminMediaFocalPointActionLabels;
};

function failureLabel(code: unknown, labels: AdminMediaFocalPointErrorLabels): string {
  return typeof code === "string" && (FAILURE_CODES as readonly string[]).includes(code)
    ? labels[code as AdminMediaFocalPointErrorCode]
    : labels.UNAVAILABLE;
}

/** Small opt-in control on an otherwise read-only Media Library card — the grid stays inert until expanded. */
export function AdminMediaFocalPointAction({
  mediaId, imageUrl, alt, isDecorative, initialFocalX, initialFocalY, labels,
}: AdminMediaFocalPointActionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [x, setX] = useState(initialFocalX);
  const [y, setY] = useState(initialFocalY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          action: "UPDATE_METADATA",
          payload: { mediaId, alt, isDecorative, focalX: x, focalY: y },
        }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (
        response.ok
        && typeof result === "object"
        && result !== null
        && (result as { ok?: unknown }).ok === true
      ) {
        setOpen(false);
        router.refresh();
        return;
      }
      const code = typeof result === "object" && result !== null
        ? (result as { code?: unknown }).code
        : undefined;
      setError(failureLabel(code, labels.errors));
    } catch {
      setError(labels.errors.UNAVAILABLE);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
        {labels.action}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 p-2">
      <FocalPointEditor
        imageUrl={imageUrl}
        alt={alt}
        x={x}
        y={y}
        onChange={(nextX, nextY) => {
          setX(nextX);
          setY(nextY);
        }}
        label={labels.editorLabel}
        hint={fillCoordinateTemplate(labels.hintTemplate, x ?? 50, y ?? 50)}
      />
      {error ? (
        <p role="alert" className="text-xs text-destructive">{error}</p>
      ) : null}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="flex-1"
          disabled={saving}
          onClick={() => {
            setOpen(false);
            setError(null);
            setX(initialFocalX);
            setY(initialFocalY);
          }}
        >
          {labels.cancel}
        </Button>
        <Button type="button" size="sm" className="flex-1" disabled={saving} onClick={() => void save()}>
          {saving ? <Spinner data-icon /> : null}
          {saving ? labels.saving : labels.save}
        </Button>
      </div>
    </div>
  );
}
