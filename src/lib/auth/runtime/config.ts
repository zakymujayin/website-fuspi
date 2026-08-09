export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
export const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1_000;
export const LOGIN_RATE_LIMIT_BLOCK_MS = 30 * 60 * 1_000;
export const LOGIN_RATE_LIMIT_MAX_FAILURES = 5;
export const LOGIN_RATE_LIMIT_SCOPE = "AUTH_LOGIN";

export const DUMMY_BCRYPT_HASH =
  "$2b$12$HDzbiux4wbMx278uAd75e.A90Op7b83yezA6jpanSmQLvIToyd9wu";

export function getAuthSecrets() {
  const emailHmacSecret = process.env.TOKEN_HMAC_SECRET;
  const ipHmacSecret = process.env.IP_HASH_SECRET;
  if (!emailHmacSecret || !ipHmacSecret) {
    throw new Error("Authentication HMAC secrets are not configured.");
  }
  return {emailHmacSecret, ipHmacSecret};
}
