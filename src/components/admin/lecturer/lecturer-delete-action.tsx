"use client";

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

type LecturerDeleteActionProps = {
  lecturerId: string;
  lecturerName: string;
  labels: {
    delete: string;
    confirmTitle: string;
    confirmDescription: string;
    cancel: string;
    confirm: string;
    inUse: string;
    unavailable: string;
  };
};

export function LecturerDeleteAction({ lecturerId, lecturerName, labels }: LecturerDeleteActionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteLecturer() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/academic/people", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "DELETE", resource: "LECTURER", id: lecturerId }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (response.ok && typeof result === "object" && result !== null && (result as { ok?: unknown }).ok === true) {
        setOpen(false);
        router.refresh();
        return;
      }
      const code = typeof result === "object" && result !== null ? (result as { code?: unknown }).code : null;
      setError(code === "IN_USE" ? labels.inUse : labels.unavailable);
    } catch {
      setError(labels.unavailable);
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(null); }}>
      <AlertDialogTrigger
        render={<Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" />}
      >
        {labels.delete}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{labels.confirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {labels.confirmDescription.replace("{name}", lecturerName)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{labels.cancel}</AlertDialogCancel>
          <AlertDialogAction type="button" variant="destructive" disabled={pending} onClick={() => void deleteLecturer()}>
            {pending ? <Spinner data-icon /> : null}
            {labels.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

