# growth.md — 성장 / 업적 / 퀘스트 API (v1)

이 문서는 글숲 모바일 앱의 **성장 탭(레벨/XP/업적/퀘스트)** 관련 API 계약을 정의한다.

- Base URL: `/api`
- 공통 규칙: `docs/api/README.md` 참고
- 시간: ISO 8601 (UTC)
- 응답 필드: `snake_case` 기준

> Canonical 기준은 서버 `glsoop`의 현재 `dev` 동작이다.

---

## 1) 데이터 모델(요약)

### 1.1 GrowthSummary
```json
{
  "level": 6,
  "current_xp": 180,
  "next_level_xp": 250,
  "today_xp": 12,
  "weekly_posts": 3,
  "streak_days": 4,
  "max_streak_days": 14,
  "title": "푸른 가지"
}
```

### 1.2 Achievement
```json
{
  "id": 1,
  "code": "first_post",
  "name": "첫 글 작성",
  "description": "첫 글을 작성해보세요",
  "category": "growth",
  "status": "in_progress",
  "progress": 1,
  "target": 3,
  "unlocked_at": null,
  "position_index": 1,
  "icon": "🌱"
}
```

- `status`: `locked | in_progress | completed`

### 1.3 ActiveQuest
```json
{
  "id": 101,
  "state_id": 901,
  "name": "오늘 글 1개 작성",
  "description": "오늘 1개의 글을 게시하세요",
  "condition_type": "POST_COUNT_TOTAL",
  "category": null,
  "target": 1,
  "reward_xp": 20,
  "status": "in_progress",
  "progress": 0,
  "position_index": 1,
  "campaign_id": 11,
  "campaign_type": "daily",
  "template_kind": "normal",
  "code": "daily_write_once",
  "ui_json": null,
  "completed_at": null,
  "reward_claimed_at": null
}
```

### 1.4 Campaign
```json
{
  "id": 11,
  "name": "데일리 캠페인",
  "description": "매일 반복되는 퀘스트",
  "campaign_type": "daily",
  "start_at": "2026-02-09T00:00:00.000Z",
  "end_at": null,
  "quests": [/* ActiveQuest[] */]
}
```

---

## 2) 성장 대시보드 (권장 1순위)

### 2.1 GET `/growth/dashboard`
성장 탭 초기 로드에 필요한 요약/업적/활성퀘스트를 **단일 응답**으로 반환한다.

#### Auth
- 🔒 Private

#### Response (200)
```json
{
  "ok": true,
  "message": "성장 대시보드 정보를 불러왔습니다.",
  "summary": {
    /* GrowthSummary */
  },
  "achievements": [
    /* Achievement[] */
  ],
  "campaigns": [
    /* Campaign[] */
  ]
}
```

#### Response (500)
```json
{
  "ok": false,
  "message": "성장 대시보드 정보를 불러오지 못했습니다."
}
```

---

## 3) 하위호환 개별 API (fallback)

> 모바일은 기본적으로 `/growth/dashboard`를 먼저 호출하고, 실패 시 아래 API를 fallback으로 사용한다.

### 3.1 GET `/growth/summary`

#### Auth
- 🔒 Private

#### Response (200)
```json
{
  "ok": true,
  "message": "성장 요약 정보를 불러왔습니다.",
  "summary": {
    /* GrowthSummary */
  }
}
```

### 3.2 GET `/growth/achievements`

#### Auth
- 🔒 Private

#### Response (200)
```json
{
  "ok": true,
  "message": "업적 정보를 불러왔습니다.",
  "achievements": [
    /* Achievement[] */
  ]
}
```

### 3.3 GET `/quests/active`

#### Auth
- 🔒 Private

#### Response (200)
```json
{
  "ok": true,
  "message": "활성 퀘스트를 불러왔습니다.",
  "campaigns": [
    /* Campaign[] */
  ]
}
```

---

## 4) 퀘스트 보상 수령

### 4.1 POST `/quests/:stateId/claim`
완료된 퀘스트의 보상을 지급한다.

#### Auth
- 🔒 Private

#### Path Parameter
- `stateId` (number, required)

#### Response (200)
```json
{
  "ok": true,
  "reward_claimed_at": "2026-02-09T13:10:20.000Z",
  "gained_xp": 20,
  "new_xp": 200
}
```

#### Errors
- `400`: `올바르지 않은 stateId입니다.` / `아직 완료되지 않은 퀘스트입니다.`
- `404`: `퀘스트 상태를 찾을 수 없습니다.`
- `409`: `이미 보상을 받았습니다.`
- `500`: `보상 지급 중 오류가 발생했습니다.`

---

## 5) 모바일 매핑 가이드

### 5.1 snake_case -> 앱 내부 camelCase (권장)
- `current_xp` -> `currentXp`
- `next_level_xp` -> `nextLevelXp`
- `today_xp` -> `todayXp`
- `weekly_posts` -> `weeklyPosts`
- `streak_days` -> `streakDays`
- `max_streak_days` -> `maxStreakDays`
- `position_index` -> `positionIndex`
- `state_id` -> `stateId`
- `reward_xp` -> `rewardXp`
- `campaign_type` -> `campaignType`
- `template_kind` -> `templateKind`
- `ui_json` -> `uiJson`
- `completed_at` -> `completedAt`
- `reward_claimed_at` -> `rewardClaimedAt`

### 5.2 안전 기본값 (권장)
- 배열: `achievements`, `campaigns`, `campaign.quests` -> 기본 `[]`
- 숫자: XP/진행도/카운트 필드 -> 기본 `0`
- 문자열: `title`, `name`, `description`, `icon` -> 기본 빈 문자열 또는 UI 기본 텍스트
- nullable 시간값: `unlocked_at`, `completed_at`, `reward_claimed_at`, `end_at` -> `null` 허용

### 5.3 상태값 처리
- `status`는 `locked | in_progress | completed` 외 값이 오면 `locked`로 보정 권장
- `campaign_type`은 `daily | weekly | season | event | permanent` 기준으로 분기 권장

---

## 6) 구현 메모

- 성장 탭 초기 진입은 `/growth/dashboard` 1회 호출 기준으로 구현한다.
- fallback은 네트워크/서버 오류 시에만 사용한다.
- 현재 서버 canonical 응답에는 `top_posts` 필드가 없다.
  - `TopPostsList`는 별도 API 확정 전까지 임시 데이터 전략(예: 빈 상태/대체 데이터)을 명시적으로 처리해야 한다.

