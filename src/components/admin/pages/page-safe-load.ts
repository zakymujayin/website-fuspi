export type AdminPageSafeLoadFailure = { ok: false; code: "UNAVAILABLE" };

export async function loadAdminPagesSafely<T>(
  loader: () => Promise<T>,
): Promise<T | AdminPageSafeLoadFailure> {
  try {
    return await loader();
  } catch {
    return { ok: false, code: "UNAVAILABLE" };
  }
}
