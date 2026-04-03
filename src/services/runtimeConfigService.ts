import { apiGet } from "@/lib/api";

type RuntimeConfigResponse = {
  ok?: boolean;
  legal?: {
    versions?: {
      terms?: string;
      privacy?: string;
      marketing?: string;
      guidelines?: string;
    };
    effective_dates?: {
      terms?: string;
      privacy?: string;
      guidelines?: string;
    };
    contacts?: {
      department?: string;
      email?: string;
      phone?: string;
      dpo_name?: string;
    };
    urls?: {
      terms?: string;
      privacy?: string;
      guidelines?: string;
    };
  };
  safety?: {
    report_enabled?: boolean;
    block_enabled?: boolean;
    moderation_sla_hours?: number;
    report_detail_max_length?: number;
    report_detail_required_reason_codes?: string[];
    report_reasons?: {
      code?: string;
      label?: string;
      target_types?: string[];
    }[];
  };
};

function toText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toBoolean(value: unknown) {
  return value === true;
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export type RuntimeLegalConfig = {
  versions: {
    terms: string | null;
    privacy: string | null;
    marketing: string | null;
    guidelines: string | null;
  };
  effectiveDates: {
    terms: string | null;
    privacy: string | null;
    guidelines: string | null;
  };
  contacts: {
    department: string | null;
    email: string | null;
    phone: string | null;
    dpoName: string | null;
  };
  urls: {
    terms: string | null;
    privacy: string | null;
    guidelines: string | null;
  };
  safety: {
    reportEnabled: boolean;
    blockEnabled: boolean;
    moderationSlaHours: number | null;
    detailMaxLength: number | null;
    detailRequiredReasonCodes: string[];
    reportReasons: {
      code: string;
      label: string;
      targetTypes: string[];
    }[];
  };
};

export function normalizeRuntimeLegalConfig(
  response: RuntimeConfigResponse | null | undefined
): RuntimeLegalConfig {
  const legal = response?.legal;
  const versions = legal?.versions;
  const effectiveDates = legal?.effective_dates;
  const contacts = legal?.contacts;
  const urls = legal?.urls;
  const safety = response?.safety;
  const reportReasons = Array.isArray(safety?.report_reasons) ? safety.report_reasons : [];

  return {
    versions: {
      terms: toText(versions?.terms),
      privacy: toText(versions?.privacy),
      marketing: toText(versions?.marketing),
      guidelines: toText(versions?.guidelines),
    },
    effectiveDates: {
      terms: toText(effectiveDates?.terms),
      privacy: toText(effectiveDates?.privacy),
      guidelines: toText(effectiveDates?.guidelines),
    },
    contacts: {
      department: toText(contacts?.department),
      email: toText(contacts?.email),
      phone: toText(contacts?.phone),
      dpoName: toText(contacts?.dpo_name),
    },
    urls: {
      terms: toText(urls?.terms),
      privacy: toText(urls?.privacy),
      guidelines: toText(urls?.guidelines),
    },
    safety: {
      reportEnabled: toBoolean(safety?.report_enabled),
      blockEnabled: toBoolean(safety?.block_enabled),
      moderationSlaHours: toNumber(safety?.moderation_sla_hours),
      detailMaxLength: toNumber(safety?.report_detail_max_length),
      detailRequiredReasonCodes: Array.isArray(safety?.report_detail_required_reason_codes)
        ? safety.report_detail_required_reason_codes.filter(
            (value): value is string => typeof value === "string" && value.trim().length > 0
          )
        : [],
      reportReasons: reportReasons
        .map((item) => ({
          code: toText(item?.code) ?? "",
          label: toText(item?.label) ?? "",
          targetTypes: Array.isArray(item?.target_types)
            ? item.target_types.filter((value): value is string => typeof value === "string")
            : [],
        }))
        .filter((item) => item.code.length > 0 && item.label.length > 0),
    },
  };
}

export async function fetchRuntimeLegalConfig(): Promise<RuntimeLegalConfig> {
  const response = await apiGet<RuntimeConfigResponse>("/api/runtime-config");
  return normalizeRuntimeLegalConfig(response);
}

export function resolveRuntimeLegalDocumentUrl(
  config: RuntimeLegalConfig | null | undefined,
  key: "terms" | "privacy" | "guidelines",
  fallbackUrl: string
) {
  const runtimeUrl = config?.urls?.[key];
  return runtimeUrl ?? fallbackUrl;
}
