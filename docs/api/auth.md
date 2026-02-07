# 🔐 인증/회원가입 (OTP)

이 문서는 **서버 우선(server-first)** 기준의 OTP 기반 회원가입 흐름을 설명한다.
글숲 서버는 `snake_case` 응답과 `{ ok, message, ... }` 형식을 사용한다.

---

## 1. 공통 규칙

- 모든 요청/응답은 JSON
- 응답 형식: `{ ok: boolean, message?: string, ... }`
- 필드 네이밍: `snake_case`

### 회원가입 플로우 불일치(OTP + nickname) — 서버 기준

- `POST /api/signup` body: `{ name, nickname, email, pw }` → `pending_id`, `email_masked`, `otp_ttl`, `resend_after` (plus `ok/message`)
- `POST /api/verify-email` body: `{ pending_id, verification_code }`
- `POST /api/verify-email/resend` body: `{ pending_id }` 또는 `{ email }`  
  - HTTP 429 가능: `retry_after` 포함

> snake_case → camelCase 변환은 **공유 레이어(api/mapper)**에서 처리하고, 화면 단위로 흩어지지 않도록 한다. 서버 응답은 `ok/message` 엔벨로프이며, 페이징은 `offset/has_more`가 기준이다.

---

## 2. 회원가입 (OTP 요청)

### 관련 경로

- Route: `app/(auth)/signup.tsx`
- UI: `src/screens/AuthSignup.tsx`

### 요청
`POST /api/signup`

```json
{
  "name": "홍길동",
  "nickname": "길동",
  "email": "user@example.com",
  "pw": "password123"
}
```

### 응답 (성공)

```json
{
  "ok": true,
  "pending_id": "pend_123",
  "email_masked": "u***@example.com",
  "otp_ttl": 300,
  "resend_after": 60
}
```

### 응답 (실패)

```json
{
  "ok": false,
  "message": "이미 가입된 이메일입니다."
}
```

---

## 3. 이메일 인증 (OTP 검증)

### 요청
`POST /api/verify-email`

```json
{
  "pending_id": "pend_123",
  "verification_code": "123456"
}
```

### 응답 (성공)

```json
{
  "ok": true,
  "user_id": "user_123"
}
```

### 응답 (실패)

```json
{
  "ok": false,
  "message": "인증번호가 올바르지 않습니다."
}
```

> 이 응답은 **토큰을 포함하지 않는다**. 클라이언트는 검증 성공 후 `/api/login`으로 자동 로그인한다.

---

## 4. 인증번호 재발송

### 요청
`POST /api/verify-email/resend`

```json
{
  "pending_id": "pend_123"
}
```

또는

```json
{
  "email": "user@example.com"
}
```

### 응답 (성공)

```json
{
  "ok": true,
  "resend_after": 60
}
```

### 응답 (Too Many Requests)

HTTP 429

```json
{
  "ok": false,
  "message": "요청이 너무 많습니다.",
  "retry_after": 30
}
```

클라이언트는 `retry_after`를 기반으로 재발송 버튼을 비활성화한다.
