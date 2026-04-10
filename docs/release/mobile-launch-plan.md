# 모바일 앱 출시 준비 플랜

- 문서 타입: `Launch Plan`
- 적용 범위: `glsoop-mobile`
- 대상 독자: 모바일 개발자, 서버 개발자, QA, 릴리스 담당자
- 상태: `Draft`
- 최종 업데이트: `2026-03-29`
- Owner: `taehun`
- 관련 문서:
  - `docs/api/README.md`
  - `docs/release/android-play-store-public-release.md`
  - `docs/release/ios-app-store-public-release.md`
  - `docs/release/store-metadata-canonical.md`
  - `docs/release/ios-production-testflight-pass1.md`
  - `README.md`

---

## 0) 이 문서의 목적

앱 출시를 위해 해야 할 일을 한 문서에서 보이도록 정리한다.
이 문서는 기존 `release-preflight`와 `app-store-readiness` 문서를 병합한
`단일 기준 문서`다.

---

## 1) 현재 저장소 기준 스냅샷

### 이미 반영된 항목

- [x] Expo Router 기반 앱 구조가 잡혀 있다.
- [x] 앱 버전이 `1.0.0`으로 설정되어 있다.
- [x] iOS 번들 ID `com.glsoop.app`이 설정되어 있다.
- [x] Android package `com.glsoop.app`과 `android.versionCode=1`이 설정되어 있다.
- [x] `eas.json`이 있고 `production` build / submit profile이 연결되어 있다.
- [x] `package.json`에 `typecheck`와 iOS/Android release 검증 스크립트가 있다.
- [x] 기본 검증 스크립트로 `npm run lint`, `npm run e2e:web`가 있다.
- [x] 루트 진입과 세션 복구 중 blank-like 인상을 줄이기 위한 상태 문구가 반영되어 있다.
- [x] `내 정보` 화면이 프로필 홈 중심으로 정리되어 있고, 설정성 액션은 계정 센터로 분리되어 있다.
- [x] 계정 비활성화/즉시 탈퇴가 `POST /api/me/account-closure`와 연결되어 있다.
- [x] 게시글/작가 화면에 문제 신고/지원 문의 및 커뮤니티 가이드라인 진입점이 추가되어 있다.
- [x] `GET /api/runtime-config` 기반 지원 정보 표시와 공용 release config/legal link 헬퍼가 추가되어 있다.
- [x] iOS production build가 App Store Connect/TestFlight까지 업로드되었다.

### 아직 보강이 필요한 것

- [ ] `.github/workflows`가 없어 CI 릴리스 게이트가 자동화되어 있지 않다.
- [ ] Android Play Console 앱 레코드와 service account credentials가 아직 연결되지 않았다.
- [ ] App Store Connect 공개 출시용 메타데이터, 스크린샷, 연령등급, 앱 프라이버시 입력이 완료되지 않았다.
- [ ] Play Console 공개 출시용 store listing, App content, Data safety 입력이 완료되지 않았다.
- [ ] 실제 디바이스 기준 최종 스모크 QA 결과가 최신 문서로 묶여 있지 않다.

---

## 2) 출시 완료 기준

아래를 모두 만족하면 출시 가능 상태로 본다.

- [ ] `P0` 항목이 100% 완료되었다.
- [ ] `P1` 항목은 완료 또는 명시적 defer(담당자/기한/리스크 포함)로 정리되었다.
- [ ] 핵심 사용자 플로우(로그인, 피드, 글 상세, 작성, 검색, 북마크, 성장)가 수동 QA까지 완료되었다.
- [ ] 정적 검증, 린트, E2E, 빌드 검증이 모두 통과했다.
- [ ] 앱 심사에 필요한 정책/지원/테스트 계정/메타데이터가 준비되었다.
- [ ] 스토어 업로드 가능한 빌드가 생성되었다.
- [ ] 출시 당일 체크리스트와 롤백/대응 담당자가 정해졌다.

---

## 3) P0 출시 차단 항목

### A. 필수 자동 검증 재실행

- [ ] `npm run lint`
- [ ] `npx tsc --noEmit`
- [ ] `npx expo install --check`
- [ ] `npm audit --omit=dev`
- [ ] `npm run e2e:web`
- [ ] `npm run release:android:verify:config`
- [ ] `npm run release:android:verify:prod-env`
- [ ] `npm run release:android:verify:api`
- [ ] Write 관련 E2E가 여전히 안정적인지 별도 확인
  - 권장: `npx playwright test e2e/write-draft.spec.ts e2e/write-ux.spec.ts`

### B. 릴리스 안전성 확인

- [ ] 민감 로그가 운영에서 출력되지 않도록 다시 확인
  - 기준: 본문/payload/token/status 직접 출력 금지
- [ ] 핵심 API 호출 실패 시 앱이 깨지지 않고 fallback/에러 문구를 보여주는지 확인
- [ ] 앱 첫 진입과 세션 복구 중 blank screen이 아닌 상태 문구가 보이는지 확인
- [ ] iOS 릴리스 빌드 메타데이터에서 bundle identifier가 `com.glsoop.app`인지 확인
- [ ] Android 릴리스 빌드 메타데이터에서 package name `com.glsoop.app`과 target API 정책 충족 여부를 확인
- [ ] 실제 스토어 업로드 가능한 빌드를 한 번 생성해본다.

### C. 참고용 과거 검증 기록

- `2026-02-16` 기준 `npm run lint` 통과
- `2026-02-16` 기준 `npx tsc --noEmit` 통과
- `2026-02-16` 기준 `npx expo install --check` 통과
- `2026-02-16` 기준 `npm audit --omit=dev` High/Critical `0`
- `2026-02-16` 기준 비쓰기 E2E `15 passed`
- `2026-02-16` 기준 `write-draft` + `write-ux` E2E `10 passed`

---

## 4) P1 출시 전 강력 권장 항목

- [ ] 인증 토큰 저장소를 `AsyncStorage`에서 `SecureStore/Keychain`으로 전환 검토 또는 적용
  - 관련 코드: `src/lib/authToken.ts`
- [ ] API 디버그 로그에서 토큰/URL이 운영에서 절대 노출되지 않도록 강제
  - 관련 코드: `src/lib/api.ts`
- [ ] 피드/상세 화면의 stale 요청 덮어쓰기 방지
  - 관련 코드: `src/features/feed/useFeed.ts`
  - 관련 코드: `src/features/posts/usePost.ts`
- [ ] 북마크 저장 시 폴더별 추가 조회 구조 최적화
  - 관련 코드: `src/screens/Home.tsx`
- [ ] GitHub Actions 등 CI 게이트 구축
  - 최소: `lint`, `tsc`, `e2e:web`
- [ ] `EXPO_PUBLIC_SUPPORT_URL` 또는 별도 support landing page 필요 여부 확정
- [ ] direct report/block API의 출시 시점 정책 확정
  - 현재는 support fallback 중심

---

## 5) 작업 트랙별 체크리스트

### A. 출시 범위 확정

- [ ] 이번 출시 대상 플랫폼 확정
  - 예: `iOS 우선`, `iOS + Android 동시`
- [ ] 이번 출시 범위 확정
  - 예: 인증, 피드, 글 상세, 작성, 검색, 북마크, 성장 포함 여부
- [ ] `P0`, `P1`, `defer` 기준 확정
- [ ] 릴리스 오너 / QA 오너 / 승인자 지정
- [ ] 출시 목표일과 코드 프리즈 시점 확정

### B. 앱 설정 / 빌드 파이프라인

- [ ] `app.json` 버전 정책 확정 및 반영
  - `expo.version`
  - `ios.buildNumber`
  - Android 출시 시 `android.versionCode`
- [x] Android 출시용 `android.package` 추가
- [ ] EAS 사용 여부 결정
  - 사용할 경우 `eas.json` 추가
  - build profile / submit profile 정의
- [ ] 서명/프로비저닝 경로 확정
  - iOS: Apple Developer / provisioning / signing
  - Android: keystore / Play App Signing
- [ ] 릴리스용 환경 변수 목록 확정
  - `EXPO_PUBLIC_API_BASE_URL`
  - `EXPO_PUBLIC_API_DEBUG`
  - `EXPO_PUBLIC_GROWTH_TELEMETRY`
  - `EXPO_PUBLIC_ENABLE_PAPER_TEXTURE`
- [ ] 개발용/운영용 값이 섞이지 않도록 `.env` 관리 방식 확정

### C. 품질 게이트 자동화

- [ ] `package.json`에 `typecheck` 스크립트 추가
- [ ] 로컬 기준 필수 검증 명령을 문서/스크립트로 고정
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run e2e:web`
- [ ] GitHub Actions 등 CI 게이트 추가
  - PR 시 lint
  - PR 시 typecheck
  - PR 시 주요 E2E 또는 최소 스모크
- [ ] 릴리스 브랜치/태그 전략 확정
- [ ] 실패 시 재시도/차단 기준 정의

### D. 서버 / 운영 정책 의존성 정리

- [ ] 실제 운영 API 기준으로 핵심 기능 재점검
  - 로그인
  - 피드
  - 글 상세
  - 작성/발행
  - 검색
  - 북마크
  - 성장
- [ ] 런타임 설정 기반 지원 정보가 운영값과 연결되는지 확인
- [ ] 개인정보 처리방침 / 이용약관 / 커뮤니티 가이드라인 링크 최종 확정
- [ ] 신고 / 차단 / 문의 fallback 정책 최종 확정
- [ ] 서버 장애 시 앱에서 보여줄 에러 문구와 fallback 확인

### E. 수동 QA / 실기기 검증

- [ ] iPhone 실기기에서 첫 실행부터 주요 플로우 점검
- [ ] Android 출시 예정이면 Android 실기기에서도 동일 점검
- [ ] 네트워크 느림 / 실패 / 빈 상태에서 UX 확인
- [ ] 로그인 세션 복구 시 blank-like 화면이 없는지 확인
- [ ] 외부 링크(정책, 지원 문의)가 실제로 열리는지 확인
- [ ] 공유, 북마크, 작성 임시저장, 검색 최근 기록이 정상 동작하는지 확인
- [ ] `내 정보 > 계정 센터 > 계정 관리`에서 비활성화/즉시 탈퇴가 실제 서버 호출과 연결되는지 확인
- [ ] 게시글 상세 / 작가 화면의 문제 신고·지원 문의·가이드라인 진입이 정상 동작하는지 확인
- [ ] 접근성 최소 점검
  - 스크린 리더 라벨
  - 터치 타겟
  - 텍스트 잘림
- [ ] SafeArea 경고 이슈 영향도 확인
- [ ] 태블릿 지원을 유지할지 여부와 화면 품질 확인

### F. 스토어 심사 준비

#### iOS

- [ ] App Store Connect에 앱 레코드 생성
- [ ] 앱 이름, 서브타이틀, 설명, 키워드 작성
- [ ] 카테고리 / 연령 등급 / 지역 설정
- [ ] 앱 프라이버시(App Privacy) 문항 작성
- [ ] 지원 URL / 개인정보 처리방침 URL / 마케팅 URL 입력
- [ ] 스크린샷 준비
- [ ] 심사용 테스트 계정 또는 심사 메모 준비
- [x] 배포용 빌드 업로드
- [ ] App Store Connect 버전에 build `1.0.0 (9)` 선택
- [ ] `Add for Review` -> `Submit for Review` 수행
- [ ] App Store 공개 방식 결정
  - 권장: `Manually release this version`

#### Android

- [ ] Play Console 앱 생성
- [ ] 앱 설명 / 카테고리 / 연락처 / 개인정보 처리방침 입력
- [ ] 앱 아이콘 / 피처 그래픽 / 스크린샷 준비
- [ ] internal testing 트랙 업로드
- [ ] 출시 대상 국가 / 앱 콘텐츠 / 데이터 세이프티 작성
- [ ] 개인 개발자 계정이면 closed test 요구사항 적용 여부 확인
- [ ] production 출시는 staged rollout 기준으로 진행

### G. 출시 당일 운영

- [ ] 최종 Go / No-Go 미팅 진행
- [ ] 배포 버전 / 커밋 / 태그 기록
- [ ] 공지 문안 준비
- [ ] 장애 대응 담당자와 연락 채널 확인
- [ ] 모니터링 포인트 확인
  - 로그인 실패율
  - 주요 API 오류율
  - 작성/발행 실패
  - 크래시 / 치명 로그
- [ ] 롤백 또는 hotfix 기준 정리

### H. 출시 후 48시간

- [ ] 사용자 문의 모니터링
- [ ] 스토어 심사/리젝트 피드백 대응
- [ ] 크래시 / 오류 로그 확인
- [ ] 핵심 퍼널 체크
  - 앱 진입
  - 로그인 성공
  - 첫 피드 로드
  - 글 상세 진입
  - 작성/발행
- [ ] 잔여 이슈 backlog 정리

---

## 6) App Review / 정책 리스크 메모

- 게시글/사용자 직접 신고 API가 없다.
  - 현재 모바일은 운영팀 문의 경로와 커뮤니티 가이드라인 노출로 honest fallback만 제공한다.
- 사용자 차단 API가 없다.
  - 현재 모바일은 차단 성공을 가장하지 않고 support fallback만 제공한다.
- `EXPO_PUBLIC_SUPPORT_URL`이 아직 확정되지 않았다.
  - 지금은 `runtime-config`의 이메일/연락처에 주로 의존한다.
- Android submit profile 기본 track은 repo에 반영됐다.
  - service account key 업로드와 Play Console 앱 생성은 별도다.

---

## 7) 최종 심사 전 수동 QA 체크

1. [ ] 로그인 후 `내 정보`에서 개인정보 처리방침, 이용약관, 커뮤니티 가이드라인, 지원 문의가 모두 보이고 실제로 열린다.
2. [ ] `내 정보 > 계정 센터 > 계정 관리`에서 비활성화/즉시 탈퇴 모드를 선택하고, 현재 비밀번호와 `DELETE` 확인 문구를 넣어 실제 서버 호출이 된다.
3. [ ] 게시글 상세 우상단 메뉴에서 문제 신고/지원 문의와 가이드라인 진입이 정상 동작한다.
4. [ ] 작가 화면 overflow 메뉴에서 문제 신고/지원 문의와 가이드라인 진입이 정상 동작한다.
5. [ ] 앱 첫 진입과 세션 복구 중 blank screen 대신 상태 확인 문구가 보인다.
6. [ ] 실제 iOS 빌드 메타데이터에서 bundle identifier가 `com.glsoop.app`인지 확인한다.

---

## 8) 이번 주 우선순위

출시 준비를 바로 시작한다면 아래 순서가 효율적이다.

1. [ ] TestFlight `1.0.0 (9)` 실기기 스모크 QA 마감
2. [ ] App Store Connect 메타데이터 작성
3. [ ] iOS 스크린샷 업로드
4. [ ] 연령 등급 / 앱 프라이버시 / 지역 가용성 설정
5. [ ] 심사용 테스트 계정 / 심사 메모 정리
6. [ ] App Store Connect에서 build `1.0.0 (9)`를 선택해 `Submit for Review`
7. [ ] 승인 후 수동 공개 또는 출시 시각 확정

---

## 9) 현재 기준 리스크

- `eas.json`과 CI가 없어 출시 직전 빌드/검증이 사람 손에 많이 의존한다.
- iOS 정보는 어느 정도 준비되어 있고 Android도 기본 식별자와 런북은 준비됐지만, 콘솔 입력과 credentials 연결은 아직 남아 있다.
- 기존 문서가 여러 장으로 나뉘어 있어 실제 출시 오너가 한 번에 보기 어렵다.
- 스토어 심사에서 필요한 메타데이터, 테스트 계정, 지원 정보는 코드 밖 수작업 비중이 크다.

---

## 10) 현재 판단

- Production iOS bundle identifier: `com.glsoop.app`
- Latest uploaded iOS build: `1.0.0 (9)`
- App Store Connect upload ready: `YES`
- App Review submission ready: `NOT YET`
- Likely App Review ready with current server capabilities: `RISKY`

### Why These Are Not `YES`

- `App Review submission ready`가 아직 `NOT YET`인 이유:
  - 메타데이터, 스크린샷, 연령 등급, 앱 프라이버시, 심사용 정보 입력이 남아 있다.
- `Likely App Review ready`가 `RISKY`인 이유:
  - direct report/block API 없이 support fallback 비중이 크다.
- 현재 기준으로 문서상 명시된 `P0 blocker`는 없지만,
  - 출시 직전 자동 검증과 실기기 QA 재실행이 필요하다.

---

## 11) 승인 기록

- 릴리스 오너: [ ]
- QA 오너: [ ]
- 엔지니어링 승인자: [ ]
- 최종 결론: [ ] Go / [ ] No-Go
- 승인 시각: [ ]
