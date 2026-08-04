"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import { failureMessageKey, isFailureCode } from "./page-editor-errors";
import { AdminPageStatusBadge, type AdminPagePublicationState } from "./page-status-badge";

export type PagePublicationIntent = "PUBLISH_NOW" | "RETURN_TO_DRAFT" | "ARCHIVE";

const ALLOWED_INTENTS_BY_STATUS: Record<
  AdminPagePublicationState,
  readonly PagePublicationIntent[]
> = {
  DRAFT: ["PUBLISH_NOW", "ARCHIVE"],
  PUBLISHED: ["RETURN_TO_DRAFT", "ARCHIVE"],
  ARCHIVED: ["RETURN_TO_DRAFT"],
};

export function availableIntents(
  state: AdminPagePublicationState,
  canPublish: boolean,
): readonly PagePublicationIntent[] {
  if (!canPublish) return [];
  return ALLOWED_INTENTS_BY_STATUS[state];
}

type PagePublicationActionsProps = {
  pageId: string;
  state: AdminPagePublicationState;
  canPublish: boolean;
  mutationBusy: boolean;
  beginMutation: () => { token: number; version: number } | null;
  finishMutation: (token: number, nextVersion?: number) => void;
};

export function PagePublicationActions({
  pageId,
  state,
  canPublish,
  mutationBusy,
  beginMutation,
  finishMutation,
}: PagePublicationActionsProps) {
  const t = useTranslations("AdminPagePublication");
  const fieldId = useId();
  const [pending, setPending] = useState<PagePublicationIntent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const intents = availableIntents(state, canPublish);
  if (intents.length === 0) return null;

  async function submit(intent: PagePublicationIntent) {
    if (pending || mutationBusy) return;
    const lease = beginMutation();
    if (!lease) return;
    setError(null);
    setPending(intent);
    let released = false;
    try {
      const response = await fetch("/api/admin/pages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          action: "PUBLICATION",
          payload: { intent, pageId, expectedVersion: lease.version },
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
      setPending(null);
    }
  }

  const labelFor: Record<PagePublicationIntent, string> = {
    PUBLISH_NOW: t("action.PUBLISH_NOW"),
    RETURN_TO_DRAFT: t("action.RETURN_TO_DRAFT"),
    ARCHIVE: t("action.ARCHIVE"),
  };

  return (
    <section
      aria-labelledby={`${fieldId}-title`}
      className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-4 py-4 sm:px-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${fieldId}-title`} className="font-display text-base font-medium text-slate-900">
          {t("title")}
        </h2>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>{t("currentLabel")}</span>
          <AdminPageStatusBadge state={state} label={t(`state.${state}`)} />
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {intents.map((intent) => (
          <Button
            key={intent}
            type="button"
            variant={intent === "PUBLISH_NOW" ? "default" : "outline"}
            disabled={pending !== null || mutationBusy}
            onClick={() => void submit(intent)}
          >
            {pending === intent ? <Spinner data-icon /> : null}
            {labelFor[intent]}
          </Button>
        ))}
      </div>
    </section>
  );
}
