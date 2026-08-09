"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

/**
 * Single-use, in-memory hand-off of what the visitor has typed, used only to
 * survive the client-side navigation that a locale switch performs.
 *
 * Credentials live in these module variables and nowhere else. They must never
 * reach the URL, history state, cookies, localStorage/sessionStorage, an RSC
 * payload, a log, or analytics. The draft is erased as soon as the destination
 * form has initialised from it, on submit, and on leaving the auth flow, so a
 * later visit to /login can never resurrect it.
 */
type AuthDraft = {
  email: string;
  password: string;
};

let draft: AuthDraft | null = null;

/**
 * True only between the switcher capturing the form and the destination form
 * initialising. The auth shell unmounts and remounts during that navigation,
 * and without this flag its own cleanup would erase the draft in transit.
 */
let handoffPending = false;

export function stashAuthDraft(value: AuthDraft) {
  draft = value;
  handoffPending = true;
}

/** Pure read: safe to call during render, including React's double-invoked one. */
export function peekAuthDraft(): AuthDraft | null {
  return draft;
}

export function clearAuthDraft() {
  draft = null;
  handoffPending = false;
}

/** Auth shell teardown: keep the draft only if a locale switch is mid-flight. */
export function releaseAuthShell() {
  if (!handoffPending) {
    draft = null;
  }
  handoffPending = false;
}

type Snapshot = () => AuthDraft;

type AuthDraftContextValue = {
  /** The live form registers how to read its current values. */
  register: (snapshot: Snapshot | null) => void;
  /** The locale switcher asks the live form for its values, right before leaving. */
  capture: () => void;
};

const AuthDraftContext = createContext<AuthDraftContextValue | null>(null);

export function AuthDraftProvider({ children }: { children: ReactNode }) {
  const snapshot = useRef<Snapshot | null>(null);

  useEffect(() => releaseAuthShell, []);

  // Stable: both functions only touch the ref, so the form's registration
  // effect runs once instead of on every render of the shell.
  const value = useMemo<AuthDraftContextValue>(
    () => ({
      register: (next) => {
        snapshot.current = next;
      },
      capture: () => {
        const current = snapshot.current?.();
        if (current) stashAuthDraft(current);
      },
    }),
    [],
  );

  return <AuthDraftContext value={value}>{children}</AuthDraftContext>;
}

export function useAuthDraft() {
  const context = useContext(AuthDraftContext);
  if (!context) {
    throw new Error("useAuthDraft must be used inside AuthDraftProvider");
  }
  return context;
}
