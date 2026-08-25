/**
 * Safely reads a trimmed string field from `FormData`. Locale-tab fields are
 * only mounted for the active tab (see the locale-tab editor forms), so
 * `FormData.get()` returns `null` for any tab the admin never visited —
 * casting that straight to `string` and calling `.trim()` throws.
 */
export function formText(fd: FormData, key: string): string {
  const value = fd.get(key);
  return typeof value === "string" ? value.trim() : "";
}
