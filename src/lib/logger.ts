type LogLevel = "debug" | "info" | "warn" | "error";

const DEV_ONLY_LEVELS: ReadonlySet<LogLevel> = new Set(["debug", "info"]);
const MAX_DEPTH = 3;
const MAX_STRING_LENGTH = 180;
const REDACTED_TEXT = "[REDACTED]";
const SENSITIVE_KEY_PATTERN =
  /(token|authorization|password|passwd|secret|cookie|session|content|body|payload|pw)/i;

function canLog(level: LogLevel) {
  if (DEV_ONLY_LEVELS.has(level)) return __DEV__;
  return true;
}

function sanitizeString(value: string, key?: string): string {
  if (key && SENSITIVE_KEY_PATTERN.test(key)) return REDACTED_TEXT;
  if (value.length <= MAX_STRING_LENGTH) return value;
  return `${value.slice(0, MAX_STRING_LENGTH)}...`;
}

function sanitizeUnknown(value: unknown, depth = 0, key?: string): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return sanitizeString(value, key);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "function") return "[Function]";

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeString(value.message, key),
      ...(typeof value.stack === "string" && __DEV__
        ? { stack: sanitizeString(value.stack, "stack") }
        : {}),
    };
  }

  if (depth >= MAX_DEPTH) return "[DepthLimit]";

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeUnknown(item, depth + 1, key));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(record)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) {
        next[k] = REDACTED_TEXT;
        continue;
      }
      next[k] = sanitizeUnknown(v, depth + 1, k);
    }
    return next;
  }

  return String(value);
}

function emit(level: LogLevel, message: string, meta?: unknown) {
  if (!canLog(level)) return;

  const prefix = `[${level.toUpperCase()}]`;
  const sanitizedMeta = meta === undefined ? undefined : sanitizeUnknown(meta);

  if (level === "error") {
    if (sanitizedMeta === undefined) {
      console.error(prefix, message);
      return;
    }
    console.error(prefix, message, sanitizedMeta);
    return;
  }

  if (level === "warn") {
    if (sanitizedMeta === undefined) {
      console.warn(prefix, message);
      return;
    }
    console.warn(prefix, message, sanitizedMeta);
    return;
  }

  if (sanitizedMeta === undefined) {
    console.log(prefix, message);
    return;
  }
  console.log(prefix, message, sanitizedMeta);
}

export const logger = {
  debug(message: string, meta?: unknown) {
    emit("debug", message, meta);
  },
  info(message: string, meta?: unknown) {
    emit("info", message, meta);
  },
  warn(message: string, meta?: unknown) {
    emit("warn", message, meta);
  },
  error(message: string, meta?: unknown) {
    emit("error", message, meta);
  },
};

