"use client";

import { useTranslations } from "next-intl";
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

import { failureMessageKey, isFailureCode } from "./page-editor-errors";

type PageDeleteActionProps = {
  pageId: string;
  canDelete: boolean;
  listHref: string;
  mutationBusy: boolean;
  beginMutation: () => { token: number; version: number } | null;
  finishMutation: (token: number, nextVersion?: number) => void;
};

export function PageDeleteAction({
  pageId,
  canDelete,
  listHref,
  mutationBusy,
  beginMutation,
  finishMutation,
}: PageDeleteActionProps) {
  const t = useTranslations("AdminPageDelete");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canDelete) return null;

  async function confirmDelete() {
    if (deleting || mutationBusy) return;
    const lease = beginMutation();
    if (!lease) return;
    const expectedVersion = lease.version;
    setError(null);
    setDeleting(true);
    let released = false;
    try {
      const response = await fetch("/api/admin/pages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          action: "DELETE",
          payload: { pageId, expectedVersion },
        }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (
        response.ok
        && typeof result === "object"
        && result !== null
        && (result as { ok?: unknown }).ok === true
      ) {
        const nextVersion = (result as { version?: unknown }).version;
        finishMutation(
          lease.token,
          typeof nextVersion === "number" ? nextVersion : undefined,
        );
        released = true;
        router.push(listHref);
        router.refresh();
        return;
      }
      const code = typeof result === "object" && result !== null
        ? (result as { code?: unknown }).code
        : undefined;
      setError(t(failureMessageKey(isFailureCode(code) ? code : "UNAVAILABLE")));
    } catch {
      setError(t("error.UNAVAILABLE"));
    } finally {
      if (!released) finishMutation(lease.token);
      setDeleting(false);
    }
  }

  return (
    <section
      aria-labelledby="admin-page-delete-title"
      className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-4 sm:px-5"
    >
      <div>
        <h2 id="admin-page-delete-title" className="font-display text-base font-medium text-slate-900">
          {t("title")}
        </h2>
        <p className="mt-1 max-w-prose text-sm text-slate-500">{t("description")}</p>
      </div>

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setError(null);
        }}
      >
        <AlertDialogTrigger
          render={
            <Button
              type="button"
              variant="destructive"
              className="w-fit"
              disabled={mutationBusy}
            >
              {t("action")}
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirmDescription")}</AlertDialogDescription>
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
            <AlertDialogCancel disabled={deleting}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              disabled={deleting || mutationBusy}
              onClick={() => void confirmDelete()}
            >
              {deleting ? <Spinner data-icon /> : null}
              {t("confirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
