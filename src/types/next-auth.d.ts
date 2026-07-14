import type {AuthRole} from "@/contracts/auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AuthRole;
      isActive: true;
      mustChangePassword: boolean;
    };
  }
}

export {};
