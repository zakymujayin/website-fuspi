import {describe, expect, it} from "vitest";

import {parseDatabaseUrl} from "@/lib/db/config";

describe("database URL contract", () => {
  it("maps a PostgreSQL URL to a bounded pool config", () => {
    expect(
      parseDatabaseUrl(
        "postgresql://fuspi:p%40ss@db.internal:5433/fuspi?connection_limit=7&sslmode=verify-full&application_name=fuspi-test",
      ),
    ).toEqual({
      host: "db.internal",
      port: 5433,
      user: "fuspi",
      password: "p@ss",
      database: "fuspi",
      max: 7,
      application_name: "fuspi-test",
      ssl: {rejectUnauthorized: true},
    });
  });

  it("allows non-TLS connections only on loopback development hosts", () => {
    expect(parseDatabaseUrl("postgresql://u:p@127.0.0.1/db").ssl).toBe(false);
    expect(parseDatabaseUrl("postgresql://u:p@[::1]/db").ssl).toBe(false);
    expect(
      parseDatabaseUrl("postgresql://u:p@db.example.edu/db?sslmode=require").ssl,
    ).toEqual({rejectUnauthorized: false});
  });

  it.each([
    "mysql://u:p@localhost/db",
    "postgresql://localhost/db",
    "postgresql://u@localhost/db",
    "postgresql://u:p@localhost/",
    "postgresql://u:p@localhost/db?connection_limit=0",
    "postgresql://u:p@localhost/db?connection_limit=100",
    "postgresql://u:p@db.example.edu/db",
    "postgresql://u:p@db.example.edu/db?sslmode=disable",
    "postgresql://u:p@localhost/db?sslmode=prefer",
  ])("rejects incomplete or incompatible URLs: %s", (url) => {
    expect(() => parseDatabaseUrl(url)).toThrow();
  });
});
