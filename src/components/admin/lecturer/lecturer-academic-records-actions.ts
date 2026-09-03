"use server";

import {revalidatePath} from "next/cache";

import {
  executeAdminLecturerAcademicCommand,
  type AdminLecturerAcademicRecords,
} from "@/features/academic/lecturer-academic-records";
import {getPrismaClient} from "@/lib/db/client";
import {getRequestSession} from "@/lib/auth/runtime/request-session";

export type AdminLecturerAcademicFormState =
  | {status: "idle"}
  | {status: "saved"}
  | {status: "error"; code: string};

function text(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function textOrNull(form: FormData, key: string) {
  const value = text(form, key);
  return value === "" ? null : value;
}

function integer(form: FormData, key: string) {
  const value = Number.parseInt(text(form, key), 10);
  return Number.isFinite(value) ? value : Number.NaN;
}

async function run(command: unknown, lecturerId: string): Promise<AdminLecturerAcademicFormState> {
  const session = await getRequestSession();
  const result = await executeAdminLecturerAcademicCommand(
    getPrismaClient(),
    session.ok ? session.session : null,
    command,
  );
  if (!result.ok) return {status: "error", code: result.code};
  for (const locale of ["id", "en", "ar"] as const) {
    revalidatePath(`/${locale}/admin/dosen/${lecturerId}/edit`);
    revalidatePath(`/${locale}/dosen`, "page");
  }
  return {status: "saved"};
}

export async function saveAdminHkiAction(
  _previous: AdminLecturerAcademicFormState,
  form: FormData,
): Promise<AdminLecturerAcademicFormState> {
  const lecturerId = text(form, "lecturerId");
  const id = textOrNull(form, "id");
  const command = text(form, "intent") === "delete"
    ? {action: "HKI_DELETE", lecturerId, id}
    : {
      action: id ? "HKI_UPDATE" : "HKI_CREATE",
      ...(id ? {id} : {}),
      lecturerId,
      payload: {
        title: text(form, "title"),
        type: text(form, "type"),
        registrationNumber: textOrNull(form, "registrationNumber"),
        year: integer(form, "year"),
        url: textOrNull(form, "url"),
      },
    };
  return run(command, lecturerId);
}

export async function saveAdminTeachingAction(
  _previous: AdminLecturerAcademicFormState,
  form: FormData,
): Promise<AdminLecturerAcademicFormState> {
  const lecturerId = text(form, "lecturerId");
  const id = textOrNull(form, "id");
  const command = text(form, "intent") === "delete"
    ? {action: "TEACHING_DELETE", lecturerId, id}
    : {
      action: id ? "TEACHING_UPDATE" : "TEACHING_CREATE",
      ...(id ? {id} : {}),
      lecturerId,
      payload: {
        courseCode: text(form, "courseCode"),
        courseName: text(form, "courseName"),
        programCode: text(form, "programCode"),
        credits: integer(form, "credits"),
        academicYearStart: integer(form, "academicYearStart"),
        academicYearEnd: integer(form, "academicYearEnd"),
        term: text(form, "term"),
        semester: integer(form, "semester"),
      },
    };
  return run(command, lecturerId);
}

export type {AdminLecturerAcademicRecords};
