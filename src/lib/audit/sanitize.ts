const REDACTED = "[REDACTED]";
const MAX_DEPTH = 6;
const MAX_ARRAY_ITEMS = 50;
const MAX_STRING_LENGTH = 500;
const MAX_SERIALIZED_BYTES = 16_384;

const SENSITIVE_KEY =
  /(password|passphrase|token|secret|authorization|cookie|ciphertext|nonce|encryptiontag|privatekey|reporter|identity|ppks|attachment|filename|storagekey)/i;

type SafeJson = null | boolean | number | string | SafeJson[] | {[key: string]: SafeJson};

function visit(value: unknown, depth: number): SafeJson {
  if (depth > MAX_DEPTH) return "[TRUNCATED_DEPTH]";
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") return value.slice(0, MAX_STRING_LENGTH);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map((item) => visit(item, depth + 1));
  }

  if (typeof value === "object") {
    const result = Object.create(null) as {[key: string]: SafeJson};
    for (const [key, child] of Object.entries(value)) {
      result[key] = SENSITIVE_KEY.test(key) ? REDACTED : visit(child, depth + 1);
    }
    return result;
  }

  return String(value).slice(0, MAX_STRING_LENGTH);
}

export function sanitizeAuditMetadata(metadata: Record<string, unknown>): SafeJson {
  const sanitized = visit(metadata, 0);
  const encoded = JSON.stringify(sanitized);

  if (Buffer.byteLength(encoded, "utf8") > MAX_SERIALIZED_BYTES) {
    throw new Error("Sanitized audit metadata exceeds 16 KiB.");
  }

  return sanitized;
}
