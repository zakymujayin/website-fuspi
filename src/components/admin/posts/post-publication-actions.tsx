"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

import { failureMessageKey, isFailureCode } from "./post-editor-errors";
import {
  availableIntents,
  type PostPublicationIntent,
} from "./post-publication-transitions";
import { AdminPostStatusBadge, type AdminPostPublicationState } from "./post-status-badge";
import type { PostEditorType } from "./post-editor-payload";

type PostPublicationActionsProps = {
  postId: string;
  postType?: PostEditorType;
  state: AdminPostPublicationState;
  canPublish: boolean;
  mutationBusy: boolean;
  beginMutation: () => { token: number; version: number } | null;
  finishMutation: (token: number, nextVersion?: number) => void;
};

export function PostPublicationActions({
  postId,
  postType = "BERITA",
  state,
  canPublish,
  mutationBusy,
  beginMutation,
  finishMutation,
}: PostPublicationActionsProps) {
  const t = useTranslations("AdminPostPublication");
  const router = useRouter();
  const fieldId = useId();
  const [scheduleAt, setScheduleAt] = useState("");
  const [pending, setPending] = useState<PostPublicationIntent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const intents = availableIntents(state, canPublish);
  if (intents.length === 0) return null;

  async function submit(intent: PostPublicationIntent, publishedAt?: string) {
    if (pending || mutationBusy) return;
    const lease = beginMutation();
    if (!lease) return;
    setError(null);
    setPending(intent);
    let released = false;
    try {
      const payload =
        intent === "SCHEDULE"
          ? { intent, postId, expectedVersion: lease.version, publishedAt }
          : { intent, postId, expectedVersion: lease.version };
      const response = await fetch("/api/admin/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          action: postType === "KOLOM" ? "PUBLICATION_COLUMN" : "PUBLICATION",
          payload,
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
      setPending(null);
    }
  }

  function onSchedule() {
    // A local-datetime input has no timezone; the browser's zone is intended, so build an ISO
    // string with offset. An empty or past value is rejected here before any request.
    if (!scheduleAt) {
      setScheduleError(t("scheduleRequired"));
      return;
    }
    const when = new Date(scheduleAt);
    if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      setScheduleError(t("scheduleFuture"));
      return;
    }
    setScheduleError(null);
    void submit("SCHEDULE", when.toISOString());
  }

  const labelFor: Record<PostPublicationIntent, string> = {
    PUBLISH_NOW: t("action.PUBLISH_NOW"),
    SCHEDULE: t("action.SCHEDULE"),
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
          <AdminPostStatusBadge state={state} label={t(`state.${state}`)} />
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
        {intents
          .filter((intent) => intent !== "SCHEDULE")
          .map((intent) => (
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

      {intents.includes("SCHEDULE") ? (
        <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
          <label htmlFor={`${fieldId}-schedule`} className="text-sm font-medium text-slate-700">
            {t("scheduleLabel")}
          </label>
          <div className="flex flex-wrap items-start gap-3">
            <Input
              id={`${fieldId}-schedule`}
              type="datetime-local"
              value={scheduleAt}
              onChange={(event) => setScheduleAt(event.target.value)}
              aria-invalid={scheduleError ? true : undefined}
              className="w-auto"
            />
            <Button
              type="button"
              variant="outline"
              disabled={pending !== null || mutationBusy}
              onClick={onSchedule}
            >
              {pending === "SCHEDULE" ? <Spinner data-icon /> : null}
              {labelFor.SCHEDULE}
            </Button>
          </div>
          {scheduleError ? (
            <p role="alert" className="text-sm text-destructive">
              {scheduleError}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
