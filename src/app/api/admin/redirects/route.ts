import {revalidatePath} from "next/cache";

import {saveRedirect} from "@/lib/redirect/registry";
import {isSameOriginRequest} from "@/lib/auth/runtime/csrf";
import {getRequestSession} from "@/lib/auth/runtime/request-session";
import {getPrismaClient} from "@/lib/db/client";
import {RedirectRegistryInputSchema} from "@/contracts/operations";
import {z} from "zod";

const MAX_JSON_BYTES = 1_048_576;

function json(value: unknown, status = 200) {
  return Response.json(value, {status, headers: {"Cache-Control": "no-store"}});
}

async function readBoundedJson(request: Request): Promise<{ok: true; data: unknown} | {ok: false}> {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return {ok: false};
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(declared) || declared < 0 || declared > MAX_JSON_BYTES || !request.body) return {ok: false};
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_JSON_BYTES) { await reader.cancel(); return {ok: false}; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return {ok: true, data: JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(bytes))};
  } catch { return {ok: false}; }
}

const ACTOR_SCHEMA = z.object({userId: z.string(), role: z.literal("ADMIN"), mustChangePassword: z.literal(false), expiresAt: z.date()});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "20");
  const session = await getRequestSession();
  if (!session.ok) return json({ok: false, code: "SESSION_INVALID"}, 401);
  const actor = ACTOR_SCHEMA.safeParse(session.session);
  if (!actor.success || actor.data.expiresAt <= new Date()) return json({ok: false, code: "SESSION_INVALID"}, 401);

  const prisma = getPrismaClient();
  try {
    const [items, total] = await prisma.$transaction([
      prisma.redirect.findMany({
        orderBy: {updatedAt: "desc"},
        skip: (Math.max(1, page) - 1) * Math.min(50, Math.max(10, pageSize)),
        take: Math.min(50, Math.max(10, pageSize)),
      }),
      prisma.redirect.count(),
    ]);
    const totalPages = Math.ceil(total / Math.min(50, Math.max(10, pageSize)));
    return json({
      ok: true,
      items: items.map(r => ({
        id: r.id, sourcePath: r.sourcePath, destinationPath: r.destinationPath,
        statusCode: r.statusCode, isActive: r.isActive, hitCount: r.hitCount,
        createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
      })),
      page: {page: Math.max(1, page), pageSize: Math.min(50, Math.max(10, pageSize)), total, totalPages,
        hasNextPage: Math.max(1, page) < totalPages, hasPreviousPage: Math.max(1, page) > 1},
    });
  } catch { return json({ok: false, code: "UNAVAILABLE"}, 503); }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request.headers)) return json({ok: false, code: "CSRF_INVALID"}, 403);
  const body = await readBoundedJson(request);
  if (!body.ok) return json({ok: false, code: "REQUEST_INVALID"}, 400);
  const session = await getRequestSession();
  if (!session.ok) return json({ok: false, code: "SESSION_INVALID"}, 401);
  const actor = ACTOR_SCHEMA.safeParse(session.session);
  if (!actor.success || actor.data.expiresAt <= new Date()) return json({ok: false, code: "SESSION_INVALID"}, 401);

  try {
    const input = RedirectRegistryInputSchema.parse(body.data);
    const result = await saveRedirect(getPrismaClient(), input);
    if (!result.ok) return json(result, result.code === "REDIRECT_LOOP" || result.code === "REDIRECT_CHAIN" ? 409 : 400);
    for (const locale of ["id", "en", "ar"] as const) revalidatePath(`/${locale}/admin/redirects`);
    return json(result);
  } catch (e) {
    if (e instanceof z.ZodError) return json({ok: false, code: "VALIDATION_FAILED"}, 400);
    return json({ok: false, code: "UNAVAILABLE"}, 503);
  }
}
