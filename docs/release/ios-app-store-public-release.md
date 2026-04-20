> Canonical moved: 공통 release / app-review 문서는 `glsoop-ops/docs/release/mobile` 및 `glsoop-ops/docs/app-review/ios`를 기준으로 관리합니다.
>
> 이 파일은 기존 링크 호환을 위해 임시 유지합니다.

# iOS App Store 공개 출시 런북

- 문서 타입: `Runbook`
- 적용 범위: `glsoop-mobile`
- 대상 독자: 모바일 개발자, 릴리스 담당자
- 상태: `Draft`
- 최종 업데이트: `2026-04-04`
- Owner: `taehun`
- 공통 기준 문서: `docs/release/store-metadata-canonical.md`

---

## Summary

현재 상태는 `production` iOS build가 App Store Connect/TestFlight까지 올라간 단계다.
공개 출시는 EAS Submit만으로 끝나지 않고, App Store Connect에서 메타데이터를 채우고
build를 버전에 연결한 뒤 App Review에 직접 제출해야 한다.

현재 기준 상태:

- App Store Connect app id: `6761228925`
- bundle identifier: `com.glsoop.app`
- latest uploaded build: `1.0.0 (9)`
- `eas.json` submit profile에 `ascAppId`가 연결되어 있다.
- 다음 공개 제출 빌드는 `iPad portrait full-screen` 지원을 포함해야 한다.

이번 런북의 범위:

- iOS App Store 공개 출시 준비
- App Review 제출
- 승인 후 수동 공개

이번 런북의 범위에 포함하지 않는 것:

- Android 공개 출시
- 외부 베타/TestFlight 운영 정책
- CI 자동화 구축

---

## Key Changes

### 1. App Store Connect 메타데이터를 먼저 채운다

버전 페이지(`1.0 Prepare for Submission`)에서 아래를 채운다.

공통 필드 값은 `docs/release/store-metadata-canonical.md`를 기준으로 사용한다.

- 앱 이름
- 서브타이틀
- 설명
- 키워드
- 프로모셔널 텍스트 필요 여부
- 지원 URL
- 개인정보 처리방침 URL
- 마케팅 URL 필요 여부
- 카테고리

### 2. 필수 규제/정책 입력을 끝낸다

App Store Connect에서 아래를 완료한다.

지원 URL, 개인정보 처리방침 URL, 연락처 정보는 Android와 다른 값을 쓰지 않는다.

- Age Rating 설문
- App Privacy 문항
- Pricing and Availability
- 한국 포함 공개 국가/지역 여부

현재 앱은 로그인, 사용자 생성 콘텐츠, 외부 링크, 지원 문의 흐름이 있으므로
연령 등급과 앱 프라이버시는 대충 입력하면 안 된다.

### 3. 심사용 정보와 스크린샷을 고정한다

공개 제출 전 아래를 준비한다.

- iPhone 스크린샷
- iPad portrait full-screen 스크린샷
- 심사용 연락처
- 심사용 테스트 계정
- 심사 메모
  - 로그인 필요 여부
  - 지원/신고는 support fallback 중심이라는 점
  - 비활성화 계정 재활성화 흐름이 있다면 그 테스트 방법

### 4. build `1.0.0 (9)`를 버전에 연결한다

App Store Connect 버전 페이지에서:

- Build 섹션에 `1.0.0 (9)`를 선택
- `Add for Review`
- `Submit for Review`

중요한 점:

- EAS Submit은 build를 App Store Connect/TestFlight로 올려줄 뿐이다.
- 공개 App Store 배포는 App Store Connect에서 review 제출을 직접 해야 한다.

### 5. 첫 공개 출시는 수동 공개를 권장한다

App Store Version Release 옵션은 아래 중 하나를 고른다.

- 권장: `Manually release this version`
- 대안: 승인 즉시 자동 공개
- 대안: 특정 시각 이후 자동 공개

첫 공개 출시는 승인과 동시에 앱이 풀리지 않도록 `Manually release this version`이 가장 안전하다.

---

## Test Plan

### App Review 제출 전

- [ ] TestFlight `1.0.0 (9)` 실기기 QA 완료
- [ ] 로그인/세션 복구 확인
- [ ] 홈 피드, 글 상세, 글쓰기, 북마크, 성장 확인
- [ ] `내 정보`의 정책/지원 링크 확인
- [ ] 비활성화/즉시 탈퇴 흐름 확인
- [ ] 앱 아이콘/스플래시/기본 브랜딩 확인
- [ ] iPad 11-inch / 13-inch portrait full-screen에서 동일 흐름 확인

### App Store Connect 입력 확인

- [ ] App Information 필수값 입력
- [ ] Age Rating 완료
- [ ] App Privacy 완료
- [ ] Pricing and Availability 설정
- [ ] 공개 국가/지역 설정
- [ ] iPhone + iPad 스크린샷 업로드
- [ ] 심사용 계정/메모 입력

### 제출 후

- [ ] App Review 상태 추적
- [ ] `Metadata Rejected` / `Rejected` / `Waiting For Review` 상태 확인
- [ ] 리젝 사유 발생 시 수정 후 재제출
- [ ] 승인되면 `Pending Developer Release` 상태 확인
- [ ] 수동 공개 선택 시 `Release This Version` 실행

---

## Assumptions

- 현재 공개 출시 후보 build는 `1.0.0 (9)`다.
- 서버 운영 계약은 최신 상태이며 로그인은 실기기에서 이미 검증됐다.
- 이번 단계는 App Review 제출과 공개 배포 준비까지다.
- 첫 공개 출시는 수동 공개가 더 안전하다.
- iPad는 `portrait + full-screen`만 지원하고 새 바이너리 빌드가 필요하다.

---

## References

- Expo EAS Submit: https://docs.expo.dev/submit/introduction/
- Expo Submit iOS: https://docs.expo.dev/submit/ios/
- Apple Submit an app: https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app
- Apple Release option: https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/select-an-app-store-version-release-option/
- Apple Manage availability: https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/manage-availability-for-your-app-on-the-app-store
- Apple Age rating: https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/
