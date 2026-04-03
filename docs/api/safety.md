# 신고 / 차단 / UGC 안전 API (v2)

- 문서 타입: `API Spec`
- 적용 범위: `glsoop-mobile/docs/api/safety.md`
- 대상 독자: 서버/모바일 개발자, QA, 운영 담당자
- 상태: `Draft`
- 최종 업데이트: `2026-04-03`
- Owner: `taehun`
- 관련 문서:
  - `docs/api/README.md`
  - `docs/api/posts.md`
  - `docs/api/users.md`
  - `docs/release/mobile-launch-plan.md`

---

## 1. 목적

이 문서는 모바일 앱이 현재 서버 안전 기능 계약을 정확히 따르도록 기준을 정리한다.

핵심 정책:

1. `차단(block)`은 개인 기능이다.
2. `신고(report)`는 운영 검토 큐 접수 기능이다.
3. 차단 시 더 이상 `safety_reports`에 `source='block'` 신규 레코드를 만들지 않는다.
4. 모바일은 서버 응답을 SSOT로 삼고, optimistic UI를 쓰더라도 최종 상태는 서버 응답으로 맞춘다.

---

## 2. 공통 원칙

- 모든 안전 기능 API는 로그인 필요(`Private`)다.
- 요청/응답은 `snake_case` JSON을 사용한다.
- 신고 사유와 상세 입력 정책은 서버 validator를 그대로 따른다.
- 모바일은 runtime config의 `safety.report_reasons`, `report_detail_max_length`, `report_detail_required_reason_codes`를 우선 사용한다.

---

## 3. 신고 사유 코드

서버와 앱은 아래 7개 사유를 공통 사용한다.

| code | 의미 |
|---|---|
| `harassment` | 괴롭힘/비방 |
| `hate` | 혐오/차별 |
| `sexual` | 선정성/음란성 |
| `violence` | 폭력성/자해/위협 |
| `spam` | 광고/스팸 |
| `impersonation` | 사칭/도용 |
| `other` | 기타 |

상세 입력 정책:

- 기본 사유 6개는 선택만으로 제출 가능하다.
- `other`를 선택했을 때만 `detail` 입력을 노출한다.
- `other + empty detail`은 `400`이다.
- `other`일 때 `detail`은 `1~200자`여야 한다.
- `other`가 아니면 `detail`은 보내도 저장되지 않는다.

---

## 4. Runtime Config

### GET `/api/runtime-config`

모바일은 아래 safety 설정을 읽어 UI를 그린다.

```json
{
  "ok": true,
  "safety": {
    "report_enabled": true,
    "block_enabled": true,
    "moderation_sla_hours": 24,
    "report_detail_max_length": 200,
    "report_detail_required_reason_codes": ["other"],
    "report_reasons": [
      { "code": "harassment", "label": "괴롭힘/비방", "target_types": ["post", "user"] },
      { "code": "hate", "label": "혐오/차별", "target_types": ["post", "user"] },
      { "code": "sexual", "label": "선정성/음란성", "target_types": ["post", "user"] },
      { "code": "violence", "label": "폭력성/자해/위협", "target_types": ["post", "user"] },
      { "code": "spam", "label": "광고/스팸", "target_types": ["post", "user"] },
      { "code": "impersonation", "label": "사칭/도용", "target_types": ["post", "user"] },
      { "code": "other", "label": "기타", "target_types": ["post", "user"] }
    ]
  }
}
```

---

## 5. 게시글 신고

### POST `/api/posts/:postId/report`

특정 게시글을 운영 검토 큐에 접수한다.

#### 요청 본문 예시

`other`가 아닌 경우:

```json
{
  "reason_code": "spam"
}
```

`other`인 경우:

```json
{
  "reason_code": "other",
  "detail": "반복적인 광고성 문구가 계속 올라옵니다."
}
```

#### 응답(200)

```json
{
  "ok": true,
  "message": "게시글 신고가 운영 검토 큐에 접수되었어요."
}
```

#### 실패 예시

- `reason_code`가 허용 목록 밖이면 `400`
- `reason_code='other'`인데 `detail`이 비어 있으면 `400`

---

## 6. 사용자 신고

### POST `/api/users/:userId/report`

특정 사용자를 운영 검토 큐에 접수한다.

#### 요청 본문 예시

```json
{
  "reason_code": "other",
  "detail": "여러 글에서 반복적으로 부적절한 표현을 사용합니다.",
  "context_post_id": 77
}
```

#### 응답(200)

```json
{
  "ok": true,
  "message": "신고가 운영 검토 큐에 접수되었어요."
}
```

비고:

- `context_post_id`는 선택이다.
- 모바일은 사용자 신고에서도 동일한 `other/detail` 정책을 적용한다.

---

## 7. 사용자 차단 / 해제

### POST `/api/users/:userId/block`

특정 사용자를 개인 차단한다.

#### 요청 본문 예시

```json
{
  "reason_code": "harassment",
  "context_post_id": 77
}
```

#### 응답(200)

```json
{
  "ok": true,
  "message": "사용자를 차단했어요. 이제 내 화면에서 이 사용자의 글과 프로필이 숨겨집니다.",
  "blocked_user_id": 88,
  "hidden_post_count": 3,
  "report_id": null,
  "already_blocked": false
}
```

비고:

- `report_id`는 하위호환용 필드이며 항상 `null`로 해석한다.
- 차단은 운영 신고를 자동 생성하지 않는다.

### DELETE `/api/users/:userId/block`

특정 사용자 차단을 해제한다.

#### 응답(200)

```json
{
  "ok": true,
  "message": "사용자 차단을 해제했어요.",
  "removed": true
}
```

### GET `/api/me/blocks`

내 차단 목록을 조회한다.

#### 응답(200)

```json
{
  "ok": true,
  "message": "차단 목록을 불러왔습니다.",
  "blocks": [
    {
      "user_id": 88,
      "display_name": "숨김 처리된 사용자",
      "nickname": "안개",
      "reason_code": "harassment",
      "detail": null,
      "created_at": "2026-04-03T10:17:00.000Z"
    }
  ]
}
```

모바일 앱은 이 응답을 `차단한 사용자` 화면의 SSOT로 사용한다.

---

## 8. 차단 반영 규칙

viewer가 차단한 사용자의 콘텐츠는 아래 응답에서 기본적으로 제외되어야 한다.

- `GET /api/posts`
- `GET /api/posts/feed`
- `GET /api/search`
- `GET /api/posts/:id/related`
- `GET /api/users/:id/posts`

추가 규칙:

- 차단한 사용자의 게시글 상세는 `404` 또는 제한 응답이 될 수 있다.
- 차단한 사용자의 프로필도 `404` 또는 제한 응답이 될 수 있다.
- 모바일은 차단 성공 직후 현재 목록에서 해당 작성자 콘텐츠를 제거해도 되지만, 새로고침 후에도 서버 기준 결과와 같아야 한다.

---

## 9. 운영 상태 메모

서버/운영은 신고 레코드에 아래 상태를 사용할 수 있다.

- `queued`
- `reviewing`
- `actioned`
- `dismissed`

모바일 앱은 현재 이 상태를 직접 다루지 않지만, 성공 메시지는 항상 “운영 검토 큐 접수” 의미로 해석한다.

---

## 10. 모바일 구현 메모

- `Author`, `PostDetail`은 `other`를 선택했을 때만 상세 입력 필드를 보여준다.
- `Account Center > 차단한 사용자`에서 `GET /api/me/blocks`, `DELETE /api/users/:userId/block`를 사용한다.
- 차단 관련 UI 문구에서는 “운영팀 알림” 의미를 사용하지 않는다.
- 신고 관련 UI 문구에서는 “운영 검토 큐 접수” 의미를 사용한다.
