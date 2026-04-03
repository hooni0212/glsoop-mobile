# iOS App Review Notes 초안

- 문서 타입: `Review Notes Draft`
- 적용 범위: `glsoop-mobile`
- 대상 독자: 릴리스 담당자, App Store Connect 입력 담당자
- 상태: `Draft`
- 최종 업데이트: `2026-04-04`
- Owner: `taehun`

---

## 목적

이 문서는 App Store Connect `App Review Information > Notes`에
붙여 넣을 수 있는 초안을 정리한다.

실제 리뷰 계정 자격증명은 production 계정이므로
repo에는 커밋하지 않고 App Store Connect에 직접 입력한다.

---

## 붙여 넣기용 초안

아래 본문을 App Review Notes에 그대로 붙여 넣고,
마지막 리뷰 계정 정보만 실제 값으로 채운다.

```text
This build is intended for iPhone only.

Public access without login:
- Home feed
- Search
- Post detail
- Author profile

Protected screens that require login:
- Growth
- Bookmarks
- Me
- Write

Before accessing public user-generated content, the app shows links to:
- Terms of Use
- Privacy Policy
- Community Guidelines

User-generated content safety:
- Users can report objectionable posts from the post detail screen.
- Users can block abusive users from the post detail screen or author profile.
- When a user blocks an abusive user, that author's posts and profile are hidden immediately from the blocking user's feed/search/detail/profile views.
- Blocking also creates a moderation queue entry for the developer/admin review flow.
- Reported and blocked content is reviewed in the admin safety queue, and the moderation SLA is within 24 hours for the first review action.

Support:
- Support URL: https://www.glsoop.com/support
- Support email: glsoop1752@gmail.com

Account management:
- Account deactivation and deletion can be started inside the app from Account Center.
- Blocked users can be reviewed and unblocked from Account Center after login.

Screen recording:
- A physical-device screen recording is attached in the Review Notes attachment area.
- The recording shows the public UGC notice, reporting flow, and blocking flow.

App Review test account:
- Email: [fill in App Store Connect]
- Password: [fill in App Store Connect]
```

---

## 입력 전 체크

- `Support URL`이 실제 배포 서버에서 `200` 응답하는지 확인
- 리뷰 계정으로 production 로그인 가능한지 확인
- 녹화 파일이 `공개 UGC 고지 -> 신고 -> 차단` 흐름을 모두 포함하는지 확인
- App Store Connect Notes에 실제 리뷰 계정 값을 넣을 때 오탈자 없는지 확인
