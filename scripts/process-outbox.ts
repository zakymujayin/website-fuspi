import "dotenv/config";

import {pathToFileURL} from "node:url";

import {createPrismaClient} from "../src/lib/db/client";
import {
  createSmtpOutboxSender,
  parseSmtpOutboxEnvironment,
} from "../src/lib/outbox/smtp";
import {
  createPrismaOutboxRepository,
  processOutboxBatch,
  type ProcessOutboxResult,
} from "../src/lib/outbox/worker";

export function formatOutboxProcessResult(result: ProcessOutboxResult) {
  return Object.freeze({
    claimed: result.claimed,
    sent: result.sent,
    failed: result.failed,
    ownershipLost: result.ownershipLost,
  });
}

export async function runOutboxProcess(
  environment: Record<string, string | undefined> = process.env,
) {
  const config = parseSmtpOutboxEnvironment(environment);
  const database = createPrismaClient(environment.DATABASE_URL);
  try {
    await database.$connect();
    return formatOutboxProcessResult(
      await processOutboxBatch({
        repository: createPrismaOutboxRepository(database),
        sender: createSmtpOutboxSender({config: config.smtp}),
        config: config.worker,
      }),
    );
  } finally {
    await database.$disconnect();
  }
}

async function main() {
  try {
    const result = await runOutboxProcess();
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch {
    process.stderr.write("Outbox processing failed.\n");
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
