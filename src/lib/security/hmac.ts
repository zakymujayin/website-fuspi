import {createHmac} from "node:crypto";

const MINIMUM_HMAC_SECRET_LENGTH = 32;

export function createHmacDigest(value: string, secret: string): string {
  if (secret.length < MINIMUM_HMAC_SECRET_LENGTH) {
    throw new Error("HMAC secret does not meet the minimum length.");
  }
  return createHmac("sha256", secret).update(value, "utf8").digest("hex");
}
