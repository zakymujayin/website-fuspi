export function isSameOriginRequest(
  headers: Headers,
  configuredUrl = process.env.AUTH_URL,
): boolean {
  const origin = headers.get("origin");
  if (!origin || !configuredUrl) return false;
  try {
    return new URL(origin).origin === new URL(configuredUrl).origin;
  } catch {
    return false;
  }
}
