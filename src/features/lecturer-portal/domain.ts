import {
  LecturerPortalCommandSchema,
  TrustedLecturerActorSchema,
  type LecturerEducationInput,
  type LecturerPortalMutationResult,
  type LecturerProfileInput,
  type LecturerPublicationInput,
} from "@/contracts/lecturer-portal";
import {sanitizeRichTextHtml} from "@/lib/security/sanitize";
import type {getPrismaClient} from "@/lib/db/client";
import type {Prisma} from "@/generated/prisma/client";

export type LecturerPortalDatabase = ReturnType<typeof getPrismaClient>;

const PROFILE_SELECT = {
  id: true, slug: true, name: true, nidn: true, nip: true, email: true, phone: true,
  googleScholarUrl: true, sintaUrl: true, scopusUrl: true,
  linkedinUrl: true, instagramUrl: true, twitterUrl: true,
  photoMediaId: true, cvMediaId: true,
  photoMedia: {select: {id: true, storageKey: true, alt: true}},
  cvMedia: {select: {id: true, storageKey: true, originalName: true}},
  studyProgram: {select: {code: true}},
  translations: {
    where: {locale: "id" as const},
    select: {position: true, expertise: true, bio: true, quote: true, officeHours: true, officeLocation: true},
  },
  educations: {
    select: {id: true, degree: true, field: true, institution: true, city: true, year: true, order: true},
  },
  publications: {
    select: {id: true, title: true, type: true, year: true, publisher: true, url: true, doi: true, order: true},
  },
} as const;

function actorOrNull(rawActor: unknown, now: Date) {
  const actor = TrustedLecturerActorSchema.safeParse(rawActor);
  return actor.success && actor.data.expiresAt > now ? actor.data : null;
}

/* Every read and write is scoped by userId rather than by a lecturer id taken
   from the request. A lecturer therefore cannot address another lecturer's row
   even if the identifier is guessed or tampered with. */
async function ownLecturerId(prisma: LecturerPortalDatabase, userId: string) {
  const row = await prisma.lecturer.findFirst({where: {userId}, select: {id: true}});
  return row?.id ?? null;
}

type ProfileMediaValidation =
  | {ok: true}
  | {ok: false; code: "NOT_FOUND" | "VALIDATION_FAILED"};

async function validateProfileMedia(
  transaction: Prisma.TransactionClient,
  actorUserId: string,
  mediaId: string | null,
  expectedMimeType: "image/webp" | "application/pdf",
): Promise<ProfileMediaValidation> {
  if (mediaId === null) return {ok: true};
  const media = await transaction.media.findFirst({
    where: {id: mediaId, uploaderId: actorUserId, storageClass: "PUBLIC"},
    select: {mimeType: true},
  });
  if (!media) return {ok: false, code: "NOT_FOUND"};
  return media.mimeType === expectedMimeType
    ? {ok: true}
    : {ok: false, code: "VALIDATION_FAILED"};
}

export async function loadLecturerPortalProfile(
  prisma: LecturerPortalDatabase,
  rawActor: unknown,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false as const, code: "SESSION_INVALID" as const};
  try {
    const row = await prisma.lecturer.findFirst({
      where: {userId: actor.userId},
      select: PROFILE_SELECT,
    });
    if (!row) return {ok: false as const, code: "NO_LECTURER_PROFILE" as const};
    /* Sorted here rather than in the query, whose `as const` select makes a
       multi-key Prisma `orderBy` readonly. Ties are broken explicitly so rows do
       not swap places under the lecturer while they are editing. */
    return {
      ok: true as const,
      data: {
        ...row,
        educations: [...row.educations].sort(
          (a, b) => a.order - b.order || a.degree.localeCompare(b.degree),
        ),
        publications: [...row.publications].sort(
          (a, b) => (b.year ?? 0) - (a.year ?? 0) || a.order - b.order || a.title.localeCompare(b.title),
        ),
      },
    };
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

function profileWrite(payload: LecturerProfileInput) {
  return {
    phone: payload.phone,
    googleScholarUrl: payload.googleScholarUrl,
    sintaUrl: payload.sintaUrl,
    scopusUrl: payload.scopusUrl,
    linkedinUrl: payload.linkedinUrl,
    instagramUrl: payload.instagramUrl,
    twitterUrl: payload.twitterUrl,
    photoMediaId: payload.photoMediaId,
    cvMediaId: payload.cvMediaId,
  };
}

/* Bio is stored already sanitized. The public page sanitizes again on render,
   so a bypass at either layer still cannot reach a reader. */
function translationWrite(payload: LecturerProfileInput) {
  return {
    position: payload.position,
    expertise: payload.expertise,
    bio: payload.bio === null ? null : sanitizeRichTextHtml(payload.bio),
    quote: payload.quote,
    officeHours: payload.officeHours,
    officeLocation: payload.officeLocation,
  };
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

/* The next slot is one past the highest in use, not the row count. Counting
   reuses a number after a middle entry is deleted, which leaves two rows sharing
   an `order` and makes their relative position flip between page loads. */
async function nextEducationOrder(prisma: LecturerPortalDatabase, lecturerId: string) {
  const top = await prisma.lecturerEducation.aggregate({where: {lecturerId}, _max: {order: true}});
  return (top._max.order ?? -1) + 1;
}

async function nextPublicationOrder(prisma: LecturerPortalDatabase, lecturerId: string) {
  const top = await prisma.lecturerPublication.aggregate({where: {lecturerId}, _max: {order: true}});
  return (top._max.order ?? -1) + 1;
}

export async function executeLecturerPortalCommand(
  prisma: LecturerPortalDatabase,
  rawActor: unknown,
  rawCommand: unknown,
  now = new Date(),
): Promise<LecturerPortalMutationResult> {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"};
  const parsed = LecturerPortalCommandSchema.safeParse(rawCommand);
  if (!parsed.success) return {ok: false, code: "VALIDATION_FAILED"};
  const command = parsed.data;

  try {
    const lecturerId = await ownLecturerId(prisma, actor.userId);
    if (!lecturerId) return {ok: false, code: "NO_LECTURER_PROFILE"};

    switch (command.action) {
      case "PROFILE_UPDATE": {
        const txResult = await prisma.$transaction(async (tx) => {
          const photo = await validateProfileMedia(tx, actor.userId, command.payload.photoMediaId, "image/webp");
          if (!photo.ok) return photo;
          const cv = await validateProfileMedia(tx, actor.userId, command.payload.cvMediaId, "application/pdf");
          if (!cv.ok) return cv;
          await tx.lecturer.update({where: {id: lecturerId}, data: profileWrite(command.payload)});
          const translation = await tx.lecturerTranslation.findFirst({
            where: {lecturerId, locale: "id"},
            select: {id: true},
          });
          if (translation) {
            await tx.lecturerTranslation.update({
              where: {id: translation.id},
              data: translationWrite(command.payload),
            });
          } else {
            await tx.lecturerTranslation.create({
              data: {lecturerId, locale: "id", status: "PUBLISHED", ...translationWrite(command.payload)},
            });
          }
          return {ok: true as const};
        });
        if (!txResult.ok) return {ok: false, code: txResult.code};
        return {ok: true, action: command.action};
      }

      case "EDUCATION_CREATE": {
        await prisma.lecturerEducation.create({
          data: {
            lecturerId,
            order: await nextEducationOrder(prisma, lecturerId),
            ...educationWrite(command.payload),
          },
        });
        return {ok: true, action: command.action};
      }

      case "EDUCATION_UPDATE": {
        const updated = await prisma.lecturerEducation.updateMany({
          where: {id: command.id, lecturerId},
          data: educationWrite(command.payload),
        });
        if (updated.count === 0) return {ok: false, code: "NOT_FOUND"};
        return {ok: true, action: command.action};
      }

      case "EDUCATION_DELETE": {
        const deleted = await prisma.lecturerEducation.deleteMany({where: {id: command.id, lecturerId}});
        if (deleted.count === 0) return {ok: false, code: "NOT_FOUND"};
        return {ok: true, action: command.action};
      }

      case "PUBLICATION_CREATE": {
        await prisma.lecturerPublication.create({
          data: {
            lecturerId,
            order: await nextPublicationOrder(prisma, lecturerId),
            ...publicationWrite(command.payload),
          },
        });
        return {ok: true, action: command.action};
      }

      case "PUBLICATION_UPDATE": {
        const updated = await prisma.lecturerPublication.updateMany({
          where: {id: command.id, lecturerId},
          data: publicationWrite(command.payload),
        });
        if (updated.count === 0) return {ok: false, code: "NOT_FOUND"};
        return {ok: true, action: command.action};
      }

      case "PUBLICATION_DELETE": {
        const deleted = await prisma.lecturerPublication.deleteMany({where: {id: command.id, lecturerId}});
        if (deleted.count === 0) return {ok: false, code: "NOT_FOUND"};
        return {ok: true, action: command.action};
      }
    }
  } catch {
    return {ok: false, code: "UNAVAILABLE"};
  }
}
