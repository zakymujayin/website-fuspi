export type DatabaseConnectionConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  allowPublicKeyRetrieval: boolean;
  ssl: boolean;
};

const LOCAL_DATABASE_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export function parseDatabaseUrl(value: string): DatabaseConnectionConfig {
  const url = new URL(value);

  if (url.protocol !== "mysql:") {
    throw new Error("DATABASE_URL must use the mysql protocol for MariaDB.");
  }

  const database = url.pathname.replace(/^\//, "");
  if (!url.hostname || !url.username || !database) {
    throw new Error("DATABASE_URL must include host, user, and database name.");
  }

  const port = Number(url.port || 3306);
  const connectionLimit = Number(url.searchParams.get("connection_limit") || 10);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("DATABASE_URL contains an invalid port.");
  }
  if (!Number.isInteger(connectionLimit) || connectionLimit < 1 || connectionLimit > 50) {
    throw new Error("DATABASE_URL connection_limit must be an integer from 1 to 50.");
  }

  return {
    host: url.hostname,
    port,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    connectionLimit,
    allowPublicKeyRetrieval: LOCAL_DATABASE_HOSTS.has(url.hostname),
    ssl: url.searchParams.get("ssl") === "true",
  };
}
