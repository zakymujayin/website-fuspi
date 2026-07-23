export type AdminMediaSafeLoadFailure = { ok: false; code: "UNAVAILABLE" };

/**
 * Route-level failure boundary (manifest data requirement 4): wraps client acquisition and
 * the service call together so a missing/invalid environment or a database outage — thrown
 * from either step — fails closed to the translated unavailable state instead of leaking an
 * exception, stack trace, or other technical detail into the rendered response.
 */
export async function loadAdminMediaSafely<T>(
  loader: () => Promise<T>,
): Promise<T | AdminMediaSafeLoadFailure> {
  try {
    return await loader();
  } catch {
    return { ok: false, code: "UNAVAILABLE" };
  }
}
