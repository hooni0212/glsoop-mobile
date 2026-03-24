# App Store Readiness Checklist

- 문서 타입: `Release Note`
- 적용 범위: `glsoop-mobile/docs/release/app-store-readiness-checklist.md`
- 대상 독자: 모바일 개발자, 서버 개발자, QA, 릴리스 담당자
- 상태: `Review`
- 최종 업데이트: `2026-03-23`
- Owner: `taehun`

## Completed

- `app.json`에 iOS 프로덕션 번들 ID `com.glsoop.mobile`과 `ios.buildNumber: "1"`를 반영했다.
- 루트 진입 화면과 전역 세션 확인 문구를 정리해 첫 실행 시 blank-like 인상을 줄일 수 있도록 했다.
- `내 정보` 화면을 프로필 홈 중심으로 정리하고, 설정성 액션은 별도 계정 센터로 분리했다.
- `내 정보` 화면에 계정 삭제 진입 안내를 추가했다.
- `내 정보` 화면에 실제 서버 계약(`POST /api/me/account-closure`) 기반 계정 비활성화/회원 탈퇴 폼을 연결했다.
- `PostDetail` 상단에 문제 신고/지원 문의 진입점을 추가했다.
- `Author` overflow 메뉴에 문제 신고/지원 문의와 커뮤니티 가이드라인 진입점을 추가했다.
- 서버 `GET /api/runtime-config`를 읽어 지원 이메일/부서/전화/DPO 정보를 모바일에서 표시할 수 있는 공용 런타임 설정 훅을 추가했다.
- 지원 링크/법률 링크를 위한 공용 release config 및 외부 링크 헬퍼를 추가했다.

## Remaining Issues

### P1 follow-up

- 게시글/사용자 직접 신고 API가 없다.
  - 현재 모바일은 운영팀 문의 경로와 커뮤니티 가이드라인 노출로 honest fallback만 제공한다.
  - 허위 성공 상태를 피한다는 점에서는 안전하지만, first-class moderation/report UX는 아직 아니다.
- 사용자 차단 API가 없다.
  - 현재 모바일은 차단 성공을 가장하지 않고 support fallback만 제공한다.
- `EXPO_PUBLIC_SUPPORT_URL` 또는 고정 support landing page가 없다.
  - 지금은 `runtime-config`의 이메일/연락처에 의존한다.
  - 운영 정책상 웹 문의 폼이 필요하면 별도 URL을 release config로 확정해야 한다.
- EAS submission profile이 repo에 없다.
  - 코드상 문제는 아니지만 팀이 EAS submit/build를 쓸 계획이면 추후 최소 설정이 필요하다.

### Manual Apple / App Store Connect task

- App Store Connect에서 `com.glsoop.mobile` 앱 레코드를 생성하고 Apple Developer 식별자와 일치시키기
- 배포용 서명/프로비저닝/빌드 업로드 경로 확정하기
- App Store Connect 메타데이터 입력
  - 설명
  - 스크린샷
  - 카테고리
  - 연령 등급
  - 지원 URL
  - 마케팅 URL(사용 시)
  - 개인정보 처리방침 URL
- App Review용 테스트 계정 또는 검수 절차 메모 준비
- 실제 심사용 iOS 빌드 생성 후 on-device smoke QA 수행

## OTHER=glsoop Server Dependencies

- 게시글 신고 endpoint 필요
- 사용자 신고 endpoint 필요
- 사용자 차단 endpoint 필요

## Final Pre-Submission QA

1. 로그인 후 `내 정보`에서 개인정보 처리방침, 이용약관, 커뮤니티 가이드라인, 지원 문의가 모두 보이고 실제로 열린다.
2. `내 정보 > 계정 센터 > 계정 관리`에서 비활성화/즉시 탈퇴 모드를 선택하고, 현재 비밀번호와 `DELETE` 확인 문구를 넣어 실제 서버 호출이 된다.
3. 게시글 상세 우상단 메뉴에서 문제 신고/지원 문의와 가이드라인 진입이 정상 동작한다.
4. 작가 화면 overflow 메뉴에서 문제 신고/지원 문의와 가이드라인 진입이 정상 동작한다.
5. 앱 첫 진입과 세션 복구 중 blank screen 대신 상태 확인 문구가 보인다.
6. 실제 iOS 빌드 메타데이터에서 bundle identifier가 `com.glsoop.mobile`인지 확인한다.

## Final Readiness Judgment

- Production iOS bundle identifier: `com.glsoop.mobile`
- App Store Connect submission ready: `NO`
- Likely App Review ready with current server capabilities: `RISKY`

### Why These Are Not `YES`

- `App Store Connect submission ready`도 `NO`다.
  - 이유: App Store Connect 등록, 메타데이터, 심사용 빌드 업로드 등 필수 manual tasks가 아직 완료되지 않았다.
- `Likely App Review ready with current server capabilities`를 `RISKY`로 둔 이유는 direct report/block API는 아직 없고 support fallback 위주이기 때문이다.
- 현재 기준으로 남아 있는 `P0 blocker`는 없다.

## Reviewer / Demo Note

- Reviewer에게는 로그인 가능한 테스트 계정과 함께 아래를 안내하는 것이 좋다.
  - `내 정보` 화면은 프로필 홈이고, 설정/보안/탈퇴는 계정 센터에서 관리한다는 점
  - 현재 계정 삭제는 앱 안에서 실제 실행 가능하며, 비활성화와 즉시 탈퇴 두 모드가 있다는 점
  - 게시글/작가 신고는 support fallback으로 연결된다는 점
