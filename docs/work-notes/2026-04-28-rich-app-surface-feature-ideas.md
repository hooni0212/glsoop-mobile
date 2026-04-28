# 앱 화면 풍부화 및 권한형 게시 기능 제안

- 문서 타입: `Product / Feature Proposal`
- 적용 범위: `glsoop-mobile`, `glsoop` 서버
- 작성일: `2026-04-28`
- 상태: `Draft`
- 목적: 글숲 모바일 앱의 화면 구성을 더 다채롭게 만들고, 웹 댓글 UI parity, 글 공개 범위, 댓글 작성자 범위 제한, 릴레이 소설, 매일 주제 글쓰기를 포함한 기능 후보를 정리한다.

---

## 1. 방향

현재 앱은 홈 피드, 검색, 글쓰기, 북마크, 성장, 작가 프로필, 댓글, 팔로우 등 기본 기능이 이미 있다. 다음 단계는 기능을 단순히 더 붙이는 것보다, 사용자가 앱 안에서 더 많은 맥락을 발견하고 선택할 수 있게 만드는 쪽이 좋다.

핵심 루프:

1. 오늘 참여할 거리 발견
2. 관심 주제/작가/컬렉션 탐색
3. 글 읽기와 반응
4. 글쓰기와 공개 범위 설정
5. 댓글/알림/성장 보상으로 재방문

이번 제안의 중심은 다음 네 가지다.

- 화면을 풍부하게 만드는 탐색/참여형 화면 추가
- 글쓴이가 글의 공개 범위와 댓글 허용 범위를 제어하는 권한형 게시 기능 추가
- 웹에서 이미 사용하는 댓글 UI 형식을 모바일 상세 화면에도 맞추는 댓글 경험 통일
- 릴레이 소설, 매일 주제 글쓰기처럼 앱 안에서 새 화면과 참여 흐름을 만드는 쓰기 기능 추가
- 장르/주제 선택형 홈 피드와 숏츠/릴스처럼 넘겨보는 몰입형 읽기 피드 추가

---

## 2. 1순위 기능: 글 공개 범위와 댓글 권한

### 2.1 사용자 가치

글을 쓰는 사용자는 매번 같은 수준의 공개를 원하지 않는다. 어떤 글은 모두에게 보여주고 싶고, 어떤 글은 팔로워에게만 보여주고 싶고, 어떤 글은 나만 보관하고 싶을 수 있다. 댓글도 마찬가지로 모든 사람에게 열어두기보다 글의 성격에 따라 제한할 수 있어야 한다.

이 기능은 글쓰기 화면을 더 풍부하게 만들고, 사용자가 더 민감한 글도 앱 안에 남길 수 있게 한다.

### 2.2 글 공개 범위

초기 권장 옵션:

| 값 | 화면 표시 | 설명 |
| --- | --- | --- |
| `public` | 전체 공개 | 홈, 검색, 작가 페이지, 태그 화면에 노출 가능 |
| `followers` | 팔로워 공개 | 글쓴이를 팔로우한 로그인 사용자만 열람 가능 |
| `unlisted` | 링크 공개 | 피드/검색에는 노출하지 않고 직접 링크로만 접근 가능 |
| `private` | 나만 보기 | 글쓴이 본인만 열람 가능 |

후속 후보:

- `mutuals`: 서로 팔로우한 사용자만 공개
- `members`: 특정 그룹 또는 멤버십 사용자 공개
- `scheduled_public`: 특정 시점 이후 전체 공개

### 2.3 댓글 권한 / 댓글 작성자 범위 제한

초기 권장 옵션:

| 값 | 화면 표시 | 설명 |
| --- | --- | --- |
| `everyone` | 모두 댓글 가능 | 비로그인 읽기는 가능하더라도 댓글 작성은 정책상 로그인 요구 가능 |
| `logged_in` | 로그인 사용자만 | 로그인한 사용자만 댓글 작성 |
| `followers` | 팔로워만 | 글쓴이를 팔로우한 사용자만 댓글 작성 |
| `author_only` | 나만 댓글 가능 | 글쓴이만 댓글을 남길 수 있음. 일기형/기록형 글에 적합 |
| `closed` | 댓글 닫기 | 새 댓글 작성 불가. 기존 댓글은 읽기만 허용할 수 있음 |

후속 후보:

- `mentioned_only`: 글쓴이가 지정한 사용자만 댓글 가능
- `approved_users`: 허용 목록 기반 댓글 가능
- `moderated`: 댓글은 작성되지만 글쓴이 승인 전까지 비공개

### 2.4 모바일 화면 변경

#### 글쓰기 화면

`Write` 화면의 메타 설정 영역에 `공개 범위`와 `댓글 권한` 섹션을 추가한다.

권장 UI:

- 공개 범위: 아이콘이 있는 segmented control 또는 bottom sheet selector
- 댓글 권한: selector + 짧은 설명
- 미리보기 화면 하단에 현재 설정 요약 노출
- 제출 전 설정이 명확히 보이도록 `전체 공개 · 모두 댓글 가능` 같은 요약 칩 표시

예시 문구:

- `전체 공개`
- `팔로워 공개`
- `링크 공개`
- `나만 보기`
- `댓글: 모두`
- `댓글: 팔로워만`
- `댓글: 나만`
- `댓글 닫힘`

#### 글 상세 화면

글 상세 상단 또는 메타 영역에 공개/댓글 상태를 작게 표시한다.

예시:

- `팔로워 공개`
- `링크로만 공개`
- `댓글은 팔로워만 가능`
- `댓글이 닫힌 글이에요`

댓글 composer는 권한에 따라 다르게 표시한다.

- 댓글 가능: 입력창 표시
- 로그인 필요: 로그인 유도 버튼
- 권한 없음: 읽기 전용 안내
- 댓글 닫힘: composer 숨김 + 상태 문구

#### 내 글 관리

마이페이지 `내 글` 탭 또는 글 상세의 작성자 메뉴에서 공개 범위와 댓글 권한을 수정할 수 있어야 한다.

권장 UX:

- `공개/댓글 설정 변경` 메뉴
- 변경 즉시 서버 반영
- 검색/피드 노출 정책 재계산

### 2.5 서버 모델 변경

`posts` 테이블 또는 게시글 설정 테이블에 아래 필드를 추가한다.

```sql
visibility text not null default 'public',
comment_policy text not null default 'logged_in',
published_at timestamptz,
visibility_updated_at timestamptz,
comment_policy_updated_at timestamptz
```

권장 제약:

```sql
check (visibility in ('public', 'followers', 'unlisted', 'private')),
check (comment_policy in ('everyone', 'logged_in', 'followers', 'author_only', 'closed'))
```

서버 권한 체크:

- `GET /api/posts`: `public`만 기본 노출
- `GET /api/posts/:id`: 요청자 기준으로 열람 가능 여부 확인
- `GET /api/users/:id/posts`: 공개 글만 기본 노출, 본인 조회 시 private 포함 가능
- `GET /api/search`: `public`만 검색 노출
- `POST /api/posts/:id/comments`: `comment_policy` 기준으로 작성 가능 여부 확인
- 차단 관계가 있으면 공개 범위보다 차단 정책을 우선 적용

응답 필드 예시:

```json
{
  "post": {
    "id": 123,
    "title": "제목",
    "visibility": "followers",
    "comment_policy": "followers",
    "viewer": {
      "can_read": true,
      "can_comment": true,
      "is_author": false,
      "visibility_reason": "following_author"
    }
  }
}
```

작성/수정 요청 예시:

```json
{
  "title": "제목",
  "content": "본문",
  "category": "essay",
  "hashtags": ["기록"],
  "visibility": "followers",
  "comment_policy": "author_only"
}
```

### 2.6 주의할 정책

- `private` 글은 홈, 검색, 태그, 작가 공개 페이지, 공유 카드에 노출하지 않는다.
- `unlisted` 글은 직접 링크 접근은 가능하지만 검색/추천/태그 랭킹에는 넣지 않는다.
- `followers` 글은 팔로워가 아닌 사용자가 링크로 접근해도 제목/본문을 보여주지 않는다.
- 댓글 권한은 글 열람 권한보다 넓을 수 없다. 예를 들어 `private + everyone` 조합은 실제로 본인만 댓글 가능하게 처리한다.
- 기존 댓글이 있는 글을 `closed`로 바꿀 경우 기존 댓글은 유지하되 새 댓글만 막는 것이 안전하다.

### 2.7 웹 댓글 UI 모바일 적용

웹 댓글 UI는 `../glsoop/public/html/post.html`, `../glsoop/public/js/post.js`, `../glsoop/public/css/pages/post.css`의 `postCommentsPanel` 흐름을 기준으로 한다. 모바일 `PostDetail` 댓글 영역도 이 구조를 따라가야 한다.

웹 기준 UI 요소:

- 댓글 패널 헤더: `COMMENTS`, `댓글 N`
- 댓글 composer: 1000자 입력, 글자 수 카운터, 전송 아이콘 버튼
- 답글 대상 바: `OO님에게 답글` + 취소
- 댓글 스레드: 최상위 댓글과 답글 묶음
- 댓글 작성자 마커: 작성자 첫 글자 원형 마커
- 댓글 본문 카드: 작성자, 날짜, 본문
- 댓글 액션: 답글, 댓글 공감, 삭제
- 상태 문구: 로딩, 비어 있음, 오류
- 모바일 웹 기준 pull-to-refresh 댓글 새로고침

모바일 적용 기준:

- `PostDetail` 댓글 섹션을 웹과 같은 패널형 UI로 정리한다.
- `CommentComposer`, `CommentThread`, `CommentItem`, `ReplyTargetBar`, `CommentActionRow` 컴포넌트로 분리한다.
- 답글은 최상위 댓글 아래 들여쓰기하고, 답글 스레드 라인을 시각적으로 보여준다.
- 댓글 공감 버튼은 웹과 동일하게 count + selected 상태를 가진다.
- 댓글 삭제는 삭제 후 항목을 제거하지 않고 `삭제된 댓글입니다.` 상태로 즉시 반영한다.
- 로그인하지 않았거나 `comment_policy` 때문에 작성 권한이 없으면 composer를 disabled 또는 안내 상태로 바꾼다.
- `author_only`, `followers`, `closed` 상태에서는 댓글 작성 불가 사유를 댓글 패널 안에서 명확히 보여준다.

모바일 서비스 갭:

- 현재 모바일 `PostComment` 모델은 웹이 쓰는 `like_count`, `liked_by_me`를 충분히 반영하지 못한다.
- `src/services/commentService.ts`에 `likeCount`, `likedByMe` 정규화 필드를 추가한다.
- `toggleCommentLike(commentId)`를 추가하고 서버의 `POST /api/comments/:id/toggle-like`와 맞춘다.
- E2E는 웹 `tests/e2e/post-comments-web.spec.js`의 주요 흐름을 모바일에도 맞춰 추가한다.

완료 기준:

- 모바일 글 상세에서 웹과 같은 댓글 정보 구조가 보인다.
- 댓글/답글 작성, 댓글 공감, 삭제, 로그인 유도, 권한 없음 상태가 모두 동작한다.
- 댓글 작성자 범위 제한이 composer 상태와 서버 응답 에러에 일관되게 반영된다.
- iOS/Android/Web 작은 화면에서 댓글 본문, 액션, 답글 들여쓰기가 겹치지 않는다.

---

## 3. 홈 화면 풍부화

### 3.1 오늘의 숲 홈

홈을 단순 피드 목록이 아니라, 하루에 한 번 열어볼 이유가 있는 화면으로 바꾼다.

추가 섹션 후보:

- 오늘의 글감/주제
- 오늘 참여 가능한 챌린지
- 내 관심 태그 새 글
- 지금 많이 읽는 글
- 팔로우한 작가의 새 글
- 최근 저장한 글 이어보기
- 나에게 온 반응 요약

권장 첫 화면 구성:

1. 헤더: 검색 + 알림
2. 오늘의 글감/주제 카드
3. 빠른 액션: 글쓰기, 임시저장, 저장한 글, 성장
4. 관심 주제 가로 섹션
5. 기존 추천 피드

서버 후보:

- `GET /api/home/summary`
- `GET /api/prompts/today`
- `GET /api/tags/trending`
- `GET /api/posts?sort=popular&period=today`
- `GET /api/me/reading-history/recent`

모바일 후보 화면/컴포넌트:

- `HomeTodayCard`
- `HomeQuickActions`
- `HomeTopicRail`
- `HomeContinueReading`
- `HomeNotificationSummary`

### 3.2 장르/주제 선택형 홈 피드

홈 피드에서 사용자가 먼저 읽고 싶은 장르나 분위기를 선택하게 만든다. 지금의 `추천 / 팔로잉 / 인기`는 유지하되, 그 아래 또는 상단에 더 구체적인 선택지를 둔다.

권장 1차 분류:

| 분류 | 예시 |
| --- | --- |
| 장르 | 시, 산문, 에세이, 일기, 편지, 릴레이 소설, 짧은 문장 |
| 분위기 | 위로, 설렘, 새벽, 유머, 회복, 고요, 생각 |
| 길이 | 한 화면 글, 1분 읽기, 긴 글 |
| 관계 | 전체, 팔로잉, 내 관심 태그, 오늘 주제 |
| 참여 | 이어쓰기 가능, 댓글 활발, 챌린지 참여 글 |

홈 상단 UX:

- 첫 줄: `추천`, `팔로잉`, `인기`, `오늘 주제`
- 둘째 줄: 장르 chip rail. 예: `시`, `에세이`, `릴레이`, `짧은글`, `위로`
- 셋째 줄 또는 bottom sheet: 세부 필터. 예: `1분 읽기`, `댓글 많은`, `새 글`, `저장 많은`
- 사용자가 선택한 장르/분위기는 다음 홈 진입 시 유지한다.
- 비로그인 사용자는 로컬 선호만 저장하고, 로그인 후 서버 선호와 병합한다.

세부 화면 후보:

- 홈 기본 리스트: 기존 `FeedCard` 기반
- 장르 상세 피드: 선택한 장르의 최신/인기/추천 글
- 몰입형 피드: 숏츠/릴스처럼 한 글씩 넘겨보는 full-screen 피드
- 장르 관리 화면: 관심 장르/분위기 선택

서버 모델 후보:

- `genres`
  - `id`
  - `slug`
  - `name`
  - `group`: `genre`, `mood`, `length`, `participation`
  - `description`
  - `sort_order`
  - `is_active`
- `post_genres`
  - `post_id`
  - `genre_id`
  - `source`: `author`, `system`, `admin`
- `user_feed_preferences`
  - `user_id`
  - `genre_id`
  - `weight`
  - `created_at`
  - `updated_at`
- `feed_events`
  - `user_id`
  - `post_id`
  - `event_type`: `view`, `like`, `bookmark`, `comment`, `share`, `skip`, `finish`
  - `surface`: `home_list`, `immersive_feed`, `topic_feed`
  - `dwell_ms`
  - `created_at`

서버 API 후보:

- `GET /api/genres`
- `GET /api/me/feed-preferences`
- `PUT /api/me/feed-preferences`
- `GET /api/feed?genre=essay&mood=comfort&mode=list`
- `GET /api/feed/immersive?genre=poem&cursor=...`
- `POST /api/feed-events`

권장 정책:

- 장르/분위기는 사용자가 직접 고를 수 있게 하되, 글 작성자가 선택한 카테고리/태그와 서버 추천 장르를 함께 사용한다.
- `visibility=public` 글만 기본 추천/장르 피드에 노출한다.
- `followers` 글은 팔로잉 피드 또는 권한 있는 사용자에게만 추천한다.
- `unlisted`, `private` 글은 장르 피드와 몰입형 피드에서 제외한다.
- 사용자가 `관심 없음`, 빠른 스킵, 차단을 한 작가/장르는 추천 weight를 낮춘다.

### 3.3 숏츠/릴스형 몰입 피드

글숲에 그대로 영상 숏츠를 복제하기보다, 텍스트 읽기에 맞춘 “한 화면 한 글” 세로 넘김 피드로 적용한다. 핵심은 짧고 아름다운 글을 빠르게 발견하게 만드는 것이다.

기본 UX:

- 화면 하나에 글 한 편 또는 글 이미지 한 장을 크게 보여준다.
- 위/아래 스와이프로 다음/이전 글을 이동한다.
- 오른쪽 또는 하단에 빠른 액션을 둔다: 좋아요, 댓글, 저장, 공유, 더보기.
- 왼쪽 하단에는 작가, 장르, 시간, 제목을 작게 표시한다.
- 본문이 길면 첫 화면은 요약/첫 페이지를 보여주고 `전체 읽기`로 상세 이동한다.
- 댓글은 전체 화면을 벗어나지 않도록 bottom sheet로 연다.
- 장르 chip을 상단에 작게 두고, 누르면 같은 장르의 몰입 피드로 전환한다.

화면 구성:

| 영역 | 내용 |
| --- | --- |
| 상단 | 장르 chip, 피드 모드, 검색/닫기 |
| 중앙 | 글 카드 또는 렌더 이미지 |
| 우측/하단 액션 | 좋아요, 댓글, 저장, 공유, 더보기 |
| 하단 메타 | 제목, 작가, 장르, 읽기 시간 |
| 오버레이 | 댓글 sheet, 공유 sheet, 신고/차단 sheet |

모바일 라우트 후보:

- `/feed/immersive`
- `/feed/immersive?genre=poem`
- `/feed/immersive?topic=today`
- `/feed/immersive?relay=true`

기존 화면과의 관계:

- 홈 리스트 피드는 유지한다.
- 홈 상단에 `몰입 피드` 진입 버튼 또는 장르 rail 끝에 `전체화면으로 보기`를 둔다.
- `FeedCard`에서 글 이미지가 있는 글은 몰입 피드에 특히 잘 맞는다.
- 글 상세는 여전히 깊이 읽기, 댓글 전체 보기, 작가 이동의 목적지로 유지한다.

콘텐츠 선정 기준:

- 짧은 글 또는 첫 페이지가 강한 글 우선
- 렌더 이미지가 있는 글 우선
- 오늘 주제/챌린지 참여 글 우선 노출 가능
- 최근 반응이 좋은 글과 새 글을 섞는다.
- 같은 작가/같은 장르가 과도하게 반복되지 않도록 diversity rule을 둔다.

피드 랭킹 신호 후보:

- 좋아요, 저장, 댓글, 공유
- 읽기 완료율
- dwell time
- 빠른 스킵
- 작가 팔로우 여부
- 장르/태그 선호
- 차단/신고/관심 없음
- 오늘 주제 또는 릴레이 참여 여부

피드 이벤트 예시:

```json
{
  "surface": "immersive_feed",
  "post_id": "123",
  "event_type": "finish",
  "genre": "essay",
  "dwell_ms": 8400
}
```

성능 기준:

- 현재 글, 다음 글 2개, 이전 글 1개 정도만 메모리에 유지한다.
- 이미지가 있으면 다음 글 이미지를 미리 로드한다.
- 제스처 중 레이아웃 shift가 없어야 한다.
- 댓글 sheet를 열어도 현재 피드 위치가 보존되어야 한다.
- 피드 이벤트는 즉시 매 요청하지 않고 batch 또는 debounce 전송한다.

주의점:

- 짧은 소비 UX가 앱의 핵심 쓰기 경험을 잡아먹지 않게, 몰입 피드 곳곳에 `이 주제로 쓰기`, `나도 이어쓰기`, `비슷한 글 쓰기` CTA를 둔다.
- 무한 스크롤 피로를 줄이기 위해 하루 추천 제한, 읽은 글 숨김, 장르 전환을 제공한다.
- 민감한 글은 글쓴이의 공개 범위와 댓글 작성자 범위를 반드시 우선 적용한다.

### 3.4 홈/상세 피드 고도화 전략

현재 홈처럼 카드 목록이 바로 보이는 구조는 정보는 빠르게 보여주지만, 앱의 첫인상이 평범한 게시판처럼 느껴질 수 있다. 다음 단계 홈은 `글 목록`보다 `읽기 경험`을 먼저 보여주는 구조가 더 적합하다.

목표:

- 홈 진입 즉시 글숲만의 몰입형 읽기 경험을 보여준다.
- 사용자는 장르/분위기를 바꾸며 한 편씩 넘겨 읽는다.
- 글 상세에서도 아래로 슬라이드하면 다음 추천 글로 자연스럽게 이어진다.
- 목록 피드는 보조 탐색 모드로 남기고, 기본 경험은 세로 피드로 전환한다.

#### 3.4.1 홈 기본 구조 변경

기존:

1. 헤더
2. 카테고리 chip
3. `FeedCard` 목록

개편:

1. 상단 오버레이: 로고, 검색, 알림
2. 장르/분위기 rail: `추천`, `시`, `에세이`, `짧은글`, `위로`, `새벽`, `릴레이`
3. 중앙: 한 화면 한 글 몰입 카드
4. 우측 또는 하단 액션: 공감, 댓글, 저장, 공유, 더보기
5. 하단 메타: 제목, 작가, 장르, 읽기 시간, `전체 읽기`

홈은 `/feed/immersive`로 이동하는 버튼을 보여주는 방식이 아니라, 기본 탭 화면 자체가 몰입형 피드가 되는 것이 목표다. 다만 초기 전환 리스크를 줄이기 위해 `목록 보기` 토글을 유지한다.

권장 홈 모드:

| 모드 | 용도 |
| --- | --- |
| `immersive` | 기본. 숏츠/릴스처럼 한 글씩 넘겨 읽기 |
| `list` | 보조. 기존 카드 목록으로 빠르게 훑기 |
| `following` | 팔로잉 작가 중심 몰입 피드 |
| `topic` | 오늘 주제 참여 글 몰입 피드 |

첫 진입 UX:

- 앱 첫 화면에는 글 카드 목록 대신 첫 번째 추천 글이 크게 보인다.
- 상단 장르 rail은 반투명/고정 overlay로 둔다.
- 사용자가 아래로 넘기면 다음 글로 이동한다.
- 사용자가 위로 넘기면 이전 글로 돌아간다.
- 현재 글을 길게 읽고 싶으면 `전체 읽기` 또는 본문 탭으로 상세 reader를 연다.

#### 3.4.2 몰입 홈 피드 화면 설계

한 페이지 구성:

| 영역 | 내용 | 비고 |
| --- | --- | --- |
| 상단 overlay | 로고, 검색, 알림, 장르 chip | 스크롤 중에도 유지 |
| 본문 중심 | 렌더 이미지 또는 텍스트 preview | 한 화면 안에서 읽히는 밀도 |
| 우측 액션 rail | 공감, 댓글, 저장, 공유, 더보기 | 모바일 엄지 동선 기준 |
| 하단 메타 | 제목, 작가, 공개 범위, 장르 | 2줄 이하 |
| 하단 CTA | 전체 읽기, 이 주제로 쓰기, 이어쓰기 | 글 종류에 따라 다르게 |

권장 인터랙션:

- 세로 스와이프: 다음/이전 글
- 탭: 액션 rail 또는 전체 읽기
- 길게 누르기: 관심 없음/신고/차단 quick menu
- 댓글 버튼: full-screen 이동이 아니라 bottom sheet
- 작가명: 작가 프로필로 이동
- 장르 chip: 해당 장르 피드로 즉시 전환

글 표시 방식:

- 짧은 글: 본문 전체를 한 화면에 표시
- 긴 글: 제목 + 첫 문단 + `전체 읽기`
- 렌더 이미지가 있는 글: 이미지 우선 표시
- 릴레이 소설: 현재 회차/다음 이어쓰기 가능 여부 표시
- 오늘 주제 글: 주제 badge와 `나도 쓰기` CTA 표시

#### 3.4.3 글 상세의 아래 슬라이드 연속 읽기

글 상세는 단일 글을 읽고 끝나는 화면이 아니라, `현재 글 + 다음 추천 글 큐`를 가진 reader feed로 바꾼다.

개념:

- `/posts/[id]`는 여전히 직접 접근 가능한 상세 화면이다.
- 피드에서 들어온 경우 상세 화면은 `source`, `genre`, `cursor`를 받아 다음 글 큐를 함께 준비한다.
- 사용자가 현재 글을 다 읽고 아래로 더 당기면 다음 추천 글이 이어진다.
- 다음 글로 넘어가도 URL/상태는 현재 post id에 맞게 갱신한다.

상세 reader 구조:

| 위치 | 내용 |
| --- | --- |
| 현재 page | 글 전체 본문, 댓글 요약, 관련 액션 |
| page 하단 | `아래로 넘겨 다음 글 읽기` 힌트 |
| 다음 page | 추천 글 상세 |
| 댓글 | 현재 page 안에 inline, 또는 버튼 클릭 시 sheet |

스크롤 정책:

- 글 본문이 짧으면 한 화면 단위 paging으로 다음 글 이동
- 글 본문이 길면 먼저 현재 글 내부를 스크롤
- 현재 글의 끝에 도달한 뒤 한 번 더 아래로 당기면 다음 글로 이동
- 댓글을 열었을 때는 피드 paging을 잠시 잠근다.
- 뒤로가기는 상세 진입 전 화면으로 돌아가되, 현재 큐 위치는 가능하면 유지한다.

라우트/상태 후보:

- `/posts/[id]?source=home_immersive&genre=poem&cursor=...`
- `/posts/[id]?source=topic&topicId=...`
- `/posts/[id]?source=author&authorId=...`
- 내부 상태: `readerQueue`, `currentIndex`, `nextCursor`, `sourceContext`

모바일 컴포넌트 후보:

- `ImmersiveHomeFeed`
- `ImmersiveFeedPage`
- `FeedActionRail`
- `FeedGenreRail`
- `ReaderFeedScreen`
- `ReaderPostPage`
- `NextPostHint`
- `CommentBottomSheet`

#### 3.4.4 서버/API 전략

홈 몰입 피드와 상세 연속 읽기는 같은 추천 큐를 공유해야 한다.

API 후보:

- `GET /api/feed/immersive`
  - 홈 몰입 피드용
  - 쿼리: `genre`, `mood`, `type`, `cursor`, `limit`
- `GET /api/posts/:id/reader-next`
  - 상세에서 아래로 넘길 다음 글 큐
  - 쿼리: `source`, `genre`, `topic_id`, `author_id`, `cursor`
- `POST /api/feed-events`
  - `view`, `finish`, `skip`, `open_detail`, `open_comments`, `like`, `bookmark`, `share`, `not_interested`
- `POST /api/me/feed-preferences`
  - 장르/분위기 선호 저장

추천 큐 응답 예시:

```json
{
  "ok": true,
  "items": [
    {
      "id": "123",
      "title": "제목",
      "preview": "첫 문단...",
      "render_images": {},
      "category": "essay",
      "visibility": "public",
      "comment_policy": "logged_in",
      "reason": "위로 장르에서 반응이 좋아요"
    }
  ],
  "cursor": "next_cursor",
  "has_more": true
}
```

랭킹 우선순위:

1. 공개 범위상 볼 수 있는 글만 포함
2. 차단/신고/관심 없음 제외
3. 선택 장르/분위기 일치
4. 최근 반응이 좋은 글
5. 사용자가 아직 보지 않은 글
6. 같은 작가/같은 장르 반복 제한
7. 오늘 주제/릴레이/챌린지 참여 글 가중치

#### 3.4.5 구현 단계

1단계: 홈 기본을 몰입 피드로 전환

- 현재 `/feed/immersive` MVP를 홈 탭 기본 화면으로 승격
- 기존 목록 피드는 `목록 보기` 토글 또는 보조 화면으로 이동
- 장르 rail을 full-screen overlay로 배치
- 피드 액션 rail 추가

2단계: 글 상세 연속 읽기

- `PostDetail`을 단일 상세에서 `ReaderFeedScreen` 구조로 분리
- 첫 page는 현재 글
- 다음 page는 `/api/posts/:id/reader-next` 큐에서 로드
- 현재 index 변경 시 feed event 기록

3단계: 댓글 sheet와 액션 통합

- 몰입 피드의 댓글 버튼은 bottom sheet로 표시
- 상세 reader에서도 댓글 영역을 sheet/inline 둘 다 지원
- 댓글 권한 정책을 sheet 진입 전에도 표시

4단계: 추천 이벤트 기반 개선

- `view`, `skip`, `finish`, `open_detail`, `not_interested` 기록
- 서버에서 사용자별 장르 weight 반영
- 읽은 글 숨김 또는 낮은 순위 처리

#### 3.4.6 리스크와 기준

리스크:

- 긴 글과 세로 paging이 충돌할 수 있다.
- 숏츠형 UX가 글쓰기 앱의 깊이를 얕게 보이게 만들 수 있다.
- 피드 이벤트를 과하게 수집하면 개인정보/고지 이슈가 생긴다.
- 댓글 sheet와 vertical pager가 제스처 충돌을 일으킬 수 있다.

완료 기준:

- 홈 첫 화면에서 카드 목록이 아니라 한 글 중심 몰입 화면이 보인다.
- 장르를 바꾸면 다음 추천 큐가 즉시 달라진다.
- 글 상세에서 아래로 슬라이드해 다음 글로 이어 읽을 수 있다.
- 댓글/공감/저장/공유는 피드 안에서 바로 가능하다.
- 공개 범위와 댓글 작성자 범위 제한이 홈/상세/댓글 sheet 전체에서 일관되게 적용된다.

---

## 4. 발견 화면 확장

### 4.1 검색을 발견 화면으로 확장

현재 검색 화면은 검색어 입력 후 결과 확인에 가깝다. 빈 검색 상태를 풍부한 발견 화면으로 바꾸면 앱 화면이 바로 다채로워진다.

추가 섹션:

- 인기 태그
- 새로 뜨는 주제
- 추천 작가
- 많이 저장된 글
- 챌린지 참여 글
- 랜덤으로 읽기

서버 후보:

- `GET /api/discovery`
- `GET /api/tags/trending`
- `GET /api/users/recommended`
- `GET /api/posts/featured`

신규 화면 후보:

- `/tags/[slug]`: 태그 상세
- `/explore`: 발견 홈. 검색 화면과 합칠 수도 있음
- `/featured`: 운영 추천 글 모음

### 4.2 태그/주제 채널

태그를 단순 메타데이터가 아니라 하나의 목적지로 만든다.

기능:

- 태그 팔로우
- 태그별 최신/인기/추천 글
- 태그 설명과 대표 글
- 팔로우한 태그 기반 홈 섹션

서버 후보:

- `tags`
- `tag_follows`
- `tag_stats`
- `GET /api/tags/:slug`
- `GET /api/tags/:slug/posts`
- `POST /api/tags/:slug/follow`
- `DELETE /api/tags/:slug/follow`

---

## 5. 글쓰기 경험 확장

### 5.1 글감/템플릿

글쓰기 진입 전에 “무엇을 쓸지”를 고를 수 있게 한다.

템플릿 후보:

- 3문장 기록
- 오늘의 감정
- 감사 기록
- 짧은 산문
- 질문에 답하기
- 비공개 일기
- 팔로워에게만 공개하는 편지

화면 변화:

- 글쓰기 시작 화면 또는 bottom sheet
- 템플릿 선택 시 제목 placeholder, 본문 placeholder, 기본 공개 범위 자동 설정
- 예: `비공개 일기` 템플릿은 `visibility=private`, `comment_policy=closed`

서버 후보:

- `writing_templates`
- `daily_prompts`
- `prompt_submissions`
- `GET /api/writing/templates`
- `GET /api/prompts/today`

### 5.2 데일리 챌린지

글쓰기와 성장 탭을 강하게 연결한다.

기능:

- 오늘의 글감 참여
- 주간 주제 챌린지
- 챌린지 참여 글 모아보기
- 참여 보상 XP
- 챌린지별 공개 범위 기본값

서버 후보:

- `challenges`
- `challenge_posts`
- `user_challenge_progress`
- `GET /api/challenges/active`
- `POST /api/challenges/:id/join`
- `POST /api/challenges/:id/posts`

신규 화면 후보:

- `/prompts/today`
- `/challenges/[id]`
- `/challenges/[id]/posts`

### 5.3 매일 새로운 주제 제공 글쓰기

매일 앱이 새로운 글쓰기 주제를 제공하고, 사용자는 그 주제로 바로 글을 쓸 수 있게 한다. 홈, 글쓰기, 성장 탭을 연결하는 가장 직접적인 참여 기능이다.

사용자 흐름:

1. 홈 상단에서 오늘의 주제를 본다.
2. `이 주제로 쓰기`를 누른다.
3. 글쓰기 화면에 주제, 안내 문장, 추천 태그가 자동 적용된다.
4. 공개 범위와 댓글 작성자 범위를 선택한다.
5. 발행 후 오늘 주제 참여 글 모음에 노출된다.

주제 화면 구성:

- 오늘의 주제 카드
- 짧은 예시 질문 2-3개
- 추천 태그
- 참여자 수
- 오늘 주제로 올라온 글
- 어제/이번 주 인기 주제

서버 모델 후보:

- `daily_topics`
  - `id`
  - `title`
  - `description`
  - `guide_questions`
  - `recommended_tags`
  - `date_key`
  - `status`: `scheduled`, `active`, `archived`
  - `default_visibility`
  - `default_comment_policy`
- `daily_topic_posts`
  - `topic_id`
  - `post_id`
  - `user_id`
  - `created_at`

서버 API 후보:

- `GET /api/topics/today`
- `GET /api/topics/:dateKey`
- `GET /api/topics/:id/posts`
- `POST /api/topics/:id/posts`
- `GET /api/topics/archive`

모바일 화면/컴포넌트 후보:

- `HomeTodayTopicCard`
- `/topics/today`
- `/topics/[dateKey]`
- `WriteTopicBanner`
- `TopicPostsRail`

권장 정책:

- 오늘 주제 참여 글도 사용자가 `visibility`와 `comment_policy`를 직접 선택한다.
- `private` 글은 주제 참여 카운트에는 포함할 수 있지만 공개 참여 글 목록에는 노출하지 않는다.
- `unlisted` 글은 직접 링크 접근은 가능하지만 오늘 주제 공개 목록에는 넣지 않는다.
- 주제는 서버에서 운영자가 미리 예약하고, 없는 날에는 fallback 주제를 제공한다.

### 5.4 릴레이 소설 쓰기

릴레이 소설은 여러 사용자가 한 편의 이야기를 이어 쓰는 협업 글쓰기 기능이다. 글숲에 새 화면을 만들면서도 커뮤니티 참여감을 크게 높일 수 있다.

기본 컨셉:

- 한 사용자가 릴레이 소설을 시작한다.
- 다른 사용자가 다음 문단 또는 다음 회차를 이어 쓴다.
- 소유자는 참여 방식, 공개 범위, 댓글 작성자 범위를 정한다.
- 완성된 릴레이 소설은 하나의 작품처럼 읽을 수 있다.

참여 방식 옵션:

| 값 | 화면 표시 | 설명 |
| --- | --- | --- |
| `open` | 누구나 이어쓰기 | 열람 가능한 사용자는 누구나 다음 조각 작성 가능 |
| `followers` | 팔로워만 이어쓰기 | 시작자를 팔로우한 사용자만 참여 |
| `invite_only` | 초대받은 사람만 | 시작자가 지정한 사용자만 참여 |
| `approval` | 승인 후 반영 | 누구나 제출 가능하지만 시작자 승인 후 공개 |

릴레이 상태:

| 값 | 설명 |
| --- | --- |
| `draft` | 시작자가 준비 중 |
| `open` | 이어쓰기 가능 |
| `locked` | 누군가 작성 중이어서 임시 잠금 |
| `completed` | 완결 |
| `archived` | 보관/종료 |

모바일 화면:

- 릴레이 홈: 이어쓰기 모집 중, 인기 릴레이, 내가 참여한 릴레이
- 릴레이 상세: 제목, 소개, 참여 규칙, 이어진 조각 목록
- 이어쓰기 화면: 이전 문단 고정 표시 + 새 조각 작성
- 참여자 목록: 작성 순서, 기여 횟수, 최근 참여자
- 릴레이 관리: 공개 범위, 참여 방식, 댓글 권한, 완결 처리

서버 모델 후보:

- `relay_stories`
  - `id`
  - `owner_user_id`
  - `title`
  - `synopsis`
  - `status`
  - `visibility`
  - `comment_policy`
  - `participation_policy`
  - `max_segment_length`
  - `current_turn_user_id`
  - `turn_expires_at`
  - `created_from_topic_id`
- `relay_story_segments`
  - `id`
  - `relay_story_id`
  - `author_user_id`
  - `sequence`
  - `content`
  - `status`: `active`, `pending`, `hidden`, `deleted`
  - `created_at`
- `relay_story_participants`
  - `relay_story_id`
  - `user_id`
  - `role`: `owner`, `writer`, `invited`
  - `status`: `active`, `invited`, `blocked`

서버 API 후보:

- `GET /api/relay-stories`
- `POST /api/relay-stories`
- `GET /api/relay-stories/:id`
- `PATCH /api/relay-stories/:id`
- `POST /api/relay-stories/:id/join`
- `POST /api/relay-stories/:id/segments`
- `PATCH /api/relay-stories/:id/segments/:segmentId`
- `POST /api/relay-stories/:id/complete`

권장 정책:

- 릴레이 소설도 일반 글과 동일하게 `visibility`, `comment_policy`를 가진다.
- 이어쓰기 참여 권한은 `participation_policy`로 분리한다.
- 작성 중 충돌을 막기 위해 짧은 turn lock 또는 draft lease를 둔다.
- `approval` 모드에서는 제출 조각이 `pending` 상태가 되고, 소유자가 승인해야 공개된다.
- 차단 관계가 있으면 열람/참여/댓글 권한보다 차단 정책을 우선한다.

---

## 6. 글 상세 화면 확장

### 6.1 관련 글 / 다음 읽을 글

글 상세 하단에 다음 행동을 제공한다.

후보:

- 같은 태그 글
- 같은 작가의 다른 글
- 같은 챌린지 참여 글
- 같은 시리즈의 이전/다음 글
- 저장한 독자가 함께 저장한 글

서버 후보:

- `GET /api/posts/:id/related`
- `GET /api/posts/:id/next`

### 6.2 댓글 관리 강화

글쓴이가 댓글 흐름을 관리할 수 있게 한다.

기능:

- 댓글 권한 변경
- 댓글 고정
- 댓글 숨김
- 특정 사용자 댓글 제한
- 댓글 승인제

초기에는 `comment_policy`와 `closed`만 먼저 도입하고, 숨김/승인은 후순위로 둔다.

서버 후보:

- `comment_status`: `active`, `hidden`, `deleted`, `pending`
- `comment_pins`
- `comment_moderation_actions`

---

## 7. 알림함

### 7.1 필요한 이유

앱이 풍부하게 느껴지려면 사용자의 행동에 대한 반응이 돌아와야 한다. 알림함은 댓글, 좋아요, 팔로우, 챌린지, 성장 보상을 하나로 묶는 핵심 화면이다.

알림 종류:

- 내 글에 좋아요
- 내 글에 댓글/답글
- 새 팔로워
- 팔로우한 작가의 새 글
- 챌린지 시작/마감
- 퀘스트 완료
- 공개 범위 제한 글 접근 요청. 후속 기능

서버 후보:

- `notifications`
- `notification_settings`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`

모바일 화면:

- 홈 헤더 알림 아이콘
- `/notifications`
- 알림 상세에서 글/작가/챌린지로 이동

---

## 8. 작가/프로필 화면 확장

### 8.1 작가 페이지를 더 입체적으로 만들기

현재 작가 페이지는 프로필과 글 목록 중심이다. 아래 섹션을 추가하면 탐색성이 좋아진다.

후보:

- 대표 글
- 시리즈
- 자주 쓰는 태그
- 참여 중인 챌린지
- 공개 컬렉션
- 팔로워에게만 공개된 글 안내

서버 후보:

- `GET /api/users/:id/profile-summary`
- `GET /api/users/:id/series`
- `GET /api/users/:id/tags`
- `GET /api/users/:id/collections`

### 8.2 내 프로필 꾸미기와 성장 연결

이미 `ProfileCustomize`와 cosmetics 계열 코드가 있으므로 성장 보상과 묶기 좋다.

후보:

- 레벨별 프로필 배경
- 챌린지 배지
- 공개 프로필 칭호
- 대표 컬렉션 고정

---

## 9. 북마크를 서재로 확장

### 9.1 내 서재

북마크 폴더 기능을 읽기 경험으로 확장한다.

기능:

- 읽음/안 읽음
- 폴더 커버 색상
- 저장 메모
- 최근 저장한 글 이어보기
- 공개 컬렉션 전환

서버 후보:

- `bookmark_items.read_at`
- `bookmark_items.note`
- `bookmark_lists.cover_color`
- `bookmark_lists.visibility`

### 9.2 공개 컬렉션

사용자가 저장한 글 묶음을 다른 사람에게 보여줄 수 있게 한다.

예시:

- 내가 모은 위로 글
- 밤에 읽기 좋은 글
- 짧은 산문 모음

서버 후보:

- `collection_likes`
- `collection_follows`
- `GET /api/collections/featured`
- `GET /api/users/:id/collections`

---

## 10. 추천 우선순위

### P0-1. 웹 댓글 UI 모바일 적용

목표: 웹에서 사용하는 댓글 UI 형식과 기능을 모바일 글 상세에도 맞춘다.

포함:

- 댓글 패널 헤더와 count
- 1000자 composer와 전송 버튼
- 답글 대상 바
- 스레드/답글 들여쓰기
- 댓글 공감 count와 selected 상태
- 댓글 삭제 후 `삭제된 댓글입니다.` 상태
- 로그인/권한 없음/댓글 닫힘 상태

완료 기준:

- 모바일 댓글 UI가 웹 댓글 UI와 같은 정보 구조를 가진다.
- 댓글 공감 API가 모바일에서도 동작한다.
- `comment_policy`에 따라 composer가 즉시 상태를 바꾼다.
- 댓글/답글/공감/삭제 E2E가 추가된다.

### P0-2. 권한형 게시 기반

목표: 사용자가 글마다 공개 범위와 댓글 권한을 설정할 수 있게 한다.

포함:

- `posts.visibility`
- `posts.comment_policy`
- 글쓰기 설정 UI
- 글 상세 권한 안내
- 댓글 작성 권한 체크
- 홈/검색/작가 페이지에서 비공개 글 제외

완료 기준:

- 전체 공개 글은 기존처럼 노출된다.
- 팔로워 공개 글은 팔로워만 열람 가능하다.
- 링크 공개 글은 피드/검색에 나오지 않는다.
- 나만 보기 글은 본인만 열람 가능하다.
- 댓글 권한에 따라 composer 상태가 바뀐다.

### P1. 몰입형 홈 + 상세 연속 읽기 + 매일 주제 글쓰기

목표: 앱 첫 화면을 카드 목록에서 한 글 중심 몰입 피드로 바꾸고, 글 상세에서도 아래로 슬라이드해 다음 글을 계속 읽는 구조로 전환한다.

포함:

- 홈 기본 화면을 `immersive` 모드로 전환
- 오늘의 주제/글감 카드
- 장르/분위기 chip rail
- 세부 필터: 길이, 인기, 최신, 참여 가능
- 숏츠/릴스형 한 화면 한 글 피드
- 글 상세 reader queue
- 아래로 슬라이드해 다음 글 읽기
- 댓글 bottom sheet
- 빠른 액션
- 인기 태그/추천 주제
- 오늘 주제로 쓰기
- 오늘 주제 참여 글
- 기존 피드와 자연스럽게 연결

완료 기준:

- 홈 첫 화면에서 카드 목록이 아니라 몰입형 글 화면이 보인다.
- 글쓰기 진입이 기존보다 명확해진다.
- 사용자가 선택한 장르/분위기가 홈 피드에 반영된다.
- 몰입 피드에서 위/아래 스와이프로 글을 넘길 수 있다.
- 글 상세에서 아래로 슬라이드해 다음 추천 글을 이어 읽을 수 있다.
- 댓글은 현재 피드/상세 흐름을 깨지 않는 sheet 또는 inline UI로 열린다.
- 오늘 주제를 선택하면 글쓰기 화면에 주제 맥락이 전달된다.
- 추천 피드는 유지하되 화면 리듬이 단조롭지 않다.

### P2. 릴레이 소설 쓰기

목표: 여러 사용자가 이어 쓰는 협업 글쓰기 화면을 추가한다.

포함:

- 릴레이 홈
- 릴레이 상세
- 이어쓰기 composer
- 참여 방식 설정
- 릴레이 공개 범위/댓글 권한

완료 기준:

- 사용자가 릴레이 소설을 만들 수 있다.
- 다른 사용자가 권한에 따라 이어 쓰기에 참여할 수 있다.
- 릴레이 조각이 순서대로 읽힌다.
- 작성 중 충돌을 막는 잠금 또는 승인 흐름이 있다.

### P3. 발견/태그 채널

목표: 검색 화면을 탐색 화면으로 확장한다.

포함:

- 인기 태그
- 태그 상세
- 추천 작가
- 많이 저장된 글

완료 기준:

- 검색어가 없어도 볼 콘텐츠가 있다.
- 태그에서 글 목록으로 이동할 수 있다.
- 홈과 검색이 서로 다른 역할을 가진다.

### P4. 글감/챌린지

목표: 사용자가 쓸 이유를 만든다.

포함:

- 오늘의 글감/주제
- 글쓰기 템플릿
- 챌린지 상세
- 성장 XP 연결

완료 기준:

- 글쓰기 시작 전 템플릿을 선택할 수 있다.
- 챌린지 참여 글이 모인다.
- 성장 탭에서 챌린지 진행 상태가 보인다.

### P5. 알림함

목표: 반응과 재방문 루프를 만든다.

포함:

- 알림 목록
- 읽음 처리
- 댓글/좋아요/팔로우/챌린지 알림

완료 기준:

- 홈 헤더에서 알림 진입 가능
- 사용자가 새 반응을 확인할 수 있음
- 알림에서 관련 화면으로 이동 가능

---

## 11. 신규 화면 후보 목록

우선순위가 높은 화면:

| Route 후보 | 설명 |
| --- | --- |
| `/notifications` | 알림함 |
| `/tags/[slug]` | 태그/주제 상세 |
| `/prompts/today` | 오늘의 글감 상세 |
| `/topics/today` | 오늘의 주제 |
| `/topics/[dateKey]` | 날짜별 주제 상세 |
| `/feed/immersive` | 숏츠/릴스형 몰입 피드. 후속에서는 홈 기본 모드 |
| `/feed/preferences` | 관심 장르/분위기 설정 |
| `/posts/[id]?source=home_immersive` | 다음 글 큐를 가진 상세 reader |
| `/challenges/[id]` | 챌린지 상세 |
| `/relay-stories` | 릴레이 소설 홈 |
| `/relay-stories/[id]` | 릴레이 소설 상세 |
| `/relay-stories/[id]/write` | 릴레이 이어쓰기 |
| `/posts/[id]/settings` | 글 공개/댓글 설정 |

후순위 화면:

| Route 후보 | 설명 |
| --- | --- |
| `/explore` | 발견 홈. 검색 화면과 통합 가능 |
| `/series/[id]` | 시리즈 상세 |
| `/collections/[id]` | 공개 컬렉션 상세 |
| `/reading-history` | 읽기 기록 |

---

## 12. API 초안

### 게시글

- `POST /api/posts`
  - `visibility`
  - `comment_policy`
- `PUT /api/posts/:id`
  - `visibility`
  - `comment_policy`
- `PATCH /api/posts/:id/settings`
  - 공개 범위/댓글 권한만 수정
- `GET /api/posts/:id`
  - `viewer.can_read`
  - `viewer.can_comment`
  - `visibility`
  - `comment_policy`

### 댓글

- `POST /api/posts/:id/comments`
  - 서버에서 `comment_policy` 검사
- `GET /api/posts/:id/comments`
  - 읽기 권한이 있는 글에서만 가능
- `POST /api/comments/:id/toggle-like`
  - 댓글 공감 토글
- `DELETE /api/comments/:id`
  - 삭제 후 목록에는 `deleted` 상태로 반영

댓글 응답 추가 필드:

- `like_count`
- `liked_by_me`
- `viewer.can_reply`
- `viewer.can_like`
- `viewer.can_delete`

### 홈/발견

- `GET /api/home/summary`
- `GET /api/genres`
- `GET /api/me/feed-preferences`
- `PUT /api/me/feed-preferences`
- `GET /api/feed?genre=essay&mood=comfort&mode=list`
- `GET /api/feed/immersive?genre=poem&cursor=...`
- `GET /api/posts/:id/reader-next?source=home_immersive&genre=poem&cursor=...`
- `POST /api/feed-events`
- `GET /api/discovery`
- `GET /api/tags/trending`
- `GET /api/posts/featured`

### 글감/챌린지

- `GET /api/prompts/today`
- `GET /api/writing/templates`
- `GET /api/topics/today`
- `GET /api/topics/:dateKey`
- `GET /api/topics/:id/posts`
- `POST /api/topics/:id/posts`
- `GET /api/topics/archive`
- `GET /api/challenges/active`
- `GET /api/challenges/:id`
- `POST /api/challenges/:id/join`

### 릴레이 소설

- `GET /api/relay-stories`
- `POST /api/relay-stories`
- `GET /api/relay-stories/:id`
- `PATCH /api/relay-stories/:id`
- `POST /api/relay-stories/:id/join`
- `POST /api/relay-stories/:id/segments`
- `PATCH /api/relay-stories/:id/segments/:segmentId`
- `POST /api/relay-stories/:id/complete`

### 알림

- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`

---

## 13. 추천 구현 순서

1. 모바일 댓글 UI를 웹 `postCommentsPanel` 구조에 맞춰 개편
2. 모바일 댓글 모델에 `like_count`, `liked_by_me` 추가
3. 모바일 댓글 공감 API와 E2E 추가
4. 서버에 `visibility`, `comment_policy` 필드 추가
5. 게시글 목록/상세/검색/작가 글 목록의 공개 범위 필터 적용
6. 댓글 작성 API에 `comment_policy` 검사 추가
7. 모바일 글쓰기 화면에 공개/댓글 설정 UI 추가
8. 모바일 글 상세 댓글 composer 권한 상태 처리
9. 홈 기본 화면을 목록에서 몰입형 피드로 전환
10. 홈에 장르/분위기 overlay rail과 세부 필터 추가
11. 몰입형 피드 액션 rail과 댓글 bottom sheet 추가
12. 글 상세를 `ReaderFeedScreen` 구조로 분리
13. 상세 하단에서 아래로 슬라이드해 다음 글로 이동하는 reader queue 추가
14. `GET /api/posts/:id/reader-next` API 추가
15. 피드 선호/이벤트 API와 추천 큐 가중치 추가
16. 홈에 오늘의 주제/빠른 액션/인기 태그 섹션 추가
17. 오늘 주제 API와 주제 참여 글 목록 추가
18. 릴레이 소설 서버 모델과 모바일 기본 화면 추가
19. 검색 빈 상태를 발견 화면으로 개편
20. 알림함과 챌린지를 후속 연결

---

## 14. 열린 질문

- 웹 댓글 UI를 모바일에 1:1로 맞출 때 댓글 패널을 글 상세 본문 아래 고정 섹션으로 둘 것인가, 별도 bottom sheet 진입도 제공할 것인가?
- 비로그인 사용자가 `public` 글에 댓글을 달 수 있게 할 것인가, 아니면 `everyone`도 실제 작성은 로그인 필요로 볼 것인가?
- `followers` 공개 글을 팔로워가 공유했을 때, 비팔로워에게 어떤 화면을 보여줄 것인가?
- `private` 글도 성장 XP를 줄 것인가?
- `unlisted` 글은 태그 통계와 작가 글 개수에 포함할 것인가?
- 댓글 권한을 바꿀 때 기존 댓글은 계속 보여줄 것인가?
- 공개 범위별 기본값을 템플릿마다 다르게 둘 것인가?
- 홈 장르는 글쓴이가 직접 고른 값만 쓸 것인가, 서버가 태그/본문 기반으로 보조 분류할 것인가?
- 몰입 피드는 별도 하단 탭으로 둘 것인가, 홈 내부 진입으로 둘 것인가?
- 몰입 피드에서 댓글은 bottom sheet로만 열 것인가, 상세 화면으로 이동시킬 것인가?
- 빠른 스킵과 dwell time을 추천 신호로 저장할 때 사용자에게 어떤 설정/고지를 제공할 것인가?
- 매일 주제는 운영자가 직접 예약할 것인가, 자동 생성/추천 후보를 둘 것인가?
- 오늘 주제 참여 글 중 `private` 글을 XP와 참여 streak에 포함할 것인가?
- 릴레이 소설은 한 번에 한 명만 이어 쓰게 할 것인가, 여러 제출 후 소유자가 고르게 할 것인가?
- 릴레이 소설 조각의 최대 길이와 수정 가능 시간을 어떻게 둘 것인가?

---

## 15. 한 줄 결론

가장 먼저 할 일은 웹 댓글 UI를 모바일 상세에 맞추고, `글 공개 범위 + 댓글 작성자 범위 제한`을 게시글의 기본 설정으로 도입하는 것이다. 그 위에 매일 새로운 주제 제공 글쓰기와 릴레이 소설을 붙이면 앱 화면이 단순 피드 중심에서 참여, 협업, 발견이 있는 구조로 넓어진다.
