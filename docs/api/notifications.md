# 알림 API 계약 v1

- 문서 타입: `API Spec`
- 적용 범위: 모바일 알림함, 홈 알림 점 배지, 거래성 푸시, 마케팅 푸시 동의
- 상태: `Review`
- 최종 업데이트: `2026-05-31`

## 범위

v1 알림은 아래 타입을 사용한다.

- `post_reaction`: 같은 글 기준으로 서버에서 묶어서 내려준다. 원본 공감 이벤트는 OS 권한이 허용되어 등록된 기기 토큰이 있는 경우에만 기기 푸시를 보낸다.
- `post_comment`, `comment_reply`, `new_follower`, `following_new_post`: 개별 알림으로 저장하고, OS 권한이 허용되어 등록된 기기 토큰이 있는 경우에만 기기 푸시를 보낸다.
- `admin_operational_alert`: 운영 공지/장애 안내 등 관리자성 알림이다.
- `marketing_campaign`: 별도 마케팅 푸시 동의가 있는 사용자에게만 생성/발송되는 광고성 캠페인 알림이다.
- 자기 자신의 행동과 차단 관계가 있는 사용자 이벤트는 생성/노출하지 않는다.
- `following_new_post`는 팔로잉한 작가가 `public` 또는 `followers` 공개 범위의 새 글을 발행했을 때 생성한다. `private`, `unlisted` 글은 대상에서 제외한다.

## 목록 조회

```http
GET /api/notifications?limit=30&offset=0
```

응답:

```json
{
  "ok": true,
  "notifications": [
    {
      "id": "post_reaction:123",
      "type": "post_reaction",
      "title": "3명이 내 글에 좋아요를 남겼어요.",
      "body": "\"글 제목\"",
      "created_at": "2026-05-02T00:00:00Z",
      "read_at": null,
      "target_path": "/posts/123",
      "post_id": 123,
      "comment_id": null,
      "user_id": 45,
      "actor_count": 3
    }
  ],
  "unread_count": 1,
  "has_more": false
}
```

앱은 서버의 `title`, `body`, `target_path`를 우선 사용하고, 타입별 아이콘만 클라이언트에서 매핑한다.

모바일 타입 매핑:

| 서버 `type` | 모바일 아이콘 | 기본 이동 |
| --- | --- | --- |
| `post_reaction` | heart | `target_path` 또는 `/posts/:postId` |
| `post_comment` | chatbubble | `target_path` 또는 `/posts/:postId` |
| `comment_reply` | return arrow | `target_path` 또는 `/posts/:postId` |
| `following_new_post` | newspaper | `target_path` 또는 `/posts/:postId` |
| `new_follower` | person add | `target_path` 또는 `/users/:userId` |
| `admin_operational_alert` | alert | `target_path` 또는 `/notifications` |
| `marketing_campaign` | leaf | `target_path` 또는 `/notifications` |

`target_path`는 앱 내부 경로(`/posts/123`, `/users/45`, `/notifications`, `/write` 등)만 허용한다. 모바일은 외부 URL, `//`로 시작하는 값, auth group 경로를 직접 열지 않는다.

## 읽음 처리

```http
PATCH /api/notifications/:id/read
```

- 일반 알림: activity row 1건을 읽음 처리한다.
- `post_reaction:<post_id>`: 같은 글의 좋아요 알림 묶음을 읽음 처리한다.

앱은 알림 탭 시 optimistic read 처리 후 `target_path`로 이동한다. 실패 시 목록은 유지하고 토스트만 표시한다.

현재 모바일에는 전체 읽음 처리 API 호출이 없다. `PATCH /api/notifications/read-all`이 필요하면 별도 계약으로 추가한다.

## 푸시 동작

- 홈 알림 버튼은 권한 요청을 띄우지 않고 항상 `/notifications`로 이동한다.
- 거래성 푸시는 OS 권한과 등록된 Expo push token이 있을 때만 발송된다.
- 앱은 OS 권한을 요청할 수 있는 화면에서만 권한을 요청한다. 알림함 진입만으로 권한 요청을 띄우지 않는다.
- foreground push 수신 시 토스트를 띄우고 알림 unread summary를 갱신한다.

## Push token 등록

```http
POST /api/push-tokens
DELETE /api/push-tokens?token=...
```

등록 요청:

```json
{
  "token": "ExponentPushToken[...]",
  "platform": "ios",
  "device_id": "device-...",
  "app_version": "1.0.8"
}
```

모바일 동작:

- `expo-notifications`로 권한을 확인/요청한다.
- `ios/android`에서만 동작한다.
- Expo `projectId`가 없으면 서버 등록을 건너뛰고 사용자에게 설정 저장 결과만 안내한다.
- 새 토큰이 발급되면 이전 저장 토큰은 best-effort로 해제한다.

## 마케팅 푸시 수신 동의

거래성 알림에 마케팅/유입용 푸시를 섞지 않는다. 앱은 별도 명시 동의와 철회 경로를 제공한다.

```http
GET /api/marketing-push-consent
PATCH /api/marketing-push-consent
```

PATCH 요청:

```json
{
  "marketing_push_opt_in": true,
  "marketing_version": "2026-02-27.marketing.v1"
}
```

응답:

```json
{
  "ok": true,
  "consent": {
    "marketing_push_opt_in": true,
    "marketing_version": "2026-02-27.marketing.v1",
    "updated_at": "2026-05-02T00:00:00.000Z"
  }
}
```

모바일 동작:

- 경로: `계정센터 > 보안 및 로그인 > 광고성 마케팅 알림`
- 로그인 직후 선호 설정 prompt에서도 `로그인 유지`와 함께 최초 선택할 수 있다.
- 사용자는 `동의` / `철회`를 언제든 선택할 수 있다.
- 동의 철회는 거래성 알림에는 영향을 주지 않는다.
- 동의를 선택하면 모바일은 OS push 권한도 함께 요청하고, 성공 시 push token을 서버에 등록한다.

## 마케팅 푸시 캠페인

```http
POST /api/admin/marketing-push-campaigns
```

관리자 전용이다. 서버는 `marketing_push_opt_in = true`이고 활성 push token이 있는 사용자에게만 큐를 만든다. 제목에 `(광고)`가 없으면 서버가 자동으로 붙인다.

요청:

```json
{
  "title": "이번 주 글쓰기 리마인드",
  "body": "조용히 남겨둘 문장을 한 편 써보세요.",
  "target_path": "/write",
  "dry_run": false
}
```

응답:

```json
{
  "ok": true,
  "campaign_id": 12,
  "queued_count": 42,
  "eligible_user_count": 40
}
```
