import { apiFetch } from "./api";

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export interface SignupResponse {
  ok: boolean;
  message?: string;
}

/**
 * 회원가입 API
 * POST /api/signup
 *
 * 주의:
 * - 이메일 인증형 플로우이므로 token은 내려오지 않을 수 있음
 */
export async function signup(payload: SignupPayload): Promise<SignupResponse> {
  return apiFetch("/api/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
