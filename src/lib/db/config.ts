export type DatabaseConnectionConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  max: number;
  application_name: string;
  ssl: false | {rejectUnauthorized: boolean};
};

const LOCAL_DATABASE_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const TLS_MODES = new Set(["require", "verify-ca", "verify-full"]);

export function parseDatabaseUrl(value: string): DatabaseConnectionConfig {
  const url = new URL(value);

  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("DATABASE_URL must use the postgresql protocol.");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!host || !url.username || !url.password || !database) {
    throw new Error(
      "DATABASE_URL must include host, user, password, and database name.",
    );
  }

  const port = Number(url.port || 5432);
  const connectionLimit = Number(url.searchParams.get("connection_limit") || 10);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("DATABASE_URL contains an invalid port.");
  }
  if (!Number.isInteger(connectionLimit) || connectionLimit < 1 || connectionLimit > 50) {
    throw new Error("DATABASE_URL connection_limit must be an integer from 1 to 50.");
  }

  const isLocal = LOCAL_DATABASE_HOSTS.has(host);
  const sslMode = url.searchParams.get("sslmode") ?? (isLocal ? "disable" : "");
  if (!isLocal && !TLS_MODES.has(sslMode)) {
    throw new Error("Remote PostgreSQL connections must require TLS via sslmode.");
  }
  if (sslMode !== "disable" && !TLS_MODES.has(sslMode)) {
    throw new Error("DATABASE_URL contains an unsupported sslmode.");
  }

  return {
    host,
    port,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    max: connectionLimit,
    application_name: url.searchParams.get("application_name") || "fuspi-web",
    ssl:
      sslMode === "disable"
        ? false
        : {rejectUnauthorized: sslMode === "verify-ca" || sslMode === "verify-full"},
  };
}
