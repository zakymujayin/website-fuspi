import {ActiveDatabaseSessionSchema, type ActiveDatabaseSession} from "@/contracts/auth";
import {PublicMediaViewSchema} from "@/contracts/media";
import {
  AdminPageEditorViewSchema,
  AdminPageListQuerySchema,
  AdminPageListResultSchema,
  AdminPageListSearchParamsSchema,
  AdminPageMutationResponseSchema,
  AdminPageTransportCommandSchema,
  toAdminPageMutationResponse,
  type AdminPageEditorView,
  type AdminPageListResult,
  type AdminPageMutationResponse,
} from "@/contracts/page-admin";
import {PageIdSchema} from "@/features/content/pages/contract";
import {
  createPage,
  deletePage,
  mutatePagePublication,
  updatePage,
} from "@/features/content/pages/mutations";
import {getPageDetail, listPages} from "@/features/content/pages/queries";
import {createPrismaClient} from "@/lib/db/client";

export type AdminPageTransportDatabase = ReturnType<typeof createPrismaClient>;
export type AdminPageTransportClock = () => Date;

type Actor = ActiveDatabaseSession & {role: "ADMIN"};
type LoadFailureCode = "SESSION_INVALID" | "REQUEST_INVALID" | "NOT_FOUND" | "UNAVAILABLE";

export type AdminPageListLoadResult =
  | {ok: true; data: AdminPageListResult}
  | {ok: false; code: LoadFailureCode};

export type AdminPageEditorLoadResult =
  | {ok: true; data: AdminPageEditorView}
  | {ok: false; code: LoadFailureCode};

const SYSTEM_CLOCK: AdminPageTransportClock = () => new Date();

function actorFromSession(raw: unknown, now: Date): Actor | null {
  const parsed = ActiveDatabaseSessionSchema.safeParse(raw);
  if (
    !parsed.success
    || parsed.data.expiresAt <= now
    || parsed.data.mustChangePassword
    || parsed.data.role !== "ADMIN"
  ) return null;
  return {...parsed.data, role: parsed.data.role};
}

function normalizeUploadBase(raw: string): string | null {
  if (!raw || raw.length > 2_048 || raw.includes("\\") || /[\u0000-\u001f\u007f-\u009f]/u.test(raw)) {
    return null;
  }
  try {
    const relative = raw.startsWith("/") && !raw.startsWith("//");
    const value = new URL(raw, "https://fuspi.invalid");
    if (
      (!relative && value.protocol !== "https:")
      || value.username
      || value.password
      || value.search
      || value.hash
    ) return null;
    const path = value.pathname.replace(/\/+$/u, "");
    if (!path || path === "/") return null;
    return relative ? path : `${value.origin}${path}`;
  } catch {
    return null;
  }
}

function safeHero(media: {
  id: string;
  storageKey: string;
  storageClass: "PUBLIC" | "PRIVATE" | "PPKS_PRIVATE";
  mimeType: string;
  size: number;
  alt: string | null;
  isDecorative: boolean;
  width: number | null;
  height: number | null;
} | null, uploadBase: string) {
  if (!media || media.storageClass !== "PUBLIC" || media.alt === null) return null;
  const {id, mimeType, size, alt, isDecorative, width, height} = media;
  const parsed = PublicMediaViewSchema.safeParse({
    id,
    url: `${uploadBase}/${media.storageKey}`,
    mimeType,
    size,
    alt,
    isDecorative,
    width,
    height,
  });
  return parsed.success ? parsed.data : null;
}

export function normalizeAdminPageSearchParams(params: URLSearchParams) {
  const raw: Record<string, string> = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    if (values.length !== 1) {
      return {ok: false as const, code: "REQUEST_INVALID" as const};
    }
    raw[key] = values[0] ?? "";
  }
  const parsed = AdminPageListSearchParamsSchema.safeParse(raw);
  return parsed.success
    ? {ok: true as const, data: parsed.data}
    : {ok: false as const, code: "REQUEST_INVALID" as const};
}

export async function listAdminPages(
  database: AdminPageTransportDatabase,
  rawSession: unknown,
  rawQuery: unknown,
  clock: AdminPageTransportClock = SYSTEM_CLOCK,
): Promise<AdminPageListLoadResult> {
  const actor = actorFromSession(rawSession, clock());
  if (!actor) return {ok: false, code: "SESSION_INVALID"};
  const query = AdminPageListQuerySchema.safeParse(rawQuery);
  if (!query.success) return {ok: false, code: "REQUEST_INVALID"};

  try {
    const result = await listPages(database, actor, query.data, clock);
    if (!result.ok) return {ok: false, code: result.code};
    const safe = AdminPageListResultSchema.safeParse(result.data);
    return safe.success ? {ok: true, data: safe.data} : {ok: false, code: "UNAVAILABLE"};
  } catch {
    return {ok: false, code: "UNAVAILABLE"};
  }
}

export async function getAdminPageEditor(
  database: AdminPageTransportDatabase,
  rawSession: unknown,
  pageId: unknown,
  publicUploadBaseUrl: string,
  clock: AdminPageTransportClock = SYSTEM_CLOCK,
): Promise<AdminPageEditorLoadResult> {
  const actor = actorFromSession(rawSession, clock());
  if (!actor) return {ok: false, code: "SESSION_INVALID"};
  const parsedId = PageIdSchema.safeParse(pageId);
  if (!parsedId.success) return {ok: false, code: "NOT_FOUND"};

  try {
    const detail = await getPageDetail(database, actor, parsedId.data, clock);
    if (!detail.ok) {
      return {
        ok: false,
        code: detail.code === "REQUEST_INVALID" ? "NOT_FOUND" : detail.code,
      };
    }

    let hero = null;
    if (detail.data.heroMediaId) {
      const uploadBase = normalizeUploadBase(publicUploadBaseUrl);
      if (!uploadBase) return {ok: false, code: "UNAVAILABLE"};
      const media = await database.media.findUnique({
        where: {id: detail.data.heroMediaId},
        select: {
          id: true,
          storageKey: true,
          storageClass: true,
          mimeType: true,
          size: true,
          alt: true,
          isDecorative: true,
          width: true,
          height: true,
        },
      });
      hero = safeHero(media, uploadBase);
      if (!hero) return {ok: false, code: "UNAVAILABLE"};
    }

    const safe = AdminPageEditorViewSchema.safeParse({...detail.data, hero});
    return safe.success ? {ok: true, data: safe.data} : {ok: false, code: "UNAVAILABLE"};
  } catch {
    return {ok: false, code: "UNAVAILABLE"};
  }
}

type AdminPageFailureResponse = Extract<AdminPageMutationResponse, {ok: false}>;

function mutationFailure(code: AdminPageFailureResponse["code"]): AdminPageMutationResponse {
  return AdminPageMutationResponseSchema.parse({ok: false, code});
}

export async function executeAdminPageCommand(
  database: AdminPageTransportDatabase,
  rawSession: unknown,
  rawCommand: unknown,
  clock: AdminPageTransportClock = SYSTEM_CLOCK,
): Promise<AdminPageMutationResponse> {
  const actor = actorFromSession(rawSession, clock());
  if (!actor) return mutationFailure("SESSION_INVALID");
  const command = AdminPageTransportCommandSchema.safeParse(rawCommand);
  if (!command.success) return mutationFailure("REQUEST_INVALID");

  try {
    const result = command.data.action === "CREATE"
      ? await createPage(database, actor, command.data.payload, clock)
      : command.data.action === "UPDATE"
        ? await updatePage(database, actor, command.data.payload, clock)
        : command.data.action === "PUBLICATION"
          ? await mutatePagePublication(database, actor, command.data.payload, clock)
          : await deletePage(database, actor, command.data.payload, clock);
    return toAdminPageMutationResponse(result);
  } catch {
    return mutationFailure("UNAVAILABLE");
  }
}

export function adminPageHttpStatus(result: {ok: boolean; code?: string}) {
  if (result.ok) return 200;
  if (result.code === "SESSION_INVALID") return 401;
  if (result.code === "CSRF_INVALID") return 403;
  if (result.code === "NOT_FOUND") return 404;
  if ([
    "VERSION_CONFLICT",
    "INVALID_STATE",
    "SLUG_CONFLICT",
    "HIERARCHY_CYCLE",
  ].includes(result.code ?? "")) return 409;
  if (["MEDIA_INVALID", "PARENT_INVALID"].includes(result.code ?? "")) return 422;
  if (result.code === "UNAVAILABLE") return 503;
  return 400;
}
