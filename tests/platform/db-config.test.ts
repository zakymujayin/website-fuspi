import {describe, expect, it} from "vitest";

import {parseDatabaseUrl} from "@/lib/db/config";

describe("database URL contract", () => {
  it("maps a MariaDB-compatible mysql URL to adapter config", () => {
    expect(
      parseDatabaseUrl(
        "mysql://fuspi:p%40ss@db.internal:3307/fuspi?connection_limit=7&ssl=true",
      ),
    ).toEqual({
      host: "db.internal",
      port: 3307,
      user: "fuspi",
      password: "p@ss",
      database: "fuspi",
      connectionLimit: 7,
      allowPublicKeyRetrieval: false,
      ssl: true,
    });
  });

  it("allows RSA public-key retrieval only on loopback development hosts", () => {
    expect(parseDatabaseUrl("mysql://u:p@127.0.0.1/db").allowPublicKeyRetrieval).toBe(
      true,
    );
    expect(parseDatabaseUrl("mysql://u:p@[::1]/db").allowPublicKeyRetrieval).toBe(true);
    expect(parseDatabaseUrl("mysql://u:p@db.example.edu/db").allowPublicKeyRetrieval).toBe(
      false,
    );
  });

  it.each([
    "postgresql://u:p@localhost/db",
    "mysql://localhost/db",
    "mysql://u:p@localhost/",
    "mysql://u:p@localhost/db?connection_limit=0",
    "mysql://u:p@localhost/db?connection_limit=100",
  ])("rejects incomplete or incompatible URLs: %s", (url) => {
    expect(() => parseDatabaseUrl(url)).toThrow();
  });
});
