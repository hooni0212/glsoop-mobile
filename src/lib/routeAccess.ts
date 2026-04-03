export function isProtectedRoute(pathname: string, segments: string[]) {
  const first = segments[0] ?? "";

  if (first === "(auth)") return false;

  if (first === "(tabs)") {
    return true;
  }

  if (first === "search") return true;
  if (first === "posts") return true;
  if (first === "users") return true;
  if (first === "growth") return true;
  if (first === "write") return true;
  if (first === "write-drafts") return true;
  if (first === "account-center") return true;
  if (first === "profile-customize") return true;

  return (
    pathname.startsWith("/search") ||
    pathname.startsWith("/posts/") ||
    pathname.startsWith("/users/") ||
    pathname.startsWith("/growth") ||
    pathname.startsWith("/write") ||
    pathname.startsWith("/account-center") ||
    pathname.startsWith("/profile-customize")
  );
}
