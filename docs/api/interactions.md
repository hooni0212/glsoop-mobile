# interactions.md — 좋아요 / 북마크 API (v1)

이 문서는 글숲 모바일 앱의 **좋아요(Like), 북마크(Bookmark)** 상호작용 API를 정의한다.

- Base URL: `/api`
- 공통 규칙: `README.md` 참고
- 이 문서의 엔드포인트는 대부분 **로그인 필요(Private)**

---

## 1) 공통 원칙

### 1.1 Idempotency(멱등성)
- `POST`는 “켜기”, `DELETE`는 “끄기” 의미로 사용
- 동일 요청을 여러 번 보내도 결과가 안정적이어야 함(권장)
  - 예: 이미 좋아요 상태에서 `POST /like`를 다시 호출해도 에러 대신 “이미 좋아요”로 처리하거나 동일 결과 반환

### 1.2 UI 갱신 전략(권장)
- 모바일은 탭 즉시 반응이 중요하므로 **Optimistic UI** 권장
- 서버 응답이 실패하면 롤백 처리
- 응답에는 최소한 “현재 상태”와 “카운트”를 포함하는 것을 권장

---

## 2) 좋아요 (Like)

### 2.1 POST `/posts/:postId/like`
글에 좋아요를 설정한다.

#### Auth
- 🔒 Private

#### Response (200)
```json
{
  "success": true,
  "data": {
    "postId": "post_123",
    "isLiked": true,
    "likeCount": 13
  }
}
```

#### Errors
- `UNAUTHORIZED`: 로그인 필요
- `NOT_FOUND`: 글 없음

---

### 2.2 DELETE `/posts/:postId/like`
글 좋아요를 해제한다.

#### Auth
- 🔒 Private

#### Response (200)
```json
{
  "success": true,
  "data": {
    "postId": "post_123",
    "isLiked": false,
    "likeCount": 12
  }
}
```

---

## 3) 북마크 (Bookmark)

### 3.1 POST `/posts/:postId/bookmark`
글을 북마크에 추가한다.

#### Auth
- 🔒 Private

#### Response (200)
```json
{
  "success": true,
  "data": {
    "postId": "post_123",
    "isBookmarked": true,
    "bookmarkCount": 4
  }
}
```

---

### 3.2 DELETE `/posts/:postId/bookmark`
북마크를 해제한다.

#### Auth
- 🔒 Private

#### Response (200)
```json
{
  "success": true,
  "data": {
    "postId": "post_123",
    "isBookmarked": false,
    "bookmarkCount": 3
  }
}
```

---

## 4) 상호작용 상태 조회(옵션)

> v1에서는 피드/상세 API가 `viewer.isLiked`, `viewer.isBookmarked`를 포함하므로,
> 별도 상태 조회 API가 없어도 동작 가능하다.
>
> 다만 “대량 동기화”가 필요해지면 아래 API를 추가할 수 있다.

### 4.1 GET `/me/interactions/posts?ids=post_1,post_2,...`
특정 글 id들에 대한 현재 유저의 좋아요/북마크 상태를 한번에 조회.

#### Auth
- 🔒 Private

#### Query Parameters
- `ids` (required): 쉼표로 구분된 postId 목록 (최대 50 권장)

#### Response (200)
```json
{
  "success": true,
  "data": {
    "items": [
      { "postId": "post_1", "isLiked": true,  "isBookmarked": false },
      { "postId": "post_2", "isLiked": false, "isBookmarked": true  }
    ]
  }
}
```

---

## 5) 공통 에러 예시

### 5.1 로그인 필요
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Login required."
  }
}
```

### 5.2 글 없음
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Post not found."
  }
}
```

---

## 6) 구현 메모(서버)

### 6.1 DB 제약/인덱스(권장)
- likes 테이블: (user_id, post_id) UNIQUE
- bookmarks 테이블: (user_id, post_id) UNIQUE
- post_stats 집계:
  - 실시간 count는 join+count로 가능하지만 느려질 수 있음
  - 운영에서는 post_stats 테이블(캐시) 또는 트리거/배치 집계 고려

### 6.2 카운트 반환 방식
- 응답의 `likeCount`, `bookmarkCount`는 **현재 DB 기준 최종 값**을 반환 권장
- 클라이언트는 서버 값을 신뢰해 UI를 확정(동기화)

### 6.3 멱등 처리
- 이미 존재하는 좋아요/북마크에 대한 `POST`를 “OK”로 처리하면 클라이언트 구현이 단순해짐
