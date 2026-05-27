function normalizeKnownDeepLink(url: URL) {
  const protocol = url.protocol.replace(/:$/, "");
  if (protocol !== "glsoop" && protocol !== "glsoopmobile") return null;

  const host = decodeURIComponent(url.hostname || "").trim();
  const pathSegments = url.pathname
    .split("/")
    .map((segment) => decodeURIComponent(segment).trim())
    .filter(Boolean);
  const segments = host ? [host, ...pathSegments] : pathSegments;

  if (segments[0] === "users" && segments[1]) {
    return `/users/${encodeURIComponent(segments[1])}`;
  }

  if (segments[0] === "posts" && segments[1]) {
    return `/posts/${encodeURIComponent(segments[1])}`;
  }

  return null;
}

export function redirectSystemPath({ path }: { path: string | null; initial: boolean }) {
  if (!path) return path;
  if (path.startsWith("/")) return path;

  try {
    const normalized = normalizeKnownDeepLink(new URL(path));
    return normalized ?? path;
  } catch {
    return path;
  }
}
