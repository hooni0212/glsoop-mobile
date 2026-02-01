# users.md — 사용자 / 마이페이지 / 작가 API (v1)

이 문서는 글숲 모바일 앱의 **사용자 정보, 마이페이지, 작가 페이지** 관련 API를 정의한다.

- Base URL: `/api`
- 공통 규칙: `README.md` 참고
- 시간: ISO 8601 (UTC)

---

## 1) 데이터 모델(요약)

### 1.1 User (Public)
```json
{
  "id": "user_10",
  "name": "유재원",
  "bio": "짧은 소개 문장",
  "joinedAt": "2025-12-01T00:00:00Z"
}
```

### 1.2 UserStats (Public)
```json
{
  "postCount": 24,
  "totalLikes": 312
}
```

### 1.3 MyProfile (Private)
```json
{
  "id": "user_10",
  "name": "유재원",
  "email": "user@example.com",
  "bio": "짧은 소개 문장",
  "joinedAt": "2025-12-01T00:00:00Z",
  "stats": {
    "postCount": 24,
    "totalLikes": 312,
    "streakDays": 7,
    "maxStreakDays": 21
  }
}
```

---

## 2) 내 정보 (마이페이지)

### 2.1 GET `/me`
로그인한 사용자의 기본 정보.

#### Auth
- 🔒 Private

#### Response (200)
```json
{
  "success": true,
  "data": {
    /* MyProfile */
  }
}
```

---

## 3) 내 글 목록

### 3.1 GET `/me/posts`
마이페이지의 “내가 쓴 글” 목록.

#### Auth
- 🔒 Private

#### Query Parameters
- `cursor` (optional)
- `limit` (optional, default: 10)

#### Response (200)
```json
{
  "success": true,
  "data": {
    "items": [/* Post[] */],
    "nextCursor": "cursor_abc",
    "hasNext": true
  }
}
```

---

## 4) 내 북마크 목록

### 4.1 GET `/me/bookmarks`
마이페이지의 “북마크한 글” 목록.

#### Auth
- 🔒 Private

#### Response (200)
```json
{
  "success": true,
  "data": {
    "items": [/* Post[] */],
    "nextCursor": null,
    "hasNext": false
  }
}
```

---

## 5) 작가(Author) 페이지

### 5.1 GET `/users/:userId/profile`
작가 프로필 상단 정보.

#### Auth
- 🔓 Public

#### Response (200)
```json
{
  "ok": true,
  "message": "success",
  "user": {
    "id": "user_10",
    "name": "유재원",
    "bio": "짧은 소개 문장",
    "joinedAt": "2025-12-01T00:00:00Z",
    "post_count": 24,
    "total_likes": 312
  },
  "viewer": {
    "isFollowing": false
  }
}
```

---

## 6) 작가 글 목록

### 6.1 GET `/users/:userId/posts`
작가가 작성한 글 목록.

#### Auth
- 🔓 Public

#### Query Parameters
- `cursor` (optional)
- `limit` (optional, default: 10)

#### Response (200)
```json
{
  "success": true,
  "data": {
    "items": [/* Post[] */],
    "nextCursor": "cursor_def",
    "hasNext": true
  }
}
```

---

## 7) 사용자 정보 수정 (선택)

> v1에서는 **프로필 수정 기능을 최소화**하는 것을 권장.

### 7.1 PATCH `/me`
#### Auth
- 🔒 Private

#### Request Body
```json
{
  "name": "새 닉네임",
  "bio": "수정된 소개"
}
```

#### Response (200)
```json
{
  "success": true,
  "data": {
    "updatedAt": "2026-01-03T09:00:00Z"
  }
}
```

---

## 8) 공통 에러 예시

### 8.1 인증 필요 API에서 토큰 누락
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Login required."
  }
}
```

### 8.2 사용자 없음
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found."
  }
}
```

---

## 9) 구현 메모

- 작가 페이지는 **팔로우/랭킹 없이도 충분히 탐색성이 좋도록 설계**
- `totalLikes`는 서버에서 집계(캐시 권장)
- 마이페이지 성장 정보는 `growth.md`에서 상세 정의
