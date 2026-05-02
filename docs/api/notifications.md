# 알림 API 계약 v1

- 문서 타입: `API Spec`
- 적용 범위: 모바일 알림함, 홈 알림 점 배지, 거래성 푸시, 마케팅 푸시 동의
- 상태: `Review`
- 최종 업데이트: `2026-05-02`

## 범위

v1 알림은 `post_reaction`, `post_comment`, `comment_reply`, `new_follower`만 사용한다.

- `post_reaction`: 같은 글 기준으로 서버에서 묶어서 내려준다. 기기 푸시는 보내지 않는다.
- `post_comment`, `comment_reply`, `new_follower`: 개별 알림으로 저장하고, OS 권한이 허용되어 등록된 기기 토큰이 있는 경우에만 기기 푸시를 보낸다.
- 자기 자신의 행동과 차단 관계가 있는 사용자 이벤트는 생성/노출하지 않는다.

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
      "title": "3명이 내 글에 공감했어요.",
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

## 읽음 처리

```http
PATCH /api/notifications/:id/read
```

- 일반 알림: activity row 1건을 읽음 처리한다.
- `post_reaction:<post_id>`: 같은 글의 공감 알림 묶음을 읽음 처리한다.

앱은 알림 탭 시 optimistic read 처리 후 `target_path`로 이동한다. 실패 시 목록은 유지하고 토스트만 표시한다.

## 푸시 동작

- 홈 알림 버튼은 권한 요청을 띄우지 않고 항상 `/notifications`로 이동한다.
- 앱 내부 푸시 ON/OFF 설정은 제공하지 않는다. 사용자가 끄고 싶으면 OS 알림 설정에서 관리한다.
- 앱은 OS 권한이 이미 허용된 경우에만 Expo push token을 등록한다. 알림함에서 별도 권한 CTA를 표시하지 않는다.
- foreground push 수신 시 토스트를 띄우고 알림 unread summary를 갱신한다.

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
- 사용자는 `동의` / `철회`를 언제든 선택할 수 있다.
- 동의 철회는 거래성 알림에는 영향을 주지 않는다.

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
