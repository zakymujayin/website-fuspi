import {Prisma} from "@/generated/prisma/client";

import {
  RedirectDestinationPathSchema,
  RedirectRegistryInputSchema,
  RedirectSourcePathSchema,
  type RedirectRegistryConflictCode,
  type RedirectRegistryInput,
} from "@/contracts/operations";
import {createPrismaClient} from "@/lib/db/client";

const REDIRECT_REGISTRY_LOCK = 2_026_071_501;

export type RedirectDatabase = ReturnType<typeof createPrismaClient>;
export type RedirectEdge = Readonly<{sourcePath: string; destinationPath: string}>;
export type RedirectGraphResult =
  | Readonly<{ok: true}>
  | Readonly<{ok: false; code: RedirectRegistryConflictCode}>;

export function validateRedirectGraph(edges: readonly RedirectEdge[]): RedirectGraphResult {
  const graph = new Map(edges.map((edge) => [edge.sourcePath, edge.destinationPath]));
  for (const [source, destination] of graph) {
    if (source === destination) return {ok: false, code: "SOURCE_EQUALS_DESTINATION"};
  }
  for (const start of graph.keys()) {
    const visited = new Set<string>();
    let current: string | undefined = start;
    while (current && graph.has(current)) {
      if (visited.has(current)) return {ok: false, code: "REDIRECT_LOOP"};
      visited.add(current);
      current = graph.get(current);
    }
  }
  for (const destination of graph.values()) {
    if (graph.has(destination)) return {ok: false, code: "REDIRECT_CHAIN"};
  }
  return {ok: true};
}

async function lockRegistry(
  transaction: Prisma.TransactionClient,
  mode: "exclusive" | "shared",
) {
  if (mode === "exclusive") {
    await transaction.$queryRaw<Array<{locked: number}>>`
      SELECT 1::int AS "locked"
      FROM pg_advisory_xact_lock(${REDIRECT_REGISTRY_LOCK})
    `;
  } else {
    await transaction.$queryRaw<Array<{locked: number}>>`
      SELECT 1::int AS "locked"
      FROM pg_advisory_xact_lock_shared(${REDIRECT_REGISTRY_LOCK})
    `;
  }
}

export async function saveRedirect(
  database: RedirectDatabase,
  input: RedirectRegistryInput,
) {
  const parsed = RedirectRegistryInputSchema.parse(input);
  return database.$transaction(async (transaction) => {
    await lockRegistry(transaction, "exclusive");
    const active = await transaction.redirect.findMany({
      where: {isActive: true, sourcePath: {not: parsed.sourcePath}},
      select: {sourcePath: true, destinationPath: true},
    });
    const result = validateRedirectGraph(parsed.isActive
      ? [...active, {sourcePath: parsed.sourcePath, destinationPath: parsed.destinationPath}]
      : active);
    if (!result.ok) return result;

    const redirect = await transaction.redirect.upsert({
      where: {sourcePath: parsed.sourcePath},
      create: parsed,
      update: {
        destinationPath: parsed.destinationPath,
        statusCode: parsed.statusCode,
        isActive: parsed.isActive,
      },
      select: {
        id: true,
        sourcePath: true,
        destinationPath: true,
        statusCode: true,
        isActive: true,
      },
    });
    return {ok: true as const, redirect};
  }, {isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted});
}

export async function resolveSafeRedirect(
  database: RedirectDatabase,
  sourcePath: string,
) {
  const source = RedirectSourcePathSchema.parse(sourcePath);
  return database.$transaction(async (transaction) => {
    await lockRegistry(transaction, "shared");
    const redirect = await transaction.redirect.findUnique({
      where: {sourcePath: source},
      select: {
        id: true,
        destinationPath: true,
        statusCode: true,
        isActive: true,
      },
    });
    if (!redirect?.isActive || redirect.statusCode !== 301) return null;
    const destination = RedirectDestinationPathSchema.safeParse(redirect.destinationPath);
    if (!destination.success || destination.data === source) return null;
    const chained = await transaction.redirect.count({
      where: {sourcePath: destination.data, isActive: true},
    });
    if (chained !== 0) return null;
    const updated = await transaction.redirect.updateMany({
      where: {
        id: redirect.id,
        isActive: true,
        destinationPath: destination.data,
        statusCode: 301,
      },
      data: {hitCount: {increment: 1}},
    });
    return updated.count === 1
      ? {destinationPath: destination.data, statusCode: 301 as const}
      : null;
  }, {isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted});
}
