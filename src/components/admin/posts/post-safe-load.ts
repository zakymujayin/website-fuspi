export type AdminPostSafeLoadFailure = { ok: false; code: "UNAVAILABLE" };

/**
 * Route-level failure boundary: wraps client acquisition and the transport call together so a
 * missing/invalid environment or a database outage — thrown from either step — fails closed to the
 * translated unavailable state instead of leaking an exception or stack trace into the response.
 */
export async function loadAdminPostsSafely<T>(
  loader: () => Promise<T>,
): Promise<T | AdminPostSafeLoadFailure> {
  try {
    return await loader();
  } catch {
    return { ok: false, code: "UNAVAILABLE" };
  }
}
