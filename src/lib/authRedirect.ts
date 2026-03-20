export type AuthRoutePath =
  | "/(auth)"
  | "/(auth)/login"
  | "/(auth)/signup"
  | "/(auth)/forgot-password"
  | "/(auth)/reset-password";

function normalizeRedirectPath(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("/(auth)")) return null;
  return trimmed;
}

export function resolvePostAuthRedirect(input: unknown, fallback = "/(tabs)") {
  return normalizeRedirectPath(input) ?? fallback;
}

export function buildAuthRoute(pathname: AuthRoutePath, redirect?: unknown) {
  const normalized = normalizeRedirectPath(redirect);
  if (!normalized) return pathname;
  return {
    pathname,
    params: { redirect: normalized },
  } as const;
}
