import { maskEmail } from "@/lib/maskEmail";

const EMAIL_VERIFICATION_KEYWORDS = [
  "이메일 인증",
  "email verification",
  "verify email",
  "email verify",
  "미인증",
  "인증이 필요",
];

export function isEmailVerificationRequired(message?: string | null): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return EMAIL_VERIFICATION_KEYWORDS.some((keyword) => lower.includes(keyword.toLowerCase()));
}

export function buildEmailVerificationNotice(email?: string | null): string {
  const base = "이메일 인증이 필요합니다. 인증 메일을 확인해 주세요";
  if (!email) return `${base}.`;
  return `${base}: ${maskEmail(email)}`;
}

export function buildPasswordResetNotice(email?: string | null): string {
  if (!email) return "비밀번호 재설정 링크를 보냈습니다.";
  return `비밀번호 재설정 링크를 ${maskEmail(email)}로 보냈습니다.`;
}

// TODO: password reset 화면/플로우에서 buildPasswordResetNotice()를 사용해 안내 메시지 통일.
