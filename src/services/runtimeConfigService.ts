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
  };
};

function toText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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
};

export function normalizeRuntimeLegalConfig(
  response: RuntimeConfigResponse | null | undefined
): RuntimeLegalConfig {
  const legal = response?.legal;
  const versions = legal?.versions;
  const effectiveDates = legal?.effective_dates;
  const contacts = legal?.contacts;

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
  };
}

export async function fetchRuntimeLegalConfig(): Promise<RuntimeLegalConfig> {
  const response = await apiGet<RuntimeConfigResponse>("/api/runtime-config");
  return normalizeRuntimeLegalConfig(response);
}
