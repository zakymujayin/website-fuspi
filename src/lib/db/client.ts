import {PrismaPg} from "@prisma/adapter-pg";

import {PrismaClient} from "@/generated/prisma/client";
import {parseDatabaseUrl} from "@/lib/db/config";

export function createPrismaClient(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to create a Prisma client.");
  }

  const adapter = new PrismaPg(parseDatabaseUrl(databaseUrl));
  return new PrismaClient({adapter});
}

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export function getPrismaClient() {
  const client = globalForPrisma.prisma ?? createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}
