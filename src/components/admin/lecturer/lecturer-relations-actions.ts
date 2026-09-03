"use server";

import {revalidatePath} from "next/cache";

import type {LecturerPortalFailureCode, LecturerPortalMutationResult} from "@/contracts/lecturer-portal";
import {executeAdminLecturerRelationCommand} from "@/features/academic/lecturer-relations";
import {getPrismaClient} from "@/lib/db/client";
import {getRequestSession} from "@/lib/auth/runtime/request-session";

export type AdminLecturerRelationFormState =
  | {status: "idle"}
  | {status: "saved"}
  | {status: "error"; code: LecturerPortalFailureCode};

function text(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function textOrNull(form: FormData, key: string) {
  const value = text(form, key);
  return value === "" ? null : value;
}

function yearOrNull(form: FormData, key: string) {
  const value = text(form, key);
  if (value === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

async function run(command: unknown, lecturerId: string): Promise<LecturerPortalMutationResult> {
  const session = await getRequestSession();
  const result = await executeAdminLecturerRelationCommand(
    getPrismaClient(),
    session.ok ? session.session : null,
    command,
  );
  if (result.ok) {
    for (const locale of ["id", "en", "ar"] as const) {
      revalidatePath(`/${locale}/admin/dosen/${lecturerId}/edit`);
      revalidatePath(`/${locale}/dosen`, "page");
    }
  }
  return result;
}

function toState(result: LecturerPortalMutationResult): AdminLecturerRelationFormState {
  return result.ok ? {status: "saved"} : {status: "error", code: result.code};
}

export async function saveAdminEducationAction(
  _previous: AdminLecturerRelationFormState,
  form: FormData,
): Promise<AdminLecturerRelationFormState> {
  const lecturerId = text(form, "lecturerId");
  const id = textOrNull(form, "id");
  const payload = {
    degree: text(form, "degree"),
    field: textOrNull(form, "field"),
    institution: text(form, "institution"),
    city: textOrNull(form, "city"),
    year: yearOrNull(form, "year"),
  };
  const command = text(form, "intent") === "delete"
    ? {action: "EDUCATION_DELETE", lecturerId, id}
    : id
      ? {action: "EDUCATION_UPDATE", lecturerId, id, payload}
      : {action: "EDUCATION_CREATE", lecturerId, payload};
  return toState(await run(command, lecturerId));
}

export async function saveAdminPublicationAction(
  _previous: AdminLecturerRelationFormState,
  form: FormData,
): Promise<AdminLecturerRelationFormState> {
  const lecturerId = text(form, "lecturerId");
  const id = textOrNull(form, "id");
  const payload = {
    title: text(form, "title"),
    type: text(form, "type"),
    year: yearOrNull(form, "year"),
    publisher: textOrNull(form, "publisher"),
    url: textOrNull(form, "url"),
    doi: textOrNull(form, "doi"),
  };
  const command = text(form, "intent") === "delete"
    ? {action: "PUBLICATION_DELETE", lecturerId, id}
    : id
      ? {action: "PUBLICATION_UPDATE", lecturerId, id, payload}
      : {action: "PUBLICATION_CREATE", lecturerId, payload};
  return toState(await run(command, lecturerId));
}
