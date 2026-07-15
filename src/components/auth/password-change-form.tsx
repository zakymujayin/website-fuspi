"use client";

import { AlertCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import {
  PasswordChangeInputSchema,
  PasswordChangeResultSchema,
  type PasswordChangeResult,
} from "@/contracts/auth";

type PasswordFailureCode = Extract<PasswordChangeResult, { ok: false }>["code"];

type PasswordChangeFormProps = {
  locale: string;
  /** Raw and untrusted. The API owns normalization and redirect safety. */
  next?: string;
};

type Failure = { code: PasswordFailureCode; attempt: number };

export function PasswordChangeForm({ locale, next }: PasswordChangeFormProps) {
  const t = useTranslations("PasswordChange");
  const router = useRouter();
  const currentId = useId();
  const newId = useId();
  const confirmationId = useId();
  const errorId = useId();
  const errorRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  useEffect(() => {
    if (failure) errorRef.current?.focus();
  }, [failure]);

  function announceFailure(code: PasswordFailureCode) {
    setFailure((previous) => ({ code, attempt: (previous?.attempt ?? 0) + 1 }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;

    const input = { currentPassword, newPassword, confirmPassword };
    if (!PasswordChangeInputSchema.safeParse(input).success) {
      announceFailure("PASSWORD_POLICY");
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    setFailure(null);

    let result: PasswordChangeResult;
    try {
      const destination = next ?? `/${locale}/admin`;
      const response = await fetch(
        `/api/auth/password?locale=${encodeURIComponent(locale)}&redirectTo=${encodeURIComponent(destination)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify(input),
        },
      );
      const parsed = PasswordChangeResultSchema.safeParse(await response.json());
      result = parsed.success
        ? parsed.data
        : { ok: false, code: "AUTH_UNAVAILABLE" };
    } catch {
      result = { ok: false, code: "AUTH_UNAVAILABLE" };
    }

    if (result.ok) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.replace(result.redirectTo);
      // Keep the guard locked until navigation unmounts this form. Releasing it
      // here would allow a forced click during a slow transition to issue a
      // second password mutation.
      return;
    }

    if (result.code === "INVALID_CREDENTIALS") setCurrentPassword("");
    if (result.code === "SESSION_INVALID") {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    announceFailure(result.code);
    setSubmitting(false);
    inFlight.current = false;
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby="password-change-title"
      aria-busy={submitting}
      noValidate
    >
      <div
        ref={errorRef}
        id={errorId}
        role="alert"
        aria-live="assertive"
        tabIndex={-1}
        className={
          failure
            ? "mb-5 flex items-start gap-2 rounded-lg bg-danger-surface p-3 text-sm text-foreground focus:ring-2 focus:ring-danger focus:ring-offset-2 focus:outline-none"
            : "sr-only"
        }
      >
        {failure ? (
          <>
            <AlertCircleIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />
            <span>{t(`error.${failure.code}`)}</span>
          </>
        ) : null}
      </div>

      <div aria-live="polite" className="sr-only">
        {submitting ? t("submittingStatus") : ""}
      </div>

      <FieldGroup>
        <PasswordField
          id={currentId}
          name="currentPassword"
          label={t("currentPasswordLabel")}
          showLabel={t("showCurrentPassword")}
          hideLabel={t("hideCurrentPassword")}
          autoComplete="current-password"
          readOnly={submitting}
          value={currentPassword}
          onValueChange={setCurrentPassword}
        />
        <PasswordField
          id={newId}
          name="newPassword"
          label={t("newPasswordLabel")}
          showLabel={t("showNewPassword")}
          hideLabel={t("hideNewPassword")}
          autoComplete="new-password"
          readOnly={submitting}
          value={newPassword}
          onValueChange={setNewPassword}
        />
        <PasswordField
          id={confirmationId}
          name="confirmPassword"
          label={t("confirmPasswordLabel")}
          showLabel={t("showConfirmation")}
          hideLabel={t("hideConfirmation")}
          autoComplete="new-password"
          readOnly={submitting}
          value={confirmPassword}
          onValueChange={setConfirmPassword}
        />

        <Button
          type="submit"
          size="lg"
          aria-disabled={submitting}
          aria-describedby={failure ? errorId : undefined}
          className="w-full"
        >
          {submitting ? (
            <>
              <Spinner data-icon="inline-start" />
              {t("submitting")}
            </>
          ) : (
            t("submit")
          )}
        </Button>
      </FieldGroup>
    </form>
  );
}
