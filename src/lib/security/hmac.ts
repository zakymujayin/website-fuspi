import {createHmac, timingSafeEqual} from "node:crypto";

const MINIMUM_HMAC_SECRET_LENGTH = 32;
const HMAC_DOMAIN_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;

function assertHmacSecret(secret: string): void {
  if (Buffer.byteLength(secret, "utf8") < MINIMUM_HMAC_SECRET_LENGTH) {
    throw new Error("HMAC secret does not meet the minimum length.");
  }
}

export function createHmacDigest(value: string, secret: string): string {
  assertHmacSecret(secret);
  return createHmac("sha256", secret).update(value, "utf8").digest("hex");
}

export function createDomainSeparatedHmacDigest(
  value: string,
  secret: string,
  domain: string,
): string {
  if (!HMAC_DOMAIN_PATTERN.test(domain)) {
    throw new Error("HMAC domain is invalid.");
  }

  return createHmacDigest(`fuspi:hmac:v1:${domain}\0${value}`, secret);
}

export function verifyHmacDigest(candidate: string, expectedDigest: string): boolean {
  const expectedIsValid = /^[a-f0-9]{64}$/.test(expectedDigest);
  const expected = expectedIsValid
    ? Buffer.from(expectedDigest, "hex")
    : Buffer.alloc(32);
  const actualIsValid = /^[a-f0-9]{64}$/.test(candidate);
  const actual = actualIsValid
    ? Buffer.from(candidate, "hex")
    : Buffer.alloc(32, 1);

  return expectedIsValid && actualIsValid && timingSafeEqual(actual, expected);
}
