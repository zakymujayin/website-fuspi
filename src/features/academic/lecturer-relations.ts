import {z} from "zod";

import {TrustedAdminFoundationActorSchema} from "@/contracts/admin-foundation";
import {
  CmsIdentifierSchema,
} from "@/contracts/cms";
import {
  LecturerEducationInputSchema,
  LecturerPublicationInputSchema,
  type LecturerEducationInput,
  type LecturerPublicationInput,
  type LecturerPortalMutationResult,
} from "@/contracts/lecturer-portal";
import type {Prisma} from "@/generated/prisma/client";
import type {createPrismaClient} from "@/lib/db/client";

type AdminLecturerRelationsDatabase = ReturnType<typeof createPrismaClient>;
type RelationCommand = z.infer<typeof AdminLecturerRelationCommandSchema>;

export const AdminLecturerRelationCommandSchema = z.discriminatedUnion("action", [
  z.object({action: z.literal("EDUCATION_CREATE"), lecturerId: CmsIdentifierSchema, payload: LecturerEducationInputSchema}).strict(),
  z.object({action: z.literal("EDUCATION_UPDATE"), lecturerId: CmsIdentifierSchema, id: CmsIdentifierSchema, payload: LecturerEducationInputSchema}).strict(),
  z.object({action: z.literal("EDUCATION_DELETE"), lecturerId: CmsIdentifierSchema, id: CmsIdentifierSchema}).strict(),
  z.object({action: z.literal("PUBLICATION_CREATE"), lecturerId: CmsIdentifierSchema, payload: LecturerPublicationInputSchema}).strict(),
  z.object({action: z.literal("PUBLICATION_UPDATE"), lecturerId: CmsIdentifierSchema, id: CmsIdentifierSchema, payload: LecturerPublicationInputSchema}).strict(),
  z.object({action: z.literal("PUBLICATION_DELETE"), lecturerId: CmsIdentifierSchema, id: CmsIdentifierSchema}).strict(),
]);

export type AdminLecturerRelations = {
  educations: Array<{
    id: string;
    degree: string;
    field: string | null;
    institution: string;
    city: string | null;
    year: number | null;
    order: number;
  }>;
  publications: Array<{
    id: string;
    title: string;
    type: string;
    year: number | null;
    publisher: string | null;
    url: string | null;
    doi: string | null;
    order: number;
  }>;
};

function actorOrNull(rawActor: unknown, now: Date) {
  const actor = TrustedAdminFoundationActorSchema.safeParse(rawActor);
  return actor.success && actor.data.expiresAt > now ? actor.data : null;
}

function sortedRelations(row: AdminLecturerRelations): AdminLecturerRelations {
  return {
    educations: [...row.educations].sort((a, b) => a.order - b.order || a.degree.localeCompare(b.degree)),
    publications: [...row.publications].sort(
      (a, b) => (b.year ?? 0) - (a.year ?? 0) || a.order - b.order || a.title.localeCompare(b.title),
    ),
  };
}

export async function loadAdminLecturerRelations(
  prisma: AdminLecturerRelationsDatabase,
  rawActor: unknown,
  lecturerId: unknown,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  const parsedId = CmsIdentifierSchema.safeParse(lecturerId);
  if (!actor) return {ok: false as const, code: "SESSION_INVALID" as const};
  if (!parsedId.success) return {ok: false as const, code: "NOT_FOUND" as const};

  try {
    const row = await prisma.lecturer.findUnique({
      where: {id: parsedId.data},
      select: {
        educations: {select: {id: true, degree: true, field: true, institution: true, city: true, year: true, order: true}},
        publications: {select: {id: true, title: true, type: true, year: true, publisher: true, url: true, doi: true, order: true}},
      },
    });
    if (!row) return {ok: false as const, code: "NOT_FOUND" as const};
    return {
      ok: true as const,
      data: sortedRelations({
        educations: row.educations,
        publications: row.publications,
      }),
    };
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

async function nextEducationOrder(tx: Prisma.TransactionClient, lecturerId: string) {
  const result = await tx.lecturerEducation.aggregate({where: {lecturerId}, _max: {order: true}});
  return (result._max.order ?? -1) + 1;
}

async function nextPublicationOrder(tx: Prisma.TransactionClient, lecturerId: string) {
  const result = await tx.lecturerPublication.aggregate({where: {lecturerId}, _max: {order: true}});
  return (result._max.order ?? -1) + 1;
}

function educationWrite(payload: LecturerEducationInput) {
  return {
    degree: payload.degree,
    field: payload.field,
    institution: payload.institution,
    city: payload.city,
    year: payload.year,
  };
}

function publicationWrite(payload: LecturerPublicationInput) {
  return {
    title: payload.title,
    type: payload.type,
    year: payload.year,
    publisher: payload.publisher,
    url: payload.url,
    doi: payload.doi,
  };
}

export async function executeAdminLecturerRelationCommand(
  prisma: AdminLecturerRelationsDatabase,
  rawActor: unknown,
  rawCommand: unknown,
  now = new Date(),
): Promise<LecturerPortalMutationResult> {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"};
  const parsed = AdminLecturerRelationCommandSchema.safeParse(rawCommand);
  if (!parsed.success) return {ok: false, code: "VALIDATION_FAILED"};
  const command: RelationCommand = parsed.data;

  try {
    return await prisma.$transaction(async (tx) => {
      const lecturer = await tx.lecturer.findUnique({where: {id: command.lecturerId}, select: {id: true}});
      if (!lecturer) return {ok: false, code: "NOT_FOUND" as const};

      if (command.action === "EDUCATION_CREATE") {
        const row = await tx.lecturerEducation.create({
          data: {lecturerId: command.lecturerId, order: await nextEducationOrder(tx, command.lecturerId), ...educationWrite(command.payload)},
          select: {id: true},
        });
        await tx.activityLog.create({data: {actorId: actor.userId, action: "CREATE", resourceType: "LecturerEducation", resourceId: row.id}});
        return {ok: true as const, action: command.action};
      }
      if (command.action === "EDUCATION_UPDATE") {
        const result = await tx.lecturerEducation.updateMany({where: {id: command.id, lecturerId: command.lecturerId}, data: educationWrite(command.payload)});
        if (result.count === 0) return {ok: false, code: "NOT_FOUND" as const};
        await tx.activityLog.create({data: {actorId: actor.userId, action: "UPDATE", resourceType: "LecturerEducation", resourceId: command.id}});
        return {ok: true as const, action: command.action};
      }
      if (command.action === "EDUCATION_DELETE") {
        const result = await tx.lecturerEducation.deleteMany({where: {id: command.id, lecturerId: command.lecturerId}});
        if (result.count === 0) return {ok: false, code: "NOT_FOUND" as const};
        await tx.activityLog.create({data: {actorId: actor.userId, action: "UPDATE", resourceType: "LecturerEducation", resourceId: command.id, metadata: {operation: "DELETE"}}});
        return {ok: true as const, action: command.action};
      }
      if (command.action === "PUBLICATION_CREATE") {
        const row = await tx.lecturerPublication.create({
          data: {lecturerId: command.lecturerId, order: await nextPublicationOrder(tx, command.lecturerId), ...publicationWrite(command.payload)},
          select: {id: true},
        });
        await tx.activityLog.create({data: {actorId: actor.userId, action: "CREATE", resourceType: "LecturerPublication", resourceId: row.id}});
        return {ok: true as const, action: command.action};
      }
      if (command.action === "PUBLICATION_UPDATE") {
        const result = await tx.lecturerPublication.updateMany({where: {id: command.id, lecturerId: command.lecturerId}, data: publicationWrite(command.payload)});
        if (result.count === 0) return {ok: false, code: "NOT_FOUND" as const};
        await tx.activityLog.create({data: {actorId: actor.userId, action: "UPDATE", resourceType: "LecturerPublication", resourceId: command.id}});
        return {ok: true as const, action: command.action};
      }
      const result = await tx.lecturerPublication.deleteMany({where: {id: command.id, lecturerId: command.lecturerId}});
      if (result.count === 0) return {ok: false, code: "NOT_FOUND" as const};
      await tx.activityLog.create({data: {actorId: actor.userId, action: "UPDATE", resourceType: "LecturerPublication", resourceId: command.id, metadata: {operation: "DELETE"}}});
      return {ok: true as const, action: command.action};
    }, {isolationLevel: "Serializable"});
  } catch {
    return {ok: false, code: "UNAVAILABLE"};
  }
}
