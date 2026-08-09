import {z} from "zod";

import type {Prisma} from "@/generated/prisma/client";
import {Prisma as PrismaNamespace} from "@/generated/prisma/client";
import type {createPrismaClient} from "@/lib/db/client";
import {
  consumeSharedRateLimit,
  createSharedRateLimitKey,
} from "@/lib/rate-limit/persistent";
import {protectCsvFormulaCell} from "@/lib/security/sanitize";

export type SurveyDatabase = ReturnType<typeof createPrismaClient>;

const UNSAFE_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,190}$/u;

const SafeText = (maximum: number) =>
  z.string().trim().max(maximum).refine(
    (value) => !UNSAFE_TEXT_PATTERN.test(value),
    "Invalid text.",
  );
const RequiredText = (maximum: number) => SafeText(maximum).pipe(z.string().min(1));

const SurveyQuestionTypeSchema = z.enum([
  "SHORT_TEXT",
  "LONG_TEXT",
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "RATING",
]);

const SurveyQuestionInputSchema = z.object({
  prompt: RequiredText(2000),
  type: SurveyQuestionTypeSchema,
  options: z
    .array(z.string().trim().min(1).max(500))
    .min(1)
    .max(50)
    .nullable(),
  isRequired: z.boolean().default(false),
  order: z.number().int().min(0).max(9999),
}).strict().superRefine((value, context) => {
  if (
    (value.type === "SINGLE_CHOICE" || value.type === "MULTIPLE_CHOICE")
    && (!value.options || value.options.length < 1)
  ) {
    context.addIssue({
      code: "custom",
      path: ["options"],
      message: "Choice questions require at least one option.",
    });
  }
  if (value.type === "RATING" && (!value.options || value.options.length !== 2)) {
    context.addIssue({
      code: "custom",
      path: ["options"],
      message: "Rating questions require exactly two options [minLabel, maxLabel].",
    });
  }
  if (value.type === "RATING" && value.options) {
    const max = Number(value.options[1]);
    if (!Number.isInteger(max) || max < 2 || max > 10) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Rating max must be an integer between 2 and 10.",
      });
    }
  }
});

const SurveyDefinitionInputSchema = z.object({
  slug: z.string().trim().min(1).max(191).regex(SLUG_PATTERN),
  title: RequiredText(255),
  isActive: z.boolean().default(false),
  questions: z.array(SurveyQuestionInputSchema).min(1).max(100),
}).strict().superRefine(({questions}, context) => {
  const orders = questions.map((q) => q.order);
  if (new Set(orders).size !== orders.length) {
    context.addIssue({
      code: "custom",
      path: ["questions"],
      message: "Question orders must be unique.",
    });
  }
  const required = questions.filter((q) => q.isRequired);
  if (required.length < 1) {
    context.addIssue({
      code: "custom",
      path: ["questions"],
      message: "At least one question must be required.",
    });
  }
});

const SurveyAnswerInputSchema = z.object({
  questionId: z.string().trim().regex(SAFE_IDENTIFIER_PATTERN),
  value: z.unknown(),
});

const SurveySubmissionInputSchema = z.object({
  definitionId: z.string().trim().regex(SAFE_IDENTIFIER_PATTERN),
  locale: z.enum(["id", "en", "ar"]),
  answers: z.array(SurveyAnswerInputSchema).min(1).max(100),
}).strict().superRefine(({answers}, context) => {
  const ids = answers.map((a) => a.questionId);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({
      code: "custom",
      path: ["answers"],
      message: "Duplicate question answers are not allowed.",
    });
  }
});

const SurveyPaginationSchema = z.object({
  page: z.number().int().min(1).max(10000).default(1),
  pageSize: z.union([z.literal(10), z.literal(20), z.literal(50)]).default(20),
  definitionId: z.string().trim().regex(SAFE_IDENTIFIER_PATTERN).nullable().default(null),
});

const RawSurveyPaginationSchema = z.object({
  page: z.string().regex(/^(?:[1-9]\d{0,3}|10000)$/u).optional(),
  pageSize: z.enum(["10", "20", "50"]).optional(),
  definitionId: z.string().trim().regex(SAFE_IDENTIFIER_PATTERN).optional(),
}).strict();


const SurveyDefinitionAdminViewSchema = z.object({
  id: z.string().trim().regex(SAFE_IDENTIFIER_PATTERN),
  slug: z.string().trim().min(1).max(191).regex(SLUG_PATTERN),
  title: RequiredText(255),
  version: z.number().int().positive().max(2_147_483_647),
  isActive: z.boolean(),
  questionCount: z.number().int().min(0).max(100),
  submissionCount: z.number().int().min(0).max(2_147_483_647),
  createdAt: z.iso.datetime({offset: true}),
  updatedAt: z.iso.datetime({offset: true}),
});

const SurveyPaginationMetadataSchema = z.object({
  page: z.number().int().min(1).max(10000),
  pageSize: z.union([z.literal(10), z.literal(20), z.literal(50)]),
  total: z.number().int().min(0).max(2_147_483_647),
  totalPages: z.number().int().min(0).max(214_748_365),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

const SurveyDefinitionListResultSchema = z.object({
  items: z.array(SurveyDefinitionAdminViewSchema).max(50),
  page: SurveyPaginationMetadataSchema,
});

const SurveySubmissionRowSchema = z.object({
  id: z.string().trim().regex(SAFE_IDENTIFIER_PATTERN),
  definitionVersion: z.number().int().positive().max(2_147_483_647),
  locale: z.enum(["id", "en", "ar"]),
  createdAt: z.iso.datetime({offset: true}),
  answers: z.array(z.object({
    questionId: z.string().trim().regex(SAFE_IDENTIFIER_PATTERN),
    prompt: RequiredText(2000),
    type: SurveyQuestionTypeSchema,
    value: z.unknown(),
  })),
});

const SurveySubmissionListResultSchema = z.object({
  items: z.array(SurveySubmissionRowSchema).max(50),
  page: SurveyPaginationMetadataSchema,
});

const SurveyPublicViewSchema = z.object({
  id: z.string().trim().regex(SAFE_IDENTIFIER_PATTERN),
  slug: z.string().trim().min(1).max(191).regex(SLUG_PATTERN),
  title: RequiredText(255),
  version: z.number().int().positive().max(2_147_483_647),
  questions: z.array(z.object({
    id: z.string().trim().regex(SAFE_IDENTIFIER_PATTERN),
    prompt: RequiredText(2000),
    type: SurveyQuestionTypeSchema,
    options: z.array(z.string().trim().min(1).max(500)).max(50).nullable(),
    isRequired: z.boolean(),
    order: z.number().int(),
  })),
});

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
const SurveyFailureCodeSchema = z.enum([
  "SESSION_INVALID",
  "CSRF_INVALID",
  "REQUEST_INVALID",
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "SLUG_CONFLICT",
  "INACTIVE_SURVEY",
  "ANSWER_INVALID",
  "RATE_LIMITED",
  "UNAVAILABLE",
]);

type SurveyDefinitionInput = z.infer<typeof SurveyDefinitionInputSchema>;
type SurveySubmissionInput = z.infer<typeof SurveySubmissionInputSchema>;
type SurveyPagination = z.infer<typeof SurveyPaginationSchema>;
type SurveyFailureCode = z.infer<typeof SurveyFailureCodeSchema>;

type SurveyResult<T> =
  | {ok: true; data: T}
  | {ok: false; code: SurveyFailureCode};

const TrustedAdminActorSchema = z.object({
  userId: z.string().trim().regex(SAFE_IDENTIFIER_PATTERN),
  role: z.literal("ADMIN"),
  expiresAt: z.date(),
}).strict();

function actorOrNull(rawActor: unknown, now: Date) {
  const actor = TrustedAdminActorSchema.safeParse(rawActor);
  return actor.success && actor.data.expiresAt > now ? actor.data : null;
}

function isPrismaCode(error: unknown, code: string) {
  return (
    error instanceof PrismaNamespace.PrismaClientKnownRequestError
    && error.code === code
  );
}

function uniqueFailure(error: unknown): SurveyResult<never> {
  if (!isPrismaCode(error, "P2002")) return {ok: false, code: "UNAVAILABLE"};
  const target =
    error instanceof PrismaNamespace.PrismaClientKnownRequestError
      ? String(error.meta?.target ?? "")
      : "";
  return {
    ok: false,
    code: target.toLowerCase().includes("slug") ? "SLUG_CONFLICT" : "UNAVAILABLE",
  };
}

function pageMeta(page: number, pageSize: 10 | 20 | 50, total: number) {
  const totalPages = Math.ceil(total / pageSize);
  return SurveyPaginationMetadataSchema.parse({
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  });
}

const QUESTION_SELECT = {
  id: true,
  prompt: true,
  type: true,
  options: true,
  isRequired: true,
  order: true,
} as const;

export function normalizeSurveyPagination(params: URLSearchParams): SurveyPagination | {ok: false; code: "REQUEST_INVALID"} {
  try {
    const raw = RawSurveyPaginationSchema.parse(
      Object.fromEntries(params.entries()),
    );
    return SurveyPaginationSchema.parse({
      page: raw.page === undefined ? 1 : Number(raw.page),
      pageSize: raw.pageSize === undefined ? 20 : Number(raw.pageSize),
      definitionId: raw.definitionId ?? null,
    });
  } catch {
    return {ok: false, code: "REQUEST_INVALID"};
  }
}

export async function listSurveyDefinitions(
  prisma: SurveyDatabase,
  rawActor: unknown,
  rawPagination: unknown,
  now = new Date(),
): Promise<SurveyResult<z.infer<typeof SurveyDefinitionListResultSchema>>> {
  if (!actorOrNull(rawActor, now)) return {ok: false, code: "SESSION_INVALID"};
  const parsed = SurveyPaginationSchema.safeParse(rawPagination);
  if (!parsed.success) return {ok: false, code: "REQUEST_INVALID"};
  const {page, pageSize} = parsed.data;
  const skip = (page - 1) * pageSize;

  try {
    const [rows, total] = await prisma.$transaction([
      prisma.surveyDefinition.findMany({
        skip,
        take: pageSize,
        orderBy: {updatedAt: "desc"},
        include: {_count: {select: {questions: true, submissions: true}}},
      }),
      prisma.surveyDefinition.count(),
    ]);
    const items = rows.map((row) => {
      const counts = row._count as {questions: number; submissions: number} | undefined;
      return SurveyDefinitionAdminViewSchema.parse({
        id: row.id,
        slug: row.slug,
        title: row.title,
        version: row.version,
        isActive: row.isActive,
        questionCount: counts?.questions ?? 0,
        submissionCount: counts?.submissions ?? 0,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      });
    });
    return {
      ok: true,
      data: SurveyDefinitionListResultSchema.parse({
        items,
        page: pageMeta(page, pageSize, total),
      }),
    };
  } catch {
    return {ok: false, code: "UNAVAILABLE"};
  }
}

export async function createSurveyDefinition(
  prisma: SurveyDatabase,
  rawActor: unknown,
  input: SurveyDefinitionInput,
  now = new Date(),
): Promise<SurveyResult<z.infer<typeof SurveyDefinitionAdminViewSchema>>> {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"};

  try {
    const validated = SurveyDefinitionInputSchema.parse(input);
    const row = await prisma.$transaction(async (tx) => {
      const def = await tx.surveyDefinition.create({
        data: {
          slug: validated.slug,
          title: validated.title,
          isActive: validated.isActive,
          questions: {
            create: validated.questions.map((q) => ({
              prompt: q.prompt,
              type: q.type,
              options: q.options as PrismaNamespace.InputJsonValue,
              isRequired: q.isRequired,
              order: q.order,
            })),
          },
        },
        include: {_count: {select: {questions: true, submissions: true}}},
      });

      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "CREATE",
          resourceType: "SurveyDefinition",
          resourceId: def.id,
        },
      });

      return def;
    });

    const counts = row._count as {questions: number; submissions: number} | undefined;
    return {
      ok: true,
      data: SurveyDefinitionAdminViewSchema.parse({
        id: row.id,
        slug: row.slug,
        title: row.title,
        version: row.version,
        isActive: row.isActive,
        questionCount: counts?.questions ?? 0,
        submissionCount: counts?.submissions ?? 0,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }),
    };
  } catch (error) {
    if (isPrismaCode(error, "P2002")) return uniqueFailure(error);
    if (error instanceof z.ZodError) return {ok: false, code: "VALIDATION_FAILED"};
    return {ok: false, code: "UNAVAILABLE"};
  }
}

export async function updateSurveyDefinition(
  prisma: SurveyDatabase,
  rawActor: unknown,
  id: string,
  input: SurveyDefinitionInput,
  now = new Date(),
): Promise<SurveyResult<z.infer<typeof SurveyDefinitionAdminViewSchema>>> {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"};

  try {
    const validated = SurveyDefinitionInputSchema.parse(input);
    const existing = await prisma.surveyDefinition.findUnique({
      where: {id},
      select: {id: true, version: true},
    });
    if (!existing) return {ok: false, code: "NOT_FOUND"};

    const row = await prisma.$transaction(async (tx) => {
      await tx.surveyQuestion.deleteMany({where: {definitionId: id}});

      const def = await tx.surveyDefinition.update({
        where: {id},
        data: {
          slug: validated.slug,
          title: validated.title,
          isActive: validated.isActive,
          version: {increment: 1},
          questions: {
            create: validated.questions.map((q) => ({
              prompt: q.prompt,
              type: q.type,
              options: q.options as PrismaNamespace.InputJsonValue,
              isRequired: q.isRequired,
              order: q.order,
            })),
          },
        },
        include: {_count: {select: {questions: true, submissions: true}}},
      });

      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "UPDATE",
          resourceType: "SurveyDefinition",
          resourceId: id,
        },
      });

      return def;
    });

    const counts = row._count as {questions: number; submissions: number} | undefined;
    return {
      ok: true,
      data: SurveyDefinitionAdminViewSchema.parse({
        id: row.id,
        slug: row.slug,
        title: row.title,
        version: row.version,
        isActive: row.isActive,
        questionCount: counts?.questions ?? 0,
        submissionCount: counts?.submissions ?? 0,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }),
    };
  } catch (error) {
    if (isPrismaCode(error, "P2002")) return uniqueFailure(error);
    if (error instanceof z.ZodError) return {ok: false, code: "VALIDATION_FAILED"};
    return {ok: false, code: "UNAVAILABLE"};
  }
}

export async function setSurveyActivation(
  prisma: SurveyDatabase,
  rawActor: unknown,
  id: string,
  isActive: boolean,
  now = new Date(),
): Promise<SurveyResult<z.infer<typeof SurveyDefinitionAdminViewSchema>>> {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"};

  try {
    const existing = await prisma.surveyDefinition.findUnique({
      where: {id},
      select: {id: true},
    });
    if (!existing) return {ok: false, code: "NOT_FOUND"};

    const row = await prisma.$transaction(async (tx) => {
      const def = await tx.surveyDefinition.update({
        where: {id},
        data: {isActive},
        include: {_count: {select: {questions: true, submissions: true}}},
      });

      await tx.activityLog.create({
        data: {
          actorId: actor.userId,
          action: "UPDATE",
          resourceType: "SurveyDefinition",
          resourceId: id,
          metadata: {operation: isActive ? "ACTIVATE" : "DEACTIVATE"},
        },
      });

      return def;
    });

    const counts = row._count as {questions: number; submissions: number} | undefined;
    return {
      ok: true,
      data: SurveyDefinitionAdminViewSchema.parse({
        id: row.id,
        slug: row.slug,
        title: row.title,
        version: row.version,
        isActive: row.isActive,
        questionCount: counts?.questions ?? 0,
        submissionCount: counts?.submissions ?? 0,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }),
    };
  } catch (error) {
    if (error instanceof z.ZodError) return {ok: false, code: "VALIDATION_FAILED"};
    return {ok: false, code: "UNAVAILABLE"};
  }
}

export async function listSurveySubmissions(
  prisma: SurveyDatabase,
  rawActor: unknown,
  rawPagination: unknown,
  now = new Date(),
): Promise<SurveyResult<z.infer<typeof SurveySubmissionListResultSchema>>> {
  if (!actorOrNull(rawActor, now)) return {ok: false, code: "SESSION_INVALID"};
  const parsed = SurveyPaginationSchema.safeParse(rawPagination);
  if (!parsed.success) return {ok: false, code: "REQUEST_INVALID"};
  const {page, pageSize, definitionId} = parsed.data;
  const skip = (page - 1) * pageSize;

  try {
    const where: Prisma.SurveySubmissionWhereInput = definitionId
      ? {definitionId}
      : {};

    const [rows, total] = await prisma.$transaction([
      prisma.surveySubmission.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {createdAt: "desc"},
        include: {
          answers: {
            include: {question: {select: {id: true, prompt: true, type: true}}},
          },
        },
      }),
      prisma.surveySubmission.count({where}),
    ]);

    const items = rows.map((row) =>
      SurveySubmissionRowSchema.parse({
        id: row.id,
        definitionVersion: row.definitionVersion,
        locale: row.locale,
        createdAt: row.createdAt.toISOString(),
        answers: row.answers.map((a) => ({
          questionId: a.question.id,
          prompt: a.question.prompt,
          type: a.question.type,
          value: a.value,
        })),
      }),
    );

    return {
      ok: true,
      data: SurveySubmissionListResultSchema.parse({
        items,
        page: pageMeta(page, pageSize, total),
      }),
    };
  } catch {
    return {ok: false, code: "UNAVAILABLE"};
  }
}

export async function exportSurveySubmissionsCsv(
  prisma: SurveyDatabase,
  rawActor: unknown,
  definitionId: string,
  now = new Date(),
): Promise<SurveyResult<string>> {
  if (!actorOrNull(rawActor, now)) return {ok: false, code: "SESSION_INVALID"};

  try {
    const definition = await prisma.surveyDefinition.findUnique({
      where: {id: definitionId},
      select: {
        id: true,
        title: true,
        questions: {
          select: {id: true, prompt: true, type: true, order: true},
          orderBy: {order: "asc"},
        },
      },
    });
    if (!definition) return {ok: false, code: "NOT_FOUND"};

    const submissions = await prisma.surveySubmission.findMany({
      where: {definitionId},
      orderBy: {createdAt: "desc"},
      include: {
        answers: {
          include: {question: {select: {id: true, prompt: true, type: true}}},
        },
      },
    });

    const answerMap = new Map<string, Map<string, unknown>>();
    for (const sub of submissions) {
      const inner = new Map<string, unknown>();
      for (const answer of sub.answers) {
        inner.set(
          answer.question.id,
          typeof answer.value === "string" ? answer.value : JSON.stringify(answer.value),
        );
      }
      answerMap.set(sub.id, inner);
    }

    const questionHeaders = definition.questions.map((q) => `"${protectCsvFormulaCell(q.prompt)}"`);
    const header = `"Submission ID","Created At","Locale",${questionHeaders.join(",")}`;

    const rows = submissions.map((sub) => {
      const cells = [
        `"${protectCsvFormulaCell(sub.id)}"`,
        `"${sub.createdAt.toISOString()}"`,
        `"${protectCsvFormulaCell(sub.locale)}"`,
        ...definition.questions.map((q) => {
          const val = answerMap.get(sub.id)?.get(q.id);
          if (val === undefined || val === null) return '""';
          return `"${protectCsvFormulaCell(String(val))}"`;
        }),
      ];
      return cells.join(",");
    });

    return {ok: true, data: [header, ...rows].join("\n")};
  } catch {
    return {ok: false, code: "UNAVAILABLE"};
  }
}

export async function getActiveSurvey(
  prisma: SurveyDatabase,
  slug: string,
): Promise<SurveyResult<z.infer<typeof SurveyPublicViewSchema>>> {
  try {
    const definition = await prisma.surveyDefinition.findUnique({
      where: {slug},
      include: {
        questions: {
          select: QUESTION_SELECT,
          orderBy: {order: "asc"},
        },
      },
    });

    if (!definition || !definition.isActive) {
      return {ok: false, code: "NOT_FOUND"};
    }

    return {
      ok: true,
      data: SurveyPublicViewSchema.parse({
        id: definition.id,
        slug: definition.slug,
        title: definition.title,
        version: definition.version,
        questions: definition.questions.map((q) => ({
          id: q.id,
          prompt: q.prompt,
          type: q.type,
          options: q.options as string[] | null,
          isRequired: q.isRequired,
          order: q.order,
        })),
      }),
    };
  } catch {
    return {ok: false, code: "UNAVAILABLE"};
  }
}

function validateAnswerValue(
  type: z.infer<typeof SurveyQuestionTypeSchema>,
  value: unknown,
  options: unknown,
): boolean {
  if (value === null || value === undefined) return false;
  switch (type) {
    case "SHORT_TEXT":
      return typeof value === "string" && value.trim().length > 0 && value.length <= 1000;
    case "LONG_TEXT":
      return typeof value === "string" && value.trim().length > 0 && value.length <= 10000;
    case "SINGLE_CHOICE":
      return (
        typeof value === "string"
        && Array.isArray(options)
        && options.includes(value)
      );
    case "MULTIPLE_CHOICE":
      return (
        Array.isArray(value)
        && value.length > 0
        && Array.isArray(options)
        && value.every((v) => typeof v === "string" && options.includes(v))
      );
    case "RATING":
      return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 10;
    default:
      return false;
  }
}

export async function submitSurveyAnswers(
  prisma: SurveyDatabase,
  input: SurveySubmissionInput,
  rateLimitSecret: string,
  clientIp: string,
  now = new Date(),
): Promise<SurveyResult<{submissionId: string}>> {
  try {
    const validated = SurveySubmissionInputSchema.parse(input);

    const definition = await prisma.surveyDefinition.findUnique({
      where: {id: validated.definitionId},
      include: {
        questions: {
          select: {
            id: true,
            prompt: true,
            type: true,
            options: true,
            isRequired: true,
            order: true,
          },
          orderBy: {order: "asc"},
        },
      },
    });

    if (!definition || !definition.isActive) {
      return {ok: false, code: "INACTIVE_SURVEY"};
    }

    const questionMap = new Map(definition.questions.map((q) => [q.id, q]));

    for (const q of definition.questions) {
      if (!q.isRequired) continue;
      const answer = validated.answers.find((a) => a.questionId === q.id);
      if (!answer) return {ok: false, code: "ANSWER_INVALID"};
    }

    for (const answer of validated.answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) return {ok: false, code: "ANSWER_INVALID"};
      if (!validateAnswerValue(question.type, answer.value, question.options)) {
        return {ok: false, code: "ANSWER_INVALID"};
      }
    }

    const keyHash = createSharedRateLimitKey(
      "SURVEY_SUBMIT",
      clientIp,
      rateLimitSecret,
    );

    const rateLimitResult = await consumeSharedRateLimit(prisma, {
      policy: "SURVEY_SUBMIT",
      keyHash,
      now,
    });

    if (!rateLimitResult.allowed) {
      return {ok: false, code: "RATE_LIMITED"};
    }

    const submission = await prisma.$transaction(async (tx) => {
      const sub = await tx.surveySubmission.create({
        data: {
          definitionId: definition.id,
          definitionVersion: definition.version,
          locale: validated.locale,
          answers: {
            create: validated.answers.map((a) => ({
              questionId: a.questionId,
              value: a.value as PrismaNamespace.InputJsonValue,
            })),
          },
        },
        select: {id: true},
      });

      await tx.activityLog.create({
        data: {
          action: "CREATE",
          resourceType: "SurveySubmission",
          resourceId: sub.id,
        },
      });

      return sub;
    });

    return {ok: true, data: {submissionId: submission.id}};
  } catch (error) {
    if (error instanceof z.ZodError) return {ok: false, code: "VALIDATION_FAILED"};
    return {ok: false, code: "UNAVAILABLE"};
  }
}

export function surveyHttpStatus(result: {ok: boolean; code?: string}) {
  if (result.ok) return 200;
  if (result.code === "SESSION_INVALID") return 401;
  if (result.code === "CSRF_INVALID") return 403;
  if (result.code === "NOT_FOUND") return 404;
  if (result.code === "RATE_LIMITED") return 429;
  if (result.code === "SLUG_CONFLICT") return 409;
  if (result.code === "UNAVAILABLE") return 503;
  return 400;
}
