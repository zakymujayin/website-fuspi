let userIdCounter = 0;

export interface FixtureUser {
  id: string;
  name: string;
  email: string;
  emailVerified: Date | null;
  passwordHash: string | null;
  image: string | null;
  role: "ADMIN" | "EDITOR" | "PETUGAS" | "SATGAS_PPKS";
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function createUser(overrides: Partial<FixtureUser> = {}): FixtureUser {
  userIdCounter += 1;
  const id = overrides.id ?? `test-user-${userIdCounter}`;
  return {
    id,
    name: `Test User ${userIdCounter}`,
    email: `test-user-${userIdCounter}@fuspi.uinbanten.ac.id`,
    emailVerified: null,
    passwordHash: "$2a$12$testhashplaceholder",
    image: null,
    role: "EDITOR",
    isActive: true,
    mustChangePassword: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

export function createAdmin(overrides: Partial<FixtureUser> = {}): FixtureUser {
  return createUser({
    role: "ADMIN",
    email: `admin-${userIdCounter + 1}@fuspi.uinbanten.ac.id`,
    ...overrides,
  });
}

export function createEditor(overrides: Partial<FixtureUser> = {}): FixtureUser {
  return createUser({ role: "EDITOR", ...overrides });
}

export function createPetugas(overrides: Partial<FixtureUser> = {}): FixtureUser {
  return createUser({
    role: "PETUGAS",
    email: `petugas-${userIdCounter + 1}@fuspi.uinbanten.ac.id`,
    ...overrides,
  });
}

export function createSatgasPPKS(overrides: Partial<FixtureUser> = {}): FixtureUser {
  return createUser({
    role: "SATGAS_PPKS",
    email: `satgas-${userIdCounter + 1}@fuspi.uinbanten.ac.id`,
    ...overrides,
  });
}

export function createInactiveUser(overrides: Partial<FixtureUser> = {}): FixtureUser {
  return createUser({ isActive: false, ...overrides });
}

export function resetUserIdCounter(): void {
  userIdCounter = 0;
}
