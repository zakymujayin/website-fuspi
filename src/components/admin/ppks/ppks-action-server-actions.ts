"use server";

import {revalidatePath} from "next/cache";

import {executePpksCommand} from "@/features/tickets/workflow";
import {getRequestSession} from "@/lib/auth/runtime/request-session";
import {getPrismaClient} from "@/lib/db/client";
import {getPpksSealingKey} from "@/lib/tickets/ppks-encryption";

export type PpksActionState =
  | {status: "idle"}
  | {status: "done"; action: string}
  | {status: "error"; code: "SESSION_INVALID" | "REQUEST_INVALID" | "NOT_FOUND" | "UNAVAILABLE" | "VALIDATION_FAILED"};

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Every Satgas action goes through here so the sealing key is resolved and the
 * session is read in one place. The command itself re-checks the role and the
 * ticket category, so this wrapper never becomes the thing that authorises.
 */
async function run(build: (form: FormData) => unknown, form: FormData): Promise<PpksActionState> {
  let sealingKey;
  try {
    sealingKey = getPpksSealingKey();
  } catch {
    return {status: "error", code: "UNAVAILABLE"};
  }

  const session = await getRequestSession();
  const result = await executePpksCommand(
    getPrismaClient(),
    session.ok ? session.session : null,
    build(form),
    sealingKey,
  );
  if (!result.ok) return {status: "error", code: result.code};

  const ticketId = text(form, "ticketId");
  for (const locale of ["id", "en", "ar"] as const) {
    revalidatePath(`/${locale}/admin/pengaduan/ppks`);
    revalidatePath(`/${locale}/admin/pengaduan/ppks/${ticketId}`);
  }
  return {status: "done", action: text(form, "intent")};
}

export async function ppksReplyAction(
  _prev: PpksActionState,
  form: FormData,
): Promise<PpksActionState> {
  return run((f) => ({
    action: "REPLY",
    ticketId: text(f, "ticketId"),
    body: text(f, "body"),
    /* The mode is read from the submitted value rather than a checkbox state, so
       an internal note can only be stored when the button that says so was the
       one pressed. */
    isInternal: text(f, "mode") === "internal",
  }), form);
}

export async function ppksStatusAction(
  _prev: PpksActionState,
  form: FormData,
): Promise<PpksActionState> {
  return run((f) => ({
    action: "UPDATE_STATUS",
    ticketId: text(f, "ticketId"),
    status: text(f, "status"),
    reason: text(f, "reason") === "" ? null : text(f, "reason"),
  }), form);
}

export async function ppksPriorityAction(
  _prev: PpksActionState,
  form: FormData,
): Promise<PpksActionState> {
  return run((f) => ({
    action: "UPDATE_PRIORITY",
    ticketId: text(f, "ticketId"),
    priority: text(f, "priority"),
    reason: text(f, "reason"),
  }), form);
}

export async function ppksAssignAction(
  _prev: PpksActionState,
  form: FormData,
): Promise<PpksActionState> {
  return run((f) => ({
    action: "ASSIGN",
    ticketId: text(f, "ticketId"),
    assigneeId: text(f, "assigneeId"),
  }), form);
}

export async function ppksCloseAction(
  _prev: PpksActionState,
  form: FormData,
): Promise<PpksActionState> {
  return run((f) => ({
    action: "CLOSE",
    ticketId: text(f, "ticketId"),
    resolution: text(f, "resolution"),
  }), form);
}
