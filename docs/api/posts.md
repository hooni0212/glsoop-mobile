# posts.md — 글/피드 API (v1)

이 문서는 글숲 모바일 앱에서 사용하는 **피드/글 상세/작성/수정/삭제/필터링** 관련 API를 정의한다.

- Base URL: `/api`
- 공통 규칙: `docs/api/README.md` 참고
- 시간: ISO 8601 (UTC)
- Pagination: Offset 기반

> 앱 내부에서 camelCase를 사용하더라도 API 응답은 **snake_case**가 기준이며, 필요 시 매핑 레이어에서 변환한다.

---

## 1) 데이터 모델(요약)

### 1.1 PostType
- `poem` (시)
- `essay` (에세이)
- `short` (짧은 글귀)

### 1.2 Post (FeedCard 최소 필드)
```json
{
  "id": "post_123",
  "type": "essay",
  "title": "겨울 숲의 문장",
  "excerpt": "오늘은 조금 느리게 걸어도 괜찮다고...",
  "author": {
    "id": "user_10",
    "name": "유재원"
  },
  "tags": ["힐링", "일상"],
  "created_at": "2026-01-01T12:34:56Z",
  "stats": {
    "like_count": 12,
    "bookmark_count": 3
  },
  "viewer": {
    "is_liked": false,
    "is_bookmarked": true
  }
}
```

### 1.3 PostDetail (상세 필드)
```json
{
  "id": "post_123",
  "type": "essay",
  "title": "겨울 숲의 문장",
  "content": "긴 본문 텍스트...",
  "content_format": "plain",
  "author": {
    "id": "user_10",
    "name": "유재원",
    "bio": "짧은 소개(선택)"
  },
  "tags": ["힐링", "일상"],
  "created_at": "2026-01-01T12:34:56Z",
  "updated_at": "2026-01-02T10:00:00Z",
  "stats": {
    "like_count": 12,
    "bookmark_count": 3,
    "view_count": 120
  },
  "viewer": {
    "is_liked": false,
    "is_bookmarked": true,
    "can_edit": true
  }
}
```

> `content_format`은 v1에서는 기본 `plain`을 권장.  
> 기존 웹이 HTML 기반이라면 `html`도 가능하나, **모바일 렌더/보안(sanitize)** 정책을 확정한 뒤에 사용하는 것을 권장.

---

## 2) 피드 목록 조회

### 2.1 GET `/posts`
피드(홈)에서 사용하는 글 목록 API.

#### Auth
- 🔓 Public (비로그인도 조회 가능)
- 로그인 상태면 `viewer.is_liked`, `viewer.is_bookmarked`가 정확히 채워짐

#### Query Parameters
- `type` (optional): `poem | essay | short`
- `tag` (optional): 단일 태그 (예: `힐링`)
- `tags` (optional): 복수 태그(AND) — 쉼표 구분 (예: `힐링,일상`)
- `sort` (optional): `recommend | popular | latest` (default: `latest`)
- `offset` (optional): 다음 페이지 offset (기본 0)
- `limit` (optional): 1~30 (default: 10)

#### Example
`GET /api/posts?type=essay&tag=힐링&sort=latest&offset=0&limit=10`

#### Response (200)
```json
{
  "ok": true,
  "message": "success",
  "items": [/* Post[] */],
  "offset": 10,
  "has_more": true
}
```

#### Notes
- `excerpt`는 서버에서 생성(권장): 본문 앞부분을 2~3줄 분량으로 잘라 제공
- 피드 카드 UI에 맞춰 `excerpt` 길이는 서버에서 일관되게 유지

---

## 3) 글 상세 조회

### 3.1 GET `/posts/:postId`
글 상세 화면에서 사용.

#### Auth
- 🔓 Public (비로그인도 조회 가능)
- 로그인 상태면 `viewer.*` 필드가 포함됨

#### Response (200)
```json
{
  "ok": true,
  "message": "success",
  "post": {
    /* PostDetail */
  }
}
```

#### Notes (모바일 하단 여백 UX)
- 상세 화면에서 하단 버튼 영역 때문에 본문이 가려지지 않도록, 클라이언트는 **콘텐츠 영역 하단 padding**을 충분히 둔다.
- API는 특별한 “여백 데이터”를 제공할 필요 없음.

---

## 4) 글 작성

### 4.1 POST `/posts`
글 작성 화면에서 “게시” 시 사용.

#### Auth
- 🔒 Private

#### Request Body
```json
{
  "type": "essay",
  "title": "제목(선택)",
  "content": "본문 텍스트",
  "content_format": "plain",
  "tags": ["힐링", "일상"]
}
```

#### Validation (권장)
- `type`: 필수
- `content`: 필수, 1~10000자(임시 기준)
- `title`: optional, 0~120자
- `tags`: optional, 최대 10개
- 태그 공백/중복 정리(서버에서 정규화 권장)

#### Response (201)
```json
{
  "ok": true,
  "message": "success",
  "post_id": "post_123"
}
```

---

## 5) 글 수정

### 5.1 PATCH `/posts/:postId`
작성자 본인(또는 관리자)만 수정 가능.

#### Auth
- 🔒 Private

#### Request Body (부분 수정)
```json
{
  "type": "essay",
  "title": "수정된 제목",
  "content": "수정된 본문",
  "tags": ["힐링"]
}
```

#### Response (200)
```json
{
  "ok": true,
  "message": "success",
  "post_id": "post_123",
  "updated_at": "2026-01-02T10:00:00Z"
}
```

#### Errors
- `FORBIDDEN`: 작성자 아님
- `NOT_FOUND`: 글 없음

---

## 6) 글 삭제

### 6.1 DELETE `/posts/:postId`
작성자 본인(또는 관리자)만 삭제 가능.

#### Auth
- 🔒 Private

#### Response (200)
```json
{
  "ok": true,
  "message": "success",
  "post_id": "post_123",
  "deleted": true
}
```

---

## 7) 태그(해시태그) 지원

> 홈 화면의 “해시태그 버튼”을 위해 필요한 API.  
> v1에서는 **인기 태그 목록**만 제공해도 충분.

### 7.1 GET `/tags/popular`
#### Auth
- 🔓 Public

#### Query Parameters
- `limit` (optional): 1~30 (default: 10)
- `type` (optional): `poem | essay | short` (특정 글 종류 기준 인기 태그)

#### Response (200)
```json
{
  "ok": true,
  "message": "success",
  "items": [
    { "tag": "힐링", "post_count": 120 },
    { "tag": "일상", "post_count": 98 }
  ]
}
```

---

## 8) 공통 에러 예시

### 8.1 인증 필요 API에서 토큰 누락
```json
{
  "ok": false,
  "message": "Login required."
}
```

### 8.2 잘못된 요청
```json
{
  "ok": false,
  "message": "Invalid 'type' value."
}
```

---

## 9) 구현 메모 (서버)

- 피드 조회는 `sort`에 따라 인덱스/정렬 전략이 달라질 수 있음
  - `latest`: created_at DESC
  - `popular`: like_count(또는 score) DESC
  - `recommend`: 앱/서비스 추천 로직(초기엔 latest와 동일로 시작해도 됨)
- `viewer.is_liked`, `viewer.is_bookmarked`는 **로그인 유저 기준**으로 조립
- `excerpt`는 서버에서 생성해 클라이언트 간 일관성 유지 권장
