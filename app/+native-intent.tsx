function normalizeKnownSegments(segments: string[]) {
  const [resource, id] = segments;
  if ((resource === "users" || resource === "user" || resource === "authors") && id) {
    return `/users/${encodeURIComponent(id)}`;
  }

  if ((resource === "posts" || resource === "post") && id) {
    return `/posts/${encodeURIComponent(id)}`;
  }

  return null;
}

function safeDecodeSegment(segment: string) {
  try {
    return decodeURIComponent(segment).trim();
  } catch {
    return segment.trim();
  }
}

function normalizeKnownPath(path: string) {
  const trimmed = path.trim();
  if (!trimmed) return null;

  const [pathname] = trimmed.replace(/^\/+/, "").split(/[?#]/);
  const segments = pathname
    .split("/")
    .map(safeDecodeSegment)
    .filter(Boolean);

  return normalizeKnownSegments(segments);
}

function normalizeKnownWebUrl(url: URL) {
  const pathname = url.pathname.replace(/\/+$/, "");
  if (pathname === "/html/post.html") {
    const postId = url.searchParams.get("postId") || url.searchParams.get("id");
    return postId ? `/posts/${encodeURIComponent(postId)}` : null;
  }

  if (pathname === "/html/author.html" || pathname === "/html/user.html") {
    const userId = url.searchParams.get("userId") || url.searchParams.get("id");
    return userId ? `/users/${encodeURIComponent(userId)}` : null;
  }

  return null;
}

function normalizeKnownDeepLink(url: URL) {
  const protocol = url.protocol.replace(/:$/, "");
  if (protocol === "http" || protocol === "https") {
    return normalizeKnownWebUrl(url);
  }
  if (protocol !== "glsoop" && protocol !== "glsoopmobile") return null;

  const host = safeDecodeSegment(url.hostname || "");
  const pathSegments = url.pathname
    .split("/")
    .map(safeDecodeSegment)
    .filter(Boolean);
  const segments = host ? [host, ...pathSegments] : pathSegments;

  return normalizeKnownSegments(segments);
}

export function redirectSystemPath({ path }: { path: string | null; initial: boolean }) {
  if (!path) return path;

  const normalizedPath = normalizeKnownPath(path);
  if (normalizedPath) return normalizedPath;
  if (path.startsWith("/")) return path;

  try {
    const normalized = normalizeKnownDeepLink(new URL(path));
    return normalized ?? path;
  } catch {
    return path;
  }
}
