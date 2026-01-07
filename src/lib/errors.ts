export type AppErrorKind =
  | "network"
  | "timeout"
  | "auth"
  | "not_found"
  | "server"
  | "unknown";

export type AppErrorModel = {
  kind: AppErrorKind;
  title: string;
  description?: string;
  canRetry: boolean;
  status?: number;
};

type ApiErrorOptions = {
  status?: number;
  code?: string;
};

export class ApiError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
  }
}

function normalizeFromStatus(status?: number): AppErrorModel | null {
  if (!status) return null;

  if (status === 401 || status === 403) {
    return {
      kind: "auth",
      title: "로그인이 필요해요",
      description: "다시 로그인한 뒤 시도해주세요.",
      canRetry: false,
      status,
    };
  }

  if (status === 404) {
    return {
      kind: "not_found",
      title: "요청한 데이터를 찾을 수 없어요",
      description: "삭제되었거나 주소가 잘못됐을 수 있어요.",
      canRetry: false,
      status,
    };
  }

  if (status >= 500) {
    return {
      kind: "server",
      title: "서버에 문제가 있어요",
      description: "잠시 후 다시 시도해주세요.",
      canRetry: true,
      status,
    };
  }

  return {
    kind: "unknown",
    title: "요청을 처리할 수 없어요",
    description: "잠시 후 다시 시도해주세요.",
    canRetry: false,
    status,
  };
}

const NETWORK_ERROR_MESSAGES = [
  "Failed to fetch",
  "Network request failed",
  "The Internet connection appears to be offline",
  "Load failed",
  "fetch failed",
];

function isAbortError(error: unknown) {
  if (error instanceof ApiError && error.code === "timeout") return true;
  if (error instanceof Error && error.name === "AbortError") return true;
  return false;
}

function matchesNetworkMessage(message: string) {
  return NETWORK_ERROR_MESSAGES.some((snippet) =>
    message.toLowerCase().includes(snippet.toLowerCase())
  );
}

function isNetworkError(error: unknown) {
  if (error instanceof Error && matchesNetworkMessage(error.message)) return true;
  return false;
}

function isTimeoutError(error: unknown) {
  if (isAbortError(error)) return true;
  if (error instanceof Error && /timeout/i.test(error.message)) return true;
  return false;
}

export function normalizeApiError(error: unknown): AppErrorModel {
  if (isTimeoutError(error)) {
    return {
      kind: "timeout",
      title: "요청 시간이 초과되었어요",
      description: "잠시 후 다시 시도해주세요.",
      canRetry: true,
    };
  }

  if (isNetworkError(error)) {
    return {
      kind: "network",
      title: "네트워크 연결이 불안정해요",
      description: "인터넷 연결을 확인하고 다시 시도해주세요.",
      canRetry: true,
    };
  }

  if (error instanceof ApiError) {
    const normalized = normalizeFromStatus(error.status);
    if (normalized) return normalized;
  }

  if (error instanceof Error) {
    return {
      kind: "unknown",
      title: "문제가 발생했어요",
      description: error.message || "잠시 후 다시 시도해주세요.",
      canRetry: true,
    };
  }

  return {
    kind: "unknown",
    title: "알 수 없는 오류가 발생했어요",
    description: "잠시 후 다시 시도해주세요.",
    canRetry: true,
  };
}

// Example classification (manual check)
// normalizeApiError(new TypeError("Cannot read properties of undefined")).kind === "unknown"
// normalizeApiError(new TypeError("Failed to fetch")).kind === "network"
// normalizeApiError({ name: "AbortError", message: "The user aborted a request." }).kind === "timeout"
