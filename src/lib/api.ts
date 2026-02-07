import { Platform } from "react-native";

import { getAuthToken } from "@/lib/authToken";
import { ApiError } from "@/lib/errors";

type ApiOk<T> = { success: true; data: T };

const RAW_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;
const API_BASE = (RAW_BASE || "").replace(/\/+$/, "");
const API_DEBUG =
  typeof process !== "undefined" && process?.env?.EXPO_PUBLIC_API_DEBUG === "true";

// EXPO_PUBLIC_API_DEBUG=true (dev)로 API 로그 활성화
function apiLog(...args: unknown[]) {
  if (!__DEV__ || !API_DEBUG) return;
  console.log(...args);
}

if (__DEV__ && (RAW_BASE === undefined || RAW_BASE === null)) {
  console.warn("[api] EXPO_PUBLIC_API_BASE_URL is not set. Using same-origin paths.");
}

let didLogJoin = false;

if (__DEV__ && API_DEBUG) {
  console.log("[api] base url =", API_BASE || "(same-origin)");
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
    console.debug("[api] join", { base: API_BASE || "(same-origin)", path: normalizedPath, url });
    didLogJoin = true;
  }

  return url;
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

    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    // JSON 바디가 있을 때만 Content-Type
    const hasBody = options.body !== undefined;
    if (hasBody) headers["Content-Type"] = "application/json";

    // ✅ Bearer 토큰 인증(권장)
    if (token) headers["Authorization"] = `Bearer ${token}`;

    apiLog(
      `[api] ${options.method}`,
      url,
      `token=${token ? token.slice(0, 12) + "…" : "null"}`
    );

    const res = await fetch(url, {
      method: options.method,
      headers,
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      // ✅ 쿠키 인증이 필요할 때만 include
      ...(options.credentials && Platform.OS === "web" ? { credentials: "include" } : null),
    } as any);

    // ✅ res.json() 대신 text→parse (HTML/빈바디/에러페이지 대비)
    const text = await res.text();
    const parsed = safeJsonParse(text);

    if (!parsed) {
      throw new ApiError(`Non-JSON response (HTTP ${res.status}): ${text.slice(0, 160)}`, {
        status: res.status,
      });
    }

    apiLog(`[api] ${options.method}`, url, "status=", res.status, "json=", parsed);

    // ✅ HTTP 에러 처리
    if (!res.ok) {
      // 서버가 { success:false, error:{message} }를 지키는 경우
      if (parsed?.success === false) {
        throw new ApiError(
          parsed?.error?.message || parsed?.error?.code || `HTTP ${res.status}`,
          {
            status: res.status,
            code: parsed?.error?.code,
          }
        );
      }
      // 서버가 { ok:false, message } 같은 경우
      throw new ApiError(parsed?.message || parsed?.error?.message || `HTTP ${res.status}`, {
        status: res.status,
      });
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
