import type {EncryptionKeyResolver} from "@/lib/security/encryption";

const AES_256_KEY_BYTES = 32;
const CURRENT_KEY_ENV = "PPKS_ENCRYPTION_KEY";
const CURRENT_VERSION_ENV = "PPKS_ENCRYPTION_KEY_VERSION";
const RETIRED_KEY_PREFIX = "PPKS_ENCRYPTION_KEY_V";

export type PpksSealingKey = Readonly<{key: Uint8Array; keyVersion: number}>;

/* Narrower than `NodeJS.ProcessEnv`: only string lookups are needed, and this
   lets a caller pass an explicit map instead of the ambient environment. */
export type EnvSource = Readonly<Record<string, string | undefined>>;

/* Deliberately no development fallback. Every other secret in this codebase may
   degrade to a throwaway default, but a weak or shared key silently applied to
   sexual-violence reports is worse than an outage: the records would look
   encrypted while being trivially readable. Misconfiguration must stop the
   request. */
function decodeKey(envName: string, raw: string): Uint8Array {
  const key = Buffer.from(raw, "base64");
  if (key.length !== AES_256_KEY_BYTES) {
    throw new Error(
      `${envName} must be a base64-encoded ${AES_256_KEY_BYTES}-byte key.`,
    );
  }
  return key;
}

function parseVersion(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") return 1;
  const version = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new Error(`${CURRENT_VERSION_ENV} must be a positive integer.`);
  }
  return version;
}

/** The key new PPKS ciphertext is sealed with. Throws when unconfigured. */
export function getPpksSealingKey(env: EnvSource = process.env): PpksSealingKey {
  const raw = env[CURRENT_KEY_ENV];
  if (!raw) throw new Error(`${CURRENT_KEY_ENV} is not configured.`);
  return Object.freeze({
    key: decodeKey(CURRENT_KEY_ENV, raw),
    keyVersion: parseVersion(env[CURRENT_VERSION_ENV]),
  });
}

/**
 * Resolves any key version still able to open stored ciphertext. Retired keys
 * stay readable through `PPKS_ENCRYPTION_KEY_V<n>` so a rotation does not strand
 * reports sealed under the previous key.
 *
 * The resolver returns `undefined` for an unknown version rather than throwing,
 * because that is how `decryptProtectedData` signals a failed open without
 * distinguishing a missing key from a forged envelope.
 */
export function createPpksKeyResolver(
  env: EnvSource = process.env,
): EncryptionKeyResolver {
  const current = getPpksSealingKey(env);
  const keys = new Map<number, Uint8Array>([[current.keyVersion, current.key]]);

  for (const [name, raw] of Object.entries(env)) {
    if (!name.startsWith(RETIRED_KEY_PREFIX) || !raw) continue;
    const version = Number.parseInt(name.slice(RETIRED_KEY_PREFIX.length), 10);
    if (!Number.isSafeInteger(version) || version < 1) continue;
    if (keys.has(version)) continue;
    keys.set(version, decodeKey(name, raw));
  }

  return (keyVersion: number) => keys.get(keyVersion);
}

/** True when PPKS storage is usable, for surfacing configuration state in UI. */
export function isPpksEncryptionConfigured(env: EnvSource = process.env): boolean {
  try {
    getPpksSealingKey(env);
    return true;
  } catch {
    return false;
  }
}
