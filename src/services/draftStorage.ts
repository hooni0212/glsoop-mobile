import AsyncStorage from "@react-native-async-storage/async-storage";

export type WriteDraft = {
  id: string;
  title: string;
  body: string;
  updatedAt: number; // epoch ms
};

const DRAFTS_KEY = "glsoop:write:drafts:v1";

// NOTE: Keep drafts reasonably small. This app stores plain text only (no images).
const MAX_DRAFTS = 30;

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeDraft(input: any): WriteDraft | null {
  if (!input || typeof input !== "object") return null;

  const id = typeof input.id === "string" ? input.id : "";
  if (!id) return null;

  const title = typeof input.title === "string" ? input.title : "";
  const body = typeof input.body === "string" ? input.body : "";
  const updatedAt =
    typeof input.updatedAt === "number" ? input.updatedAt : Date.now();

  return { id, title, body, updatedAt };
}

function uuidLike(): string {
  // No crypto dependency; good enough for local keys.
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

async function loadAll(): Promise<WriteDraft[]> {
  const raw = await AsyncStorage.getItem(DRAFTS_KEY);
  const parsed = safeJsonParse<any>(raw);
  if (!Array.isArray(parsed)) return [];

  const drafts = parsed
    .map(normalizeDraft)
    .filter(Boolean) as WriteDraft[];

  // newest first
  drafts.sort((a, b) => b.updatedAt - a.updatedAt);
  return drafts;
}

async function saveAll(drafts: WriteDraft[]): Promise<void> {
  try {
    // enforce newest-first & max
    const sorted = [...drafts].sort((a, b) => b.updatedAt - a.updatedAt);
    await AsyncStorage.setItem(
      DRAFTS_KEY,
      JSON.stringify(sorted.slice(0, MAX_DRAFTS))
    );
  } catch {
    // ignore
  }
}

export async function listWriteDrafts(): Promise<WriteDraft[]> {
  try {
    return await loadAll();
  } catch {
    return [];
  }
}

export async function loadWriteDraftById(id: string): Promise<WriteDraft | null> {
  if (!id) return null;
  try {
    const drafts = await loadAll();
    return drafts.find((d) => d.id === id) ?? null;
  } catch {
    return null;
  }
}

export async function loadLatestWriteDraft(): Promise<WriteDraft | null> {
  try {
    const drafts = await loadAll();
    return drafts[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Upsert a draft. If id is omitted, creates a new draft and returns its id.
 */
export async function upsertWriteDraft(input: {
  id?: string | null;
  title: string;
  body: string;
}): Promise<string> {
  const id = input.id ?? uuidLike();
  const payload: WriteDraft = {
    id,
    title: input.title ?? "",
    body: input.body ?? "",
    updatedAt: Date.now(),
  };

  try {
    const drafts = await loadAll();
    const next = [payload, ...drafts.filter((d) => d.id !== id)];
    await saveAll(next);
  } catch {
    // ignore
  }

  return id;
}

export async function deleteWriteDraft(id: string): Promise<void> {
  if (!id) return;
  try {
    const drafts = await loadAll();
    await saveAll(drafts.filter((d) => d.id !== id));
  } catch {
    // ignore
  }
}

export async function clearAllWriteDrafts(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DRAFTS_KEY);
  } catch {
    // ignore
  }
}
