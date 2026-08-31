"use client";

import { AlertCircleIcon, InfoIcon, KeyRoundIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { clearAuthDraft, peekAuthDraft, useAuthDraft } from "@/components/auth/auth-draft";
import { PasswordField } from "@/components/auth/password-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { LoginResultSchema, type LoginResult } from "@/contracts/auth";
import { cn } from "@/lib/utils";

type PublicLoginFailureCode = Extract<LoginResult, { ok: false }>["code"];

type LoginFormProps = {
  locale: string;
  /** Raw, untrusted `?next=` value. Forwarded to the server verbatim. */
  next?: string;
  /** Set only after the server found a cookie and rejected its database session. */
  sessionInvalid?: boolean;
  silaSsoEnabled?: boolean;
  ssoFailure?: string;
};

type Failure = {
  code: PublicLoginFailureCode;
  /** Bumped on every failure so two identical codes in a row still re-announce. */
  attempt: number;
};

export function LoginForm({
  locale,
  next,
  sessionInvalid = false,
  silaSsoEnabled = false,
  ssoFailure,
}: LoginFormProps) {
  const t = useTranslations("Auth");
  const router = useRouter();

  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();

  const errorRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);

  // Initialise from the locale hand-off, then erase it in the effect below: the
  // draft exists only for the width of that navigation, and reading it is a
  // one-shot. A later visit to /login therefore starts from an empty form.
  const [email, setEmail] = useState(() => peekAuthDraft()?.email ?? "");
  const [password, setPassword] = useState(() => peekAuthDraft()?.password ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  const { register } = useAuthDraft();

  // Focus lands on the error region, never on a field: focusing the password
  // input would tell the visitor the email was accepted, which is the account
  // enumeration oracle this whole surface exists to close.
  useEffect(() => {
    if (failure) errorRef.current?.focus();
  }, [failure]);

  useEffect(() => {
    clearAuthDraft();
  }, []);

  // Lets the locale switcher read the current values at the moment it is
  // clicked, without this form having to push every keystroke into the shell.
  const latest = useRef({ email, password });

  useEffect(() => {
    latest.current = { email, password };
  }, [email, password]);

  useEffect(() => {
    register(() => latest.current);
    return () => register(null);
  }, [register]);

  function releaseRateLimit() {
    // The block duration is deliberately not exposed by the server, so there is
    // nothing to count down against. Editing a field re-arms the form and the
    // server stays the sole authority on whether the block is still in force.
    if (rateLimited) setRateLimited(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || rateLimited) return;

    inFlight.current = true;
    setSubmitting(true);
    setFailure(null);
    // Submitting ends the locale-switch hand-off: nothing typed may survive it.
    clearAuthDraft();

    const destination = next ?? `/${locale}/admin`;
    let result;

    try {
      const response = await fetch(
        `/api/auth/credentials?redirectTo=${encodeURIComponent(destination)}&locale=${encodeURIComponent(locale)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({ email, password }),
        },
      );
      const parsed = LoginResultSchema.safeParse(await response.json());
      result = parsed.success ? parsed.data : ({ ok: false, code: "AUTH_UNAVAILABLE" } as const);
    } catch {
      result = { ok: false, code: "AUTH_UNAVAILABLE" } as const;
    }

    if (result.ok) {
      // `redirectTo` has passed SafeInternalPathSchema on both sides of the
      // wire. Stay in the submitting state through the navigation so the form
      // never flashes back to idle, which reads as a failed sign-in.
      router.replace(
        result.requiresPasswordChange
          ? `/${locale}/change-password?next=${encodeURIComponent(result.redirectTo)}`
          : result.redirectTo,
      );
      inFlight.current = false;
      return;
    }

    setPassword("");
    setRateLimited(result.code === "TRY_AGAIN_LATER");
    setFailure((previous) => ({ code: result.code, attempt: (previous?.attempt ?? 0) + 1 }));
    setSubmitting(false);
    inFlight.current = false;
  }

  const busy = submitting;
  const locked = busy || rateLimited;

  const destination = next ?? `/${locale}/admin`;
  const ssoUrl = `/api/auth/sila/start?locale=${encodeURIComponent(locale)}&next=${encodeURIComponent(destination)}`;
  const showSsoFailure = Boolean(ssoFailure);

  return (
    <form onSubmit={handleSubmit} aria-labelledby="login-title" aria-busy={busy} noValidate>
      {sessionInvalid ? (
        <div
          role="status"
          className="mb-5 flex items-start gap-2 rounded-lg bg-info-surface p-3 text-sm text-foreground"
        >
          <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-info" />
          <span>{t("sessionInvalid")}</span>
        </div>
      ) : null}

      {/* Both regions exist from first render: a live region inserted at the
          same moment its content arrives is frequently not announced at all. */}
      <div
        ref={errorRef}
        id={errorId}
        role="alert"
        aria-live="assertive"
        tabIndex={-1}
        className={
          failure
            ? // The region is focused programmatically, so :focus-visible cannot
              // be relied on; the ring is bound to :focus and is the only thing
              // telling a sighted keyboard user where focus just landed.
              "mb-5 flex items-start gap-2 rounded-lg bg-danger-surface p-3 text-sm text-slate-900 focus:ring-2 focus:ring-danger focus:ring-offset-2 focus:outline-none"
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
        {busy ? t("submittingStatus") : ""}
      </div>

      {showSsoFailure ? (
        <div
          role="status"
          className="mb-5 flex items-start gap-2 rounded-lg bg-info-surface p-3 text-sm text-foreground"
        >
          <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-info" />
          <span>{t("sila.failure")}</span>
        </div>
      ) : null}

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={emailId}>{t("emailLabel")}</FieldLabel>
          <Input
            id={emailId}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            spellCheck={false}
            aria-required
            required
            // Email and password are LTR strings in every locale; mirroring them
            // in Arabic would move `@` and the dots to the wrong side.
            dir="ltr"
            className="text-start"
            readOnly={busy}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              releaseRateLimit();
            }}
          />
        </Field>

        <PasswordField
          id={passwordId}
          label={t("passwordLabel")}
          showLabel={t("showPassword")}
          hideLabel={t("hidePassword")}
          readOnly={busy}
          value={password}
          onValueChange={(value) => {
            setPassword(value);
            releaseRateLimit();
          }}
        />

        {/* aria-disabled, not disabled: a disabled button drops out of the tab
            order and throws keyboard focus to <body>. */}
        <Button
          type="submit"
          size="lg"
          aria-disabled={locked}
          aria-describedby={failure ? errorId : undefined}
          className="w-full"
        >
          {busy ? (
            <>
              <Spinner data-icon="inline-start" />
              {t("submitting")}
            </>
          ) : (
            t("submit")
          )}
        </Button>
      </FieldGroup>

      {silaSsoEnabled ? (
        <div className="mt-6 flex flex-col gap-4">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Separator className="flex-1" />
            <span>{t("sila.divider")}</span>
            <Separator className="flex-1" />
          </div>
          <a href={ssoUrl} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}>
            <KeyRoundIcon data-icon="inline-start" />
            {t("sila.submit")}
          </a>
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            {t("sila.note")}
          </p>
        </div>
      ) : null}
    </form>
  );
}
