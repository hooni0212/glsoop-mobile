import AsyncStorage from "@react-native-async-storage/async-storage";

export type WriteDraft = {
  title: string;
  body: string;
  updatedAt: number; // epoch ms
};

const DRAFT_KEY = "glsoop:write:draft:v1";

function normalizeDraft(input: any): WriteDraft | null {
  if (!input || typeof input !== "object") return null;

  const title = typeof input.title === "string" ? input.title : "";
  const body = typeof input.body === "string" ? input.body : "";
  const updatedAt = typeof input.updatedAt === "number" ? input.updatedAt : Date.now();

  return { title, body, updatedAt };
}

export async function loadWriteDraft(): Promise<WriteDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return normalizeDraft(parsed);
  } catch {
    // ignore parse/storage errors
    return null;
  }
}

export async function saveWriteDraft(draft: {
  title: string;
  body: string;
  updatedAt?: number;
}): Promise<void> {
  const payload: WriteDraft = {
    title: draft.title ?? "",
    body: draft.body ?? "",
    updatedAt: draft.updatedAt ?? Date.now(),
  };

  try {
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export async function clearWriteDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}
