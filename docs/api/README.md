# 📘 글숲 모바일 API Specification (v1)

## 1. 목적 (Purpose)

이 문서는 **글숲(glsoop) 모바일 앱**에서 사용하는 API의 공통 규칙과 설계 원칙을 정의한다.

- 모바일 앱(Expo / React Native)
- 기존 글숲 서버(Node.js + Express + DB)

간의 **명확한 계약(API Contract)**을 만드는 것이 목적이다.

이 문서는:
- 프론트엔드 개발
- 백엔드 API 구현
- 추후 유지보수 및 확장

의 **기준 문서(Single Source of Truth)** 역할을 한다.

---

## 2. 기본 원칙 (Core Principles)

### 2.1 API First
- 모바일 앱은 **DB에 직접 접근하지 않는다**
- 모든 데이터 접근은 API를 통해 이루어진다

### 2.2 JSON Only
- 모든 요청/응답은 JSON 형식을 사용한다
- HTML 응답은 사용하지 않는다

### 2.3 명확한 책임 분리
- 서버: 인증, 권한, 데이터 무결성
- 클라이언트: UI, 상태 관리, 사용자 경험

---

## 3. Base URL

### 개발 환경
```
http://localhost:3000/api
```

### 운영 환경 (예시)
```
https://glsoop.com/api
```

---

## 4. 인증 (Authentication)

### 4.1 방식
- JWT 기반 인증 사용
- `Authorization` 헤더에 Bearer 토큰 전달

```
Authorization: Bearer <access_token>
```

### 4.2 인증 필요 여부
- 🔓 Public API: 인증 없이 접근 가능
- 🔒 Private API: 로그인 필요

각 API 문서에 명시한다.

---

## 5. 공통 응답 형식 (Response Format)

### 5.1 성공 응답
```json
{
  "success": true,
  "data": {}
}
```

### 5.2 실패 응답
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

---

## 6. 에러 코드 규칙 (Error Codes)

| Code | 의미 |
|---|---|
| UNAUTHORIZED | 인증되지 않음 |
| FORBIDDEN | 권한 없음 |
| NOT_FOUND | 리소스 없음 |
| INVALID_REQUEST | 잘못된 요청 |
| INTERNAL_ERROR | 서버 오류 |

> 프론트에서는 `code`를 기준으로 분기 처리한다.

---

## 7. 날짜 / 시간 규칙

- 모든 날짜는 **ISO 8601 문자열**
- 서버 기준 UTC 사용

```json
"createdAt": "2026-01-01T12:34:56Z"
```

---

## 8. Pagination 규칙 (Cursor-based)

### 8.1 왜 Cursor 방식인가
- 무한 스크롤 UI에 적합
- 데이터 변경에 강함

### 8.2 요청 예시
```
GET /posts?cursor=abc123&limit=10
```

### 8.3 응답 예시
```json
{
  "success": true,
  "data": {
    "items": [],
    "nextCursor": "def456",
    "hasNext": true
  }
}
```

---

## 9. 콘텐츠 분류 규칙

### 9.1 글 종류 (Post Type)
| 값 | 의미 |
|---|---|
| poem | 시 |
| essay | 에세이 |
| short | 짧은 글귀 |

### 9.2 해시태그
- 문자열 배열로 표현
```json
"tags": ["힐링", "일상"]
```

---

## 10. 클라이언트 전용 처리 항목

다음 항목은 **서버 API 없이 클라이언트에서 처리**한다.

- 앱 최초 진입 가이드(Onboarding overlay)
- 가이드 재노출 여부 (`hasSeenOnboarding`)
- UI 애니메이션 상태

---

## 11. 문서 구성

| 파일 | 설명 |
|---|---|
| posts.md | 피드, 글 상세, 필터, 작성 |
| users.md | 마이페이지, 작가 페이지 |
| interactions.md | 좋아요, 북마크 |
| growth.md | 성장 정보 (스트릭, 통계) |

---

## 12. 버전 관리

- 현재 버전: **v1**
- Breaking change 발생 시 문서 버전 명시
- 모바일 앱은 명시된 버전에 맞춰 동작한다

---

## 13. 참고 사항

- 이 문서는 **UI(피그마) 기준으로 작성됨**
- UI 변경 시 API 문서도 함께 수정해야 한다
