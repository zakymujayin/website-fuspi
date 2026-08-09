import {PrismaAdapter} from "@auth/prisma-adapter";
import type {Adapter} from "next-auth/adapters";

import type {createPrismaClient} from "@/lib/db/client";

type PrismaClient = ReturnType<typeof createPrismaClient>;

export function createActiveSessionAdapter(prisma: PrismaClient): Adapter {
  const base = PrismaAdapter(prisma);
  const getSessionAndUser = base.getSessionAndUser;
  if (!getSessionAndUser) {
    throw new Error("The pinned adapter is missing database-session support.");
  }

  return {
    ...base,
    async getSessionAndUser(sessionToken) {
      const result = await getSessionAndUser(sessionToken);
      const user = result?.user as {isActive?: boolean} | undefined;
      if (!result || result.session.expires <= new Date() || user?.isActive !== true) {
        await prisma.session.deleteMany({where: {sessionToken}});
        return null;
      }
      return result;
    },
    async deleteSession(sessionToken) {
      const record = await prisma.session.findUnique({where: {sessionToken}});
      await prisma.session.deleteMany({where: {sessionToken}});
      return record;
    },
  };
}
