import {getPrismaClient} from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, {ok: boolean; latencyMs?: number}> = {};
  let overall = true;

  const dbStart = Date.now();
  try {
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {ok: true, latencyMs: Date.now() - dbStart};
  } catch {
    checks.database = {ok: false};
    overall = false;
  }

  const uptime = process.uptime();
  const memory = process.memoryUsage();

  return Response.json({
    ok: overall,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime),
    memory: {
      heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
      rssMb: Math.round(memory.rss / 1024 / 1024),
    },
    checks,
  }, {
    status: overall ? 200 : 503,
    headers: {"Cache-Control": "no-store"},
  });
}
