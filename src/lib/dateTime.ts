const SQLITE_UTC_DATETIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?)?$/;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export type ServerDateInput = string | number | Date | null | undefined;

export function parseServerDateTime(value: ServerDateInput): Date | null {
  if (value == null || value === "") return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }

  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const raw = typeof value === "string" ? value.trim() : String(value).trim();
  if (!raw) return null;

  const sqliteMatch = raw.match(SQLITE_UTC_DATETIME_RE);
  if (sqliteMatch) {
    const [
      ,
      year,
      month,
      day,
      hour = "00",
      minute = "00",
      second = "00",
      fraction = "",
    ] = sqliteMatch;
    const millisecond = fraction
      ? Number(String(fraction).slice(0, 3).padEnd(3, "0"))
      : 0;
    return new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
        millisecond
      )
    );
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getKstShiftedDate(value: ServerDateInput): Date | null {
  const parsed = parseServerDateTime(value);
  if (!parsed) return null;
  return new Date(parsed.getTime() + KST_OFFSET_MS);
}

type KstDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function getKstDateParts(value: ServerDateInput): KstDateParts | null {
  const shifted = getKstShiftedDate(value);
  if (!shifted) return null;

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function formatKstDateDot(value: ServerDateInput) {
  const parts = getKstDateParts(value);
  if (!parts) return "";
  return `${parts.year}.${pad2(parts.month)}.${pad2(parts.day)}`;
}

export function formatKstDateKorean(value: ServerDateInput) {
  const parts = getKstDateParts(value);
  if (!parts) return "";
  return `${parts.year}년 ${parts.month}월 ${parts.day}일`;
}

export function formatKstDateTime(value: ServerDateInput) {
  const parts = getKstDateParts(value);
  if (!parts) return "";
  return `${parts.year}.${pad2(parts.month)}.${pad2(parts.day)} ${pad2(parts.hour)}:${pad2(
    parts.minute
  )}`;
}

export function formatRelativeKorean(value: ServerDateInput, nowMs = Date.now()) {
  const parsed = parseServerDateTime(value);
  if (!parsed) return typeof value === "string" ? value : "";

  const diffMs = nowMs - parsed.getTime();
  const safeDiffMs = Number.isFinite(diffMs) ? diffMs : 0;
  const diffMin = Math.max(0, Math.floor(safeDiffMs / 60000));

  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}일 전`;

  return formatKstDateDot(parsed);
}

export function toTimestampMs(value: ServerDateInput) {
  const parsed = parseServerDateTime(value);
  return parsed ? parsed.getTime() : Number.NaN;
}
