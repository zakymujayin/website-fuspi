import {randomBytes} from "node:crypto";

import {
  HmacSha256DigestSchema,
  TrackingTokenPurposeSchema,
  TrackingTokenSchema,
  type TrackingTokenPurpose,
} from "@/contracts/security";
import {
  createDomainSeparatedHmacDigest,
  verifyHmacDigest,
} from "@/lib/security/hmac";

const TRACKING_TOKEN_BYTES = 32;
const INVALID_TOKEN_PLACEHOLDER = "A".repeat(43);

function tokenDomain(purpose: TrackingTokenPurpose): string {
  return `TRACKING_${TrackingTokenPurposeSchema.parse(purpose)}`;
}

export function generateTrackingToken(): string {
  return randomBytes(TRACKING_TOKEN_BYTES).toString("base64url");
}

export function createTrackingTokenDigest(
  token: string,
  secret: string,
  purpose: TrackingTokenPurpose,
): string {
  const parsedToken = TrackingTokenSchema.parse(token);
  return createDomainSeparatedHmacDigest(parsedToken, secret, tokenDomain(purpose));
}

export function verifyTrackingTokenDigest(
  token: string,
  expectedDigest: string,
  secret: string,
  purpose: TrackingTokenPurpose,
): boolean {
  const parsedToken = TrackingTokenSchema.safeParse(token);
  const parsedDigest = HmacSha256DigestSchema.safeParse(expectedDigest);
  const candidate = createDomainSeparatedHmacDigest(
    parsedToken.success ? parsedToken.data : INVALID_TOKEN_PLACEHOLDER,
    secret,
    tokenDomain(purpose),
  );

  return parsedToken.success
    && parsedDigest.success
    && verifyHmacDigest(candidate, parsedDigest.data);
}
