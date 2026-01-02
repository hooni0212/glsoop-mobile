type ApiOk<T> = { success: true; data: T };
type ApiErr = { success: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiErr;

const API_BASE = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/+$/, '');

if (!API_BASE) {
  console.warn('[api] EXPO_PUBLIC_API_BASE_URL is empty. Check your .env');
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

export async function apiGet<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

  const { controller, clear } = withTimeout(12000);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      // 웹에서 쿠키 인증을 쓰면 필요할 수 있음(지금은 토큰 방식 전이면 생략 가능)
      // credentials: 'include',
    });

    // ✅ res.json() 대신 text→parse (HTML/빈바디/에러페이지 대비)
    const text = await res.text();
    const parsed = safeJsonParse(text);

    if (!parsed) {
      // JSON이 아닌 응답이면 원인 바로 보이게
      throw new Error(`Non-JSON response (HTTP ${res.status}): ${text.slice(0, 160)}`);
    }

    // 디버그용 (원하면 지워도 됨)
    console.log('[api] GET', url, 'status=', res.status, 'json=', parsed);

    // ✅ HTTP 에러 처리
    if (!res.ok) {
      // 서버가 { success:false, error:{message} }를 지키는 경우
      if (parsed?.success === false) {
        throw new Error(parsed?.error?.message || parsed?.error?.code || `HTTP ${res.status}`);
      }
      // 서버가 { ok:false, message } 같은 경우
      throw new Error(parsed?.message || parsed?.error?.message || `HTTP ${res.status}`);
    }

    // ✅ (A) 공통 포맷: { success:true, data:T }
    if (parsed?.success === false) {
      throw new Error(parsed?.error?.message || parsed?.error?.code);
    }
    if (parsed?.success === true && 'data' in parsed) {
      return (parsed as ApiOk<T>).data;
    }

    // ✅ (B) 글숲 서버 포맷: { ok:true, posts:[...] } 등 -> json 자체 반환
    return parsed as T;
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error('Request timeout');
    throw e;
  } finally {
    clear();
  }
}
