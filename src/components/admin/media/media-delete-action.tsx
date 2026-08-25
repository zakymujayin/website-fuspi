"use client";

import { Trash2Icon } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

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

export type AdminMediaDeleteErrorCode = (typeof FAILURE_CODES)[number];
export type AdminMediaDeleteErrorLabels = Record<AdminMediaDeleteErrorCode, string>;

export type AdminMediaDeleteActionLabels = {
  action: string;
  pending: string;
  confirmTitle: string;
  confirmDescription: string;
  confirmAction: string;
  cancel: string;
  errors: AdminMediaDeleteErrorLabels;
};

type AdminMediaDeleteActionProps = {
  mediaId: string;
  labels: AdminMediaDeleteActionLabels;
};

function deleteFailureLabel(code: unknown, labels: AdminMediaDeleteErrorLabels): string {
  return typeof code === "string" && (FAILURE_CODES as readonly string[]).includes(code)
    ? labels[code as AdminMediaDeleteErrorCode]
    : labels.UNAVAILABLE;
}

export function AdminMediaDeleteAction({ mediaId, labels }: AdminMediaDeleteActionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          action: "DELETE",
          payload: { mediaId },
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
      setError(deleteFailureLabel(code, labels.errors));
    } catch {
      setError(labels.errors.UNAVAILABLE);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <AlertDialogTrigger
        render={
          <Button type="button" variant="destructive" size="sm" className="w-full">
            <Trash2Icon data-icon />
            {labels.action}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{labels.confirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>{labels.confirmDescription}</AlertDialogDescription>
        </AlertDialogHeader>

        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>{labels.cancel}</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={() => void confirmDelete()}
          >
            {deleting ? <Spinner data-icon /> : null}
            {deleting ? labels.pending : labels.confirmAction}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
