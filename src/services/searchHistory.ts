import AsyncStorage from "@react-native-async-storage/async-storage";

const SEARCH_HISTORY_KEY = "glsoop:search:history:v1";
const MAX_RECENT_SEARCHES = 8;

function normalizeKeyword(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function safeParseArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => (typeof item === "string" ? normalizeKeyword(item) : ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function dedupeKeywords(keywords: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of keywords) {
    const normalized = normalizeKeyword(item);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }

  return result;
}

async function loadHistory(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
  const parsed = safeParseArray(raw);
  return dedupeKeywords(parsed).slice(0, MAX_RECENT_SEARCHES);
}

async function persistHistory(history: string[]) {
  const next = dedupeKeywords(history).slice(0, MAX_RECENT_SEARCHES);
  await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
  return next;
}

export async function listRecentSearches(): Promise<string[]> {
  try {
    return await loadHistory();
  } catch {
    return [];
  }
}

export async function saveRecentSearch(query: string): Promise<string[]> {
  const keyword = normalizeKeyword(query);
  if (!keyword) return listRecentSearches();

  try {
    const history = await loadHistory();
    const next = [keyword, ...history.filter((item) => item.toLowerCase() !== keyword.toLowerCase())];
    return await persistHistory(next);
  } catch {
    return [];
  }
}

export async function clearRecentSearches(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch {
    // ignore
  }
}

