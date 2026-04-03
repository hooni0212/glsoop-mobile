# iOS App Review 재심 대응 실행 계획

- 문서 타입: `Execution Plan`
- 적용 범위: `glsoop-mobile`, `../glsoop`
- 대상 독자: 모바일 개발자, 서버 개발자, QA, 릴리스 담당자
- 상태: `Draft`
- 최종 업데이트: `2026-04-04`
- Owner: `taehun`
- 관련 문서:
  - `docs/release/mobile-launch-plan.md`
  - `docs/release/ios-app-store-public-release.md`
  - `docs/release/ios-app-review-notes-draft.md`
  - `docs/release/ios-app-review-recording-script.md`
  - `docs/release/store-metadata-canonical.md`
  - `../glsoop/docs/운영/2026-04-03-안전-기능-차단-신고-개편-계획.md`

---

## 0) 문서 목적

이 문서는 `2026-03-31` App Store Review 반려 사유를 기준으로
이번 재심 제출 전까지 무엇을 어떤 순서로 정리할지 실행 계획으로 고정한다.

목표는 단순 기능 추가가 아니라 아래 3가지를 동시에 만족하는 것이다.

1. Apple이 지적한 `UGC safety` 요구사항을 코드와 운영 흐름 모두에서 설명 가능하게 만든다.
2. iPad 레이아웃 리스크를 제거하고 iPhone-only 출시 전략으로 제출 범위를 명확히 한다.
3. 새 빌드 제출 전 자동 검증, 실기기 QA, 심사 메모를 한 번에 정리한다.

---

## 1) 반려 사유 요약

App Store Connect 반려 메시지 기준 핵심 이슈는 2개였다.

### A. Guideline 1.2 - Safety - User Generated Content

Apple이 요구한 보완점:

- abusive user 차단 기능
- 차단 시 개발자 통지
- 차단 즉시 사용자 피드에서 숨김
- objectionable content 신고 기능
- 개발자는 24시간 내 신고 처리
- 다음 흐름을 실제 디바이스 녹화로 제출
  - UGC 접근 전 EULA / terms 노출
  - 신고 기능
  - 차단 기능

### B. Guideline 4 - Design

Apple이 iPad Air 11-inch (M3)에서 `레이아웃 settings` 등 일부 UI를 스크롤하거나 조작하기 어렵다고 지적했다.

이번 대응 방향:

- 앱은 더 이상 iPad 지원하지 않는다.
- iPhone-only 출시 기준으로 배포 설정, 코드 흔적, 제출 문구를 정리한다.

---

## 2) 이번 대응에서 확정한 정책

### A. 출시 기기 정책

- iOS는 `iPhone-only`로 출시한다.
- iPad 전용 QA, iPad 스크린샷, iPad UI 대응은 이번 범위에서 제외한다.

### B. 공개/비공개 화면 범위

비로그인 허용:

- Home feed
- Search
- Post detail
- Author profile

로그인 필요:

- Growth
- Bookmarks
- Me
- Write

이 정책은 모바일 라우팅과 심사 메모에 동일하게 반영해야 한다.

### C. 신고/차단 정책

- `신고`는 운영 검토 큐로 접수한다.
- `차단`은 내 화면에서 즉시 숨기는 개인 기능이다.
- 이번 재심 대응에서는 Apple 요구사항에 맞춰 `차단 시 자동 신고도 함께 생성`한다.
- 따라서 차단은 아래 2가지 효과를 동시에 가져야 한다.
  - 내 화면에서 해당 사용자의 글/프로필 즉시 숨김
  - 운영 검토 큐에 자동 접수

### D. 운영 대응 정책

- 신고는 관리자(`admin`) 화면에서 확인/처리한다.
- 운영 기준 SLA는 `24시간 이내 1차 처리`로 설명한다.
- 재심 메모와 support 페이지에도 같은 기준을 사용한다.

### E. 지원 정책

- 앱 내 지원 문의는 `support email`을 사용한다.
- 최종 지원 이메일: `glsoop1752@gmail.com`
- 별도 공개 support URL 페이지를 `../glsoop`에 추가한다.

### F. 심사용 계정

- 리뷰 계정:
  - email: `ios-review@glsoop.com`
  - password: `GlsoopReview!2026`
- 이 계정은 production API 기준으로 사용한다.

### G. 제출 환경

- 심사용 빌드는 아직 새로 만들지 않았다.
- 이번 수정과 검증이 끝난 뒤 새 iOS 빌드를 생성해 제출한다.

---

## 3) 현재 확인된 사실

### A. 모바일 저장소(glsoop-mobile)

- iOS `supportsTablet: false`는 이미 설정되어 있다.
- `write` 화면에 남아 있던 iPad 분기 흔적도 제거해
  iPhone-only 제출 전략과 코드가 일치한다.
- `lint`, `typecheck`, `release:ios:verify:config`는 통과했다.
- `npm run e2e:web`는 최근 앱 변경 이후 E2E fixture가 뒤처져 있어
  인증 토큰 키, 공개 UGC 고지 gate, 공유 모달 흐름을 함께 정리해야 하는 상태다.
- `npm audit --omit=dev`는 high/moderate 취약점이 남아 있다.
- 공개/비공개 라우트 정책은 현재 코드와 제품 의도가 어긋날 가능성이 있다.

### D. 진행 현황

- `2026-04-04`: `Track A` 1차 반영 시작
  - 공개 범위를 `Home/Search/Post detail/Author profile`로 유지하고
    `Growth/Bookmarks/Me/Write`만 로그인 필요하도록 모바일 라우트 정책을 다시 맞춘다.
- `2026-04-04`: `Track B` 구현 완료
  - 서버에서 `차단 -> source='block' safety report 생성` 흐름을 추가하고
    admin safety 목록에 `report + block`을 함께 노출하도록 조정했다.
  - 모바일 차단 확인 문구와 success message를
    `즉시 숨김 + 운영 검토 큐 접수` 기준으로 맞췄다.
- `2026-04-04`: `Track D` 구현 완료
  - `https://www.glsoop.com/support` 공개 지원 페이지를 추가하고
    App Store support URL로 사용할 수 있게 서버 라우트를 연결했다.
  - 모바일 `계정 센터 > 도움말 및 지원` 화면에서
    지원 메일, 지원 페이지, 정책 문서를 바로 열 수 있게 연결했다.
- `2026-04-04`: `Track C` 구현 완료
  - 비로그인 사용자가 공개 UGC route로 진입하면
    이용약관, 개인정보 처리방침, 커뮤니티 가이드라인을 먼저 확인하는 전역 고지 gate를 추가했다.
  - 고지는 한 번 확인하면 재노출하지 않고,
    법률 문서 버전이 바뀌면 다시 보이도록 버전 키 기반으로 저장한다.
- `2026-04-04`: `Track E` 구현 완료
  - `playwright.config.ts`에서 잘못된 `EXPO_WEB_PORT` 환경값이 들어와도
    안전한 기본 포트(`8081`)로 fallback 하도록 정리했다.
  - 웹 E2E 스펙을 현재 auth token 저장 키(`glsoop_auth_token_v1`)와
    공개 UGC gate / 공유 모달 / Growth fallback UI 기준으로 다시 맞췄다.
  - 최종 검증으로 `npm run lint`, `npm run typecheck`, `npm run e2e:web`,
    `npm run release:ios:verify:config`를 모두 통과했다.
- `2026-04-04`: `iPhone-only` 제출 정리 완료
  - `write` 화면의 iPad 전용 presentation 분기를 제거했다.
  - iOS 공개 출시 런북에서도 iPad 스크린샷 항목을 제외해
    iPhone-only 제출 전략과 문서 기준을 맞췄다.
- `2026-04-04`: `Track F` 준비 문서 작성 완료
  - App Store Connect에 바로 붙여 넣을 `App Review Notes` 초안을 문서로 정리했다.
  - 실제 iPhone 물리 디바이스 녹화를 위한 순서별 스크립트를 문서로 정리했다.

### B. 서버 저장소(glsoop)

- 신고 API가 존재한다.
  - `POST /api/posts/:id/report`
  - `POST /api/users/:id/report`
- 차단 API가 존재한다.
  - `POST /api/users/:id/block`
  - `DELETE /api/users/:id/block`
  - `GET /api/me/blocks`
- admin safety API가 존재한다.
  - `GET /api/admin/safety/reports`
  - `GET /api/admin/safety/reported-posts`
  - `POST /api/admin/safety/reports/:id/resolve`
- runtime config에 `moderation_sla_hours = 24`가 노출된다.
- 차단 시 검색/피드/상세/작가 화면에서 숨김 처리하는 서버 조건이 이미 존재한다.
- 현재 구현은 `차단 시 source='block' 자동 신고를 생성`하고
  admin safety 목록에서 `report`, `block` 둘 다 확인할 수 있다.

### C. 지원 URL 상태

현재 확인 결과:

- `https://www.glsoop.com` -> `200`
- `https://www.glsoop.com/support` -> `브랜치 기준 200 확인`
- `https://www.glsoop.com/help` -> `404`
- 정책 문서 URL은 정상 응답한다.

결론:

- support email만으로는 App Store Connect와 심사 메모에서 약할 수 있다.
- 공개 support 페이지를 새로 만드는 것이 안전하다.

---

## 4) 우선순위

### P0. 심사 차단 블로커

1. 공개/비공개 라우트 정책을 제품 의도대로 다시 맞춘다.
2. 차단 시 자동 신고 생성 + 즉시 숨김 동작을 완성한다.
3. 앱 내 `UGC 접근 전 terms/guidelines 고지` 흐름을 만든다.
4. support email과 support URL 진입점을 앱과 웹에 모두 만든다.
5. `npm run e2e:web`를 복구한다.

### P1. 제출 안정성

1. 자동 검증을 재실행한다.
2. iPhone 실기기에서 핵심 플로우를 다시 확인한다.
3. 심사용 녹화와 심사 메모를 준비한다.

### P2. 제출물 마감

1. 새 iOS 빌드 생성
2. App Store Connect 빌드 연결
3. App Review Information 업데이트

---

## 5) 실행 트랙

## Track A. 공개 접근 정책 정렬

목표:

- 비로그인 공개 화면과 로그인 필요 화면을 코드, QA, 심사 메모에서 일치시킨다.

대상 저장소:

- `glsoop-mobile`

주요 작업:

- `src/lib/routeAccess.ts`를 제품 정책 기준으로 조정
- `AuthGate` 리다이렉트가 Home/Search/Post detail/Author profile 공개를 막지 않도록 확인
- 비로그인 상태에서 `Growth`, `Bookmarks`, `Me`, `Write`만 로그인 유도되게 확인

완료 기준:

- 공개 화면 4종은 비로그인으로 진입 가능
- 비공개 화면 4종은 로그인 유도
- 심사 메모에 해당 범위를 한 줄로 명확히 설명 가능

리스크:

- 현재 코드가 `(tabs)` 전체를 보호하는 방향이면 Home feed까지 로그인 요구로 바뀌었을 수 있다.

---

## Track B. UGC safety 정책 구현

목표:

- Apple 1.2 지적사항에 대해 기능/운영/증빙이 모두 가능하도록 만든다.

대상 저장소:

- `glsoop`
- `glsoop-mobile`

주요 작업:

### 서버(glsoop)

- `blockUser()`에서 자동 신고 생성 로직 추가
- `POST /api/users/:id/block` 응답에 `report_id`를 채우도록 조정
- admin safety 목록에서 차단으로 생성된 `source='block'` 레코드를 함께 노출
- `24시간 내 처리` 운영 설명과 실제 admin 확인 흐름 일치 여부 점검

### 모바일(glsoop-mobile)

- 차단 확인 문구를 정직하게 변경
  - 예: `차단하면 내 화면에서 즉시 숨겨지고 운영 검토 큐에도 접수됩니다.`
- 신고/차단/가이드라인 진입점이 실제 production API 기준으로 모두 동작하는지 확인
- 필요 시 block success toast / modal copy를 Apple 요구에 맞게 조정

완료 기준:

- 차단 -> 즉시 숨김
- 차단 -> 운영 검토 큐 기록 생성
- 신고 -> 운영 검토 큐 기록 생성
- admin에서 해당 레코드 확인 가능
- 심사용 녹화에서 차단/신고 둘 다 명확히 증명 가능

열린 이슈:

- `source='block'`은 admin safety 목록에 `차단 자동 접수`로 노출하고,
  `reported-posts` 집계는 직접 신고(`source='report'`)만 유지한다.

---

## Track C. UGC 접근 전 고지 흐름

목표:

- Apple이 요청한 `UGC 접근 전 EULA / terms 노출` 증빙을 만들 수 있도록 한다.

대상 저장소:

- `glsoop-mobile`

주요 작업:

- 공개 UGC 진입 전에 보여줄 고지 UI 설계
- 최소 포함 항목:
  - 이용약관
  - 개인정보 처리방침
  - 커뮤니티 가이드라인
  - 계속 버튼 또는 확인 액션
- 이 고지는 회원가입 동의와 별도로, 공개 UGC 접근 전 고지로 해석되게 설계

권장안:

- 앱 첫 진입 또는 첫 공개 피드 진입 시 full-screen 또는 bottom sheet
- 확인 이후 재노출 정책은 로컬 저장으로 제어

구현 결과:

- 비로그인 + 공개 UGC route 진입 시 전역 overlay gate로 노출
- 고지 확인 상태는 AsyncStorage에 저장
- terms/privacy/guidelines 버전 중 하나라도 바뀌면 재노출

완료 기준:

- 비로그인 사용자가 공개 피드/검색/상세에 들어가기 전에 고지 흐름을 녹화로 보여줄 수 있음
- 심사 메모에서 `terms are presented before access to public UGC surfaces`라고 설명 가능

---

## Track D. support URL / 지원 문의 정리

목표:

- App Store Connect와 앱 내부 모두에서 일관된 지원 정보를 제공한다.

대상 저장소:

- `glsoop`
- `glsoop-mobile`

주요 작업:

### 서버(glsoop)

- `public/html/support.html` 신규 추가
- `/support` 공개 라우트 연결
- 내용:
  - 지원 이메일 `glsoop1752@gmail.com`
  - 신고/차단 관련 안내
  - 24시간 moderation 원칙
  - 계정 삭제 안내
  - terms / privacy / guidelines 링크

### 모바일(glsoop-mobile)

- `EXPO_PUBLIC_SUPPORT_EMAIL` 반영
- `Me` 또는 `계정 센터`에 support entry 추가
- support email / support URL을 실제 열 수 있게 연결

완료 기준:

- 공개 support URL이 200 응답
- 앱 내 support 진입점 존재
- App Store Connect support 정보와 앱 런타임 정보가 어긋나지 않음

구현 결과:

- 공개 support URL은 `/support`로 확정
- 앱 내 support entry는 `계정 센터 > 도움말 및 지원`으로 추가
- release config 기본값도 support URL / support email 기준으로 정렬

---

## Track E. 자동 검증 복구

목표:

- 심사 전 최소 자동 검증을 다시 green으로 만든다.

대상 저장소:

- `glsoop-mobile`

주요 작업:

- `playwright.config.ts` 포트/웹서버 기동 오류 수정
- `npm run e2e:web` 통과
- 가능하면 write 관련 Playwright 스펙도 별도 재확인
- `npm audit --omit=dev`는 즉시 전부 해결이 어렵다면 `prod 영향`, `직접 노출 여부`, `차후 일정`을 분리해서 판단

완료 기준:

- `npm run lint`
- `npm run typecheck`
- `npm run e2e:web`
- `npm run release:ios:verify:config`

리스크:

- 최근 `e2e:web` 실패 원인은 단일 포트 오류보다
  앱 플로우 변경과 Playwright fixture 불일치가 더 큰 비중을 차지한다.

구현 메모:

- `playwright.config.ts`는 잘못된 `EXPO_WEB_PORT` 환경값이 들어와도
  안전한 기본 포트(`8081`)로 fallback 하도록 정리한다.
- 웹 E2E 스펙은 현재 auth token 저장 키(`glsoop_auth_token_v1`)를 기준으로 맞춘다.
- 글 상세 공유 스펙은 새 공유 방식 선택 모달을 거친 뒤 검증하도록 갱신한다.

구현 결과:

- Playwright web server 기동은 포트 환경값을 정규화해도 안정적으로 올라온다.
- 웹 E2E 32개가 모두 현재 앱 동작 기준으로 green이다.
- iOS production config 검증도 build number `14` 기준으로 다시 확인했다.

---

## Track F. 심사용 녹화 / 메모 준비

목표:

- Apple이 요청한 증빙을 재심 notes에 바로 넣을 수 있게 준비한다.

대상 저장소:

- 문서 / App Store Connect 입력

녹화 시나리오:

1. 앱 첫 진입
2. UGC 접근 전 terms / guidelines 고지 노출
3. Home feed 진입
4. Post detail에서 신고
5. Author profile 또는 Post detail에서 차단
6. 차단 직후 해당 사용자의 콘텐츠가 더 이상 보이지 않는 흐름
7. 필요 시 계정 센터에서 차단 목록 확인

심사 메모 최소 포함 내용:

- Home/Search/Post detail/Author profile은 비로그인 공개
- Growth/Bookmarks/Me/Write는 로그인 필요
- 차단 시 사용자 콘텐츠는 즉시 숨김
- 차단 시 운영 검토 큐에도 자동 접수
- 신고는 운영 검토 큐로 접수
- 운영팀은 24시간 내 신고를 검토
- 리뷰 계정 정보

완료 기준:

- 실제 기기 녹화 파일 1개
- App Review Information Notes 초안 1개

---

## 6) 저장소별 작업 목록

### glsoop-mobile

- [x] `src/lib/routeAccess.ts` 공개/비공개 정책 반영
- [x] `AuthGate` 동작 확인
- [x] UGC 접근 전 고지 UI 추가
- [x] support 진입점 추가
- [x] 차단 문구 수정
- [x] `playwright.config.ts` 수정
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run e2e:web`
- [x] `npm run release:ios:verify:config`

### glsoop

- [x] 차단 시 자동 신고 생성 로직 추가
- [x] block API 응답에 `report_id` 반영
- [x] admin safety 노출 정책 최종 반영
- [x] `public/html/support.html` 추가
- [x] `/support` 공개 진입 라우트 추가
- [x] support 페이지에 정책 링크와 연락처 고정

### 수동 / 운영

- [ ] production 리뷰 계정 로그인 확인
- [ ] 실제 신고가 admin에 잡히는지 확인
- [ ] 실제 차단 후 홈/검색/상세/작가 화면 숨김 확인
- [ ] support URL 200 확인
- [x] App Review 녹화 준비
- [x] App Review Notes 작성
- [ ] 새 iOS 빌드 생성 및 제출

---

## 7) 순서 제안

실행 순서는 아래가 가장 안전하다.

1. `Track A` 공개 접근 정책 정렬
2. `Track B` 차단 자동 신고 + 즉시 숨김 완성
3. `Track D` support URL / support entry 추가
4. `Track C` UGC 접근 전 고지 UI 추가
5. `Track E` 자동 검증 복구
6. `Track F` 심사용 녹화 / 메모 준비
7. 새 iOS 빌드 생성
8. iPhone 실기기 스모크 QA
9. App Store Connect 재제출

---

## 8) 아직 남은 확인 포인트

- `npm audit --omit=dev` 결과 중 이번 제출 차단으로 볼 취약점 범위

---

## 9) 최종 Go / No-Go 기준

아래를 모두 만족하면 재심 제출 가능으로 본다.

- [x] iPhone-only 제출 전략이 코드/문서/설정에서 일치한다.
- [ ] 공개/비공개 화면 범위가 제품 의도대로 동작한다.
- [ ] 차단 시 즉시 숨김 + 자동 신고 생성이 production 기준으로 검증된다.
- [ ] 신고가 admin 검토 큐에 들어가고 24시간 moderation 설명이 가능하다.
- [ ] UGC 접근 전 terms/guidelines 고지 흐름을 실제 기기에서 녹화할 수 있다.
- [ ] support URL과 support email이 앱/웹/스토어 메타데이터에서 일관된다.
- [ ] 핵심 자동 검증이 다시 green이다.
- [ ] App Review Notes와 리뷰 계정이 준비되었다.
- [ ] 새 iOS 빌드가 App Store Connect에 업로드되었다.
