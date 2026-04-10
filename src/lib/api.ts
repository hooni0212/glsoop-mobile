import Constants from "expo-constants";
import { Platform } from "react-native";

import { COOKIE_SESSION_TOKEN, getAuthToken } from "@/lib/authToken";
import { ApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";

type ApiOk<T> = { success: true; data: T };

const RAW_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;
const API_DEBUG =
  typeof process !== "undefined" && process?.env?.EXPO_PUBLIC_API_DEBUG === "true";
const LOCAL_API_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
const DEFAULT_NATIVE_RELEASE_API_BASE = "https://glsoop.com";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function extractExpoHost() {
  const hostCandidates = [
    (Constants as any)?.expoConfig?.hostUri,
    (Constants as any)?.expoGoConfig?.debuggerHost,
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri,
    (Constants as any)?.manifest?.debuggerHost,
  ];

  for (const candidate of hostCandidates) {
    if (typeof candidate !== "string") continue;
    const match = candidate.match(/^([^/:]+)(?::\d+)?/);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function resolveApiBase(rawBase?: string) {
  const trimmed = trimTrailingSlash((rawBase || "").trim());
  const isNativeApp = Platform.OS === "ios" || Platform.OS === "android";
  const isWeb = Platform.OS === "web";

  if (__DEV__ && isWeb && trimmed) {
    try {
      const parsed = new URL(trimmed);
      const runtimeHost =
        typeof window !== "undefined" && typeof window.location?.hostname === "string"
          ? window.location.hostname
          : "";

      if (runtimeHost && LOCAL_API_HOSTS.has(parsed.hostname)) {
        parsed.hostname = runtimeHost;
        return trimTrailingSlash(parsed.toString());
      }
    } catch {
      // no-op
    }
  }

  if (!__DEV__ && isNativeApp) {
    if (!trimmed) {
      return DEFAULT_NATIVE_RELEASE_API_BASE;
    }

    if (trimmed.startsWith("/")) {
      return `${DEFAULT_NATIVE_RELEASE_API_BASE}${trimmed}`;
    }

    return trimmed;
  }

  if (!isNativeApp) {
    return trimmed;
  }

  const expoHost = extractExpoHost();
  if (!expoHost) {
    return trimmed;
  }

  if (!trimmed) {
    return `http://${expoHost}:3000`;
  }

  if (trimmed.startsWith("/")) {
    return `http://${expoHost}:3000${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (!LOCAL_API_HOSTS.has(parsed.hostname)) {
      return trimTrailingSlash(parsed.toString());
    }

    const nextPort = parsed.port || "3000";
    parsed.hostname = expoHost;
    parsed.port = nextPort;
    return trimTrailingSlash(parsed.toString());
  } catch {
    return trimmed;
  }
}

const API_BASE = resolveApiBase(RAW_BASE);

// EXPO_PUBLIC_API_DEBUG=true (dev)로 API 로그 활성화
function apiLog(...args: unknown[]) {
  if (!__DEV__ || !API_DEBUG) return;
  if (args.length === 0) return;
  if (typeof args[0] === "string") {
    logger.debug(args[0], args.length > 1 ? { args: args.slice(1) } : undefined);
    return;
  }
  logger.debug("[api]", { args });
}

if (__DEV__ && (RAW_BASE === undefined || RAW_BASE === null || RAW_BASE.trim() === "")) {
  logger.warn("[api] EXPO_PUBLIC_API_BASE_URL is not set. Using inferred dev host or same-origin paths.");
}

let didLogJoin = false;

if (__DEV__ && API_DEBUG) {
  logger.debug("[api] base url resolved", {
    rawBase: RAW_BASE || "(unset)",
    base: API_BASE || "(same-origin)",
    expoHost: extractExpoHost() || "(unavailable)",
  });
}

// 간단 타임아웃 유틸
function withTimeout(ms: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { controller, clear: () => clearTimeout(id) };
}

function safeJsonParse(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function joinUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!API_BASE) return normalizedPath;

  // ✅ C안: "/api" 중복 제거
  // base가 "/api"(또는 ".../api")로 끝나는데 path도 "/api/..."로 들어오면 하나 제거
  // 예) base="/api", path="/api/login" => "/api/login"
  // 예) base="https://m.glsoop.com/api", path="/api/login" => "https://m.glsoop.com/api/login"
  if (API_BASE.endsWith("/api") && normalizedPath.startsWith("/api/")) {
    return `${API_BASE}${normalizedPath.slice(4)}`;
  }

  const url = `${API_BASE}${normalizedPath}`;

  // dev에서 1회만 조합 결과 출력(옵션)
  if (__DEV__ && API_DEBUG && !didLogJoin) {
    logger.debug("[api] join", { base: API_BASE || "(same-origin)", path: normalizedPath, url });
    didLogJoin = true;
  }

  return url;
}

export function buildApiUrl(path: string) {
  return joinUrl(path);
}

type RequestOptions = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  timeoutMs?: number;
  // 쿠키 인증을 써야 할 때만 true
  credentials?: boolean;
};

async function apiRequest<T>(path: string, options: RequestOptions): Promise<T> {
  const url = joinUrl(path);
  const { controller, clear } = withTimeout(options.timeoutMs ?? 12000);

  try {
    const token = await getAuthToken();
    const bearerToken = token && token !== COOKIE_SESSION_TOKEN ? token : null;

    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    // JSON 바디가 있을 때만 Content-Type
    const hasBody = options.body !== undefined;
    if (hasBody) headers["Content-Type"] = "application/json";

    // ✅ Bearer 토큰 인증(권장)
    if (bearerToken) headers["Authorization"] = `Bearer ${bearerToken}`;

    apiLog("[api] request", {
      method: options.method,
      url,
      hasToken: Boolean(bearerToken),
    });

    const res = await fetch(url, {
      method: options.method,
      headers,
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      ...(Platform.OS === "web" ? { credentials: "include" } : null),
    } as any);

    // ✅ res.json() 대신 text→parse (HTML/빈바디/에러페이지 대비)
    const text = await res.text();
    const parsed = safeJsonParse(text);

    if (!parsed) {
      throw new ApiError(`Non-JSON response (HTTP ${res.status}): ${text.slice(0, 160)}`, {
        status: res.status,
      });
    }

    apiLog("[api] response", {
      method: options.method,
      url,
      status: res.status,
    });

    // ✅ HTTP 에러 처리
    if (!res.ok) {
      // 서버가 { success:false, error:{message} }를 지키는 경우
      if (parsed?.success === false) {
        throw new ApiError(
          parsed?.error?.message || parsed?.error?.code || `HTTP ${res.status}`,
          {
            status: res.status,
            code: parsed?.error?.code,
            payload: parsed,
          }
        );
      }
      // 서버가 { ok:false, message } 같은 경우
      throw new ApiError(
        parsed?.message || parsed?.error?.message || `HTTP ${res.status}`,
        {
          status: res.status,
          code: parsed?.code || parsed?.error?.code,
          payload: parsed,
        }
      );
    }

    // ✅ (A) 공통 포맷: { success:true, data:T }
    if (parsed?.success === false) {
      throw new ApiError(parsed?.error?.message || parsed?.error?.code, {
        code: parsed?.error?.code,
      });
    }
    if (parsed?.success === true && "data" in parsed) {
      return (parsed as ApiOk<T>).data;
    }

    // ✅ (B) 글숲 서버 포맷: { ok:true, ... } 등 -> json 자체 반환
    return parsed as T;
  } catch (e: any) {
    if (e?.name === "AbortError") throw new ApiError("Request timeout", { code: "timeout" });
    throw e;
  } finally {
    clear();
  }
}

export function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: "GET" });
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, { method: "POST", body });
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, { method: "PUT", body });
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, { method: "PATCH", body });
}

export function apiDelete<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: "DELETE" });
}
