function readCandidate(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

type TokenLikeResponse = {
  token?: unknown;
  access_token?: unknown;
  accessToken?: unknown;
  auth_token?: unknown;
  authToken?: unknown;
  session_token?: unknown;
  sessionToken?: unknown;
};

export function extractAuthToken(response: TokenLikeResponse | null | undefined) {
  if (!response || typeof response !== "object") return null;

  return (
    readCandidate(response.token) ??
    readCandidate(response.access_token) ??
    readCandidate(response.accessToken) ??
    readCandidate(response.auth_token) ??
    readCandidate(response.authToken) ??
    readCandidate(response.session_token) ??
    readCandidate(response.sessionToken) ??
    null
  );
}
