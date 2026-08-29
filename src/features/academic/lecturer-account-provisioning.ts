import {randomInt} from "node:crypto";

import {hash} from "bcryptjs";

import {TrustedAdminFoundationActorSchema} from "@/contracts/admin-foundation";
import type {createPrismaClient} from "@/lib/db/client";

type PrismaClient = ReturnType<typeof createPrismaClient>;

/* Ambiguous glyphs are left out so a password read off a printed sheet cannot be
   mistyped as a different character. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const PASSWORD_LENGTH = 16;
const MAX_BATCH = 500;

export type ProvisionedAccount = {
  lecturerId: string;
  name: string;
  email: string;
  temporaryPassword: string;
};

export type ProvisionAccountsResult =
  | {
      ok: true;
      created: ProvisionedAccount[];
      skippedExistingAccount: number;
      skippedMissingEmail: number;
      skippedEmailTaken: number;
    }
  | {ok: false; code: "SESSION_INVALID" | "REQUEST_INVALID" | "UNAVAILABLE"};

/* randomInt draws from the CSPRNG and rejects modulo bias, so the alphabet does
   not need to be a power of two. */
function generatePassword(): string {
  let password = "";
  for (let index = 0; index < PASSWORD_LENGTH; index += 1) {
    password += ALPHABET[randomInt(ALPHABET.length)];
  }
  return password;
}

function actorOrNull(rawActor: unknown, now: Date) {
  const actor = TrustedAdminFoundationActorSchema.safeParse(rawActor);
  return actor.success && actor.data.expiresAt > now ? actor.data : null;
}

/**
 * Creates sign-in accounts for lecturers that do not have one yet. Only an ADMIN
 * may call it. The generated password is returned once, to be handed over out of
 * band; it is never written to a log, an email, or the lecturer record, and only
 * its bcrypt hash reaches the database. Every account starts with
 * `mustChangePassword`, so the temporary secret dies at first sign-in.
 */
export async function provisionLecturerAccounts(
  prisma: PrismaClient,
  rawActor: unknown,
  rawLecturerIds: unknown,
  now = new Date(),
): Promise<ProvisionAccountsResult> {
  if (!actorOrNull(rawActor, now)) return {ok: false, code: "SESSION_INVALID"};
  if (!Array.isArray(rawLecturerIds) || rawLecturerIds.length === 0) {
    return {ok: false, code: "REQUEST_INVALID"};
  }
  const lecturerIds = rawLecturerIds.filter(
    (value): value is string => typeof value === "string" && value.length > 0 && value.length <= 191,
  );
  if (lecturerIds.length === 0 || lecturerIds.length > MAX_BATCH) {
    return {ok: false, code: "REQUEST_INVALID"};
  }

  try {
    const lecturers = await prisma.lecturer.findMany({
      where: {id: {in: lecturerIds}},
      select: {id: true, name: true, email: true, userId: true},
    });

    const created: ProvisionedAccount[] = [];
    let skippedExistingAccount = 0;
    let skippedMissingEmail = 0;
    let skippedEmailTaken = 0;

    for (const lecturer of lecturers) {
      if (lecturer.userId !== null) {
        skippedExistingAccount += 1;
        continue;
      }
      const email = lecturer.email?.trim().toLowerCase() ?? "";
      if (email === "") {
        skippedMissingEmail += 1;
        continue;
      }
      if (await prisma.user.findUnique({where: {email}, select: {id: true}})) {
        skippedEmailTaken += 1;
        continue;
      }

      const temporaryPassword = generatePassword();
      const passwordHash = await hash(temporaryPassword, 12);

      /* The account and the link are written together: a user row with no
         lecturer attached would be a sign-in that reaches an empty portal. */
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: lecturer.name,
            email,
            passwordHash,
            role: "DOSEN",
            isActive: true,
            mustChangePassword: true,
          },
          select: {id: true},
        });
        await tx.lecturer.update({where: {id: lecturer.id}, data: {userId: user.id}});
      });

      created.push({lecturerId: lecturer.id, name: lecturer.name, email, temporaryPassword});
    }

    return {ok: true, created, skippedExistingAccount, skippedMissingEmail, skippedEmailTaken};
  } catch {
    return {ok: false, code: "UNAVAILABLE"};
  }
}
