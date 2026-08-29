"use server";

import {revalidatePath} from "next/cache";

import type {LecturerPortalFailureCode, LecturerPortalMutationResult} from "@/contracts/lecturer-portal";
import {executeLecturerPortalCommand, loadLecturerPortalProfile} from "@/features/lecturer-portal/domain";
import {getRequestSession} from "@/lib/auth/runtime/request-session";
import {getPrismaClient} from "@/lib/db/client";

const LOCALES = ["id", "en", "ar"] as const;

export type PortalFormState =
  | {status: "idle"}
  | {status: "saved"}
  | {status: "error"; code: LecturerPortalFailureCode};

async function run(rawCommand: unknown): Promise<LecturerPortalMutationResult> {
  const session = await getRequestSession();
  const actor = session.ok ? session.session : null;
  const prisma = getPrismaClient();

  /* Read the slug before mutating so the public detail page is revalidated even
     when the command changes what that page renders. */
  const before = await loadLecturerPortalProfile(prisma, actor);
  const result = await executeLecturerPortalCommand(prisma, actor, rawCommand);

  if (result.ok) {
    for (const locale of LOCALES) {
      revalidatePath(`/${locale}/dosen`);
      revalidatePath(`/${locale}/portal-dosen`);
      revalidatePath(`/${locale}/portal-dosen/pendidikan`);
      revalidatePath(`/${locale}/portal-dosen/publikasi`);
      if (before.ok) revalidatePath(`/${locale}/dosen/${before.data.slug}`);
    }
  }
  return result;
}

function toState(result: LecturerPortalMutationResult): PortalFormState {
  return result.ok ? {status: "saved"} : {status: "error", code: result.code};
}

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function textOrNull(form: FormData, key: string): string | null {
  const value = text(form, key);
  return value === "" ? null : value;
}

function yearOrNull(form: FormData, key: string): number | null {
  const value = text(form, key);
  if (value === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export async function saveProfileAction(
  _prevState: PortalFormState,
  form: FormData,
): Promise<PortalFormState> {
  return toState(await run({
    action: "PROFILE_UPDATE",
    payload: {
      position: textOrNull(form, "position"),
      expertise: textOrNull(form, "expertise"),
      bio: textOrNull(form, "bio"),
      quote: textOrNull(form, "quote"),
      officeHours: textOrNull(form, "officeHours"),
      officeLocation: textOrNull(form, "officeLocation"),
      phone: textOrNull(form, "phone"),
      googleScholarUrl: textOrNull(form, "googleScholarUrl"),
      sintaUrl: textOrNull(form, "sintaUrl"),
      scopusUrl: textOrNull(form, "scopusUrl"),
      linkedinUrl: textOrNull(form, "linkedinUrl"),
      instagramUrl: textOrNull(form, "instagramUrl"),
      twitterUrl: textOrNull(form, "twitterUrl"),
      photoMediaId: textOrNull(form, "photoMediaId"),
      cvMediaId: textOrNull(form, "cvMediaId"),
    },
  }));
}

export async function saveEducationAction(
  _prevState: PortalFormState,
  form: FormData,
): Promise<PortalFormState> {
  const id = textOrNull(form, "id");
  if (text(form, "intent") === "delete") {
    if (!id) return {status: "error", code: "VALIDATION_FAILED"};
    return toState(await run({action: "EDUCATION_DELETE", id}));
  }
  const payload = {
    degree: text(form, "degree"),
    field: textOrNull(form, "field"),
    institution: text(form, "institution"),
    city: textOrNull(form, "city"),
    year: yearOrNull(form, "year"),
  };
  return toState(await run(
    id ? {action: "EDUCATION_UPDATE", id, payload} : {action: "EDUCATION_CREATE", payload},
  ));
}

export async function savePublicationAction(
  _prevState: PortalFormState,
  form: FormData,
): Promise<PortalFormState> {
  const id = textOrNull(form, "id");
  if (text(form, "intent") === "delete") {
    if (!id) return {status: "error", code: "VALIDATION_FAILED"};
    return toState(await run({action: "PUBLICATION_DELETE", id}));
  }
  const payload = {
    title: text(form, "title"),
    type: text(form, "type"),
    year: yearOrNull(form, "year"),
    publisher: textOrNull(form, "publisher"),
    url: textOrNull(form, "url"),
    doi: textOrNull(form, "doi"),
  };
  return toState(await run(
    id ? {action: "PUBLICATION_UPDATE", id, payload} : {action: "PUBLICATION_CREATE", payload},
  ));
}
