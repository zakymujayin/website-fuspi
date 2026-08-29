/**
 * The HMAC secret that tracking-token digests are derived from.
 *
 * Ticket code previously read `TRACKING_HMAC_SECRET`, a name that appears in no
 * `.env` and in no `.env.example`, and fell back to a literal committed in the
 * source. Every complaint and PPKS tracking token was therefore keyed with a
 * value published in the repository, in production as much as in development,
 * while the booking path had already got this right by reading
 * `TOKEN_HMAC_SECRET` and refusing to run without it.
 *
 * This is the single definition both now use. It throws rather than degrading:
 * a tracking token is the only handle an anonymous reporter has on their own
 * report, and keying it with a public constant is not a lesser form of working.
 */
export function getTicketTrackingSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.TOKEN_HMAC_SECRET;
  if (!secret) throw new Error("TOKEN_HMAC_SECRET is not configured.");
  return secret;
}
