export function isProtectedRoute(pathname: string, segments: string[]) {
  const first = segments[0] ?? "";
  const second = segments[1] ?? "";

  if (first === "(auth)") return false;

  if (first === "(tabs)") {
    return second === "bookmarks" || second === "growth" || second === "me";
  }

  if (first === "growth") return true;
  if (first === "write") return true;
  if (first === "write-drafts") return true;
  if (first === "account-center") return true;
  if (first === "profile-customize") return true;

  return (
    pathname.startsWith("/growth") ||
    pathname.startsWith("/write") ||
    pathname.startsWith("/account-center") ||
    pathname.startsWith("/profile-customize")
  );
}

export function isPublicUgcRoute(pathname: string, segments: string[]) {
  const first = segments[0] ?? "";
  const second = segments[1] ?? "";

  if (first === "(auth)") return false;

  if (first === "(tabs)") {
    return second === "" || second === "index";
  }

  if (first === "search") return true;
  if (first === "feed") return true;
  if (first === "posts") return true;
  if (first === "users") return true;

  return (
    pathname === "/" ||
    pathname === "/search" ||
    pathname.startsWith("/feed/") ||
    pathname.startsWith("/posts/") ||
    pathname.startsWith("/users/")
  );
}
