# EAS Production iOS -> 내부 TestFlight 1차 런북

- 문서 타입: `Runbook`
- 적용 범위: `glsoop-mobile`
- 대상 독자: 모바일 개발자, 릴리스 담당자
- 상태: `Draft`
- 최종 업데이트: `2026-03-27`
- Owner: `taehun`

---

## Summary

이번 1차 목표는 `production` iOS 빌드를 만들고, 그 빌드가 App Store Connect와 내부 TestFlight를 통해 실제 iPhone에 설치되는지 확인하는 것이다.

완료 기준:

- `production build` 성공
- App Store Connect 반영 확인
- 내부 TestFlight 설치 확인
- 핵심 플로우 스모크 통과

이번 범위에 포함하지 않는 것:

- 외부 베타 그룹 운영
- App Review 제출
- 스토어 메타데이터 완성
- Android 배포
- CI 자동화

---

## Key Changes

### 1. 빌드 기준 상태 기록

빌드 직전에 아래를 기록한다.

```bash
npm run release:ios:context
```

기록 항목:

- `git rev-parse HEAD`
- `git branch --show-current`
- `git status --short`
- `git diff --stat`

이번 빌드의 기준은 `HEAD + 추가 diff`로 본다.

### 2. 설정/환경 검증

#### 앱 설정 검증

```bash
npm run release:ios:verify:config
```

확인 항목:

- `ios.bundleIdentifier = com.glsoop.app`
- `version = 1.0.0`
- `ios.buildNumber` 존재

#### EAS production env 검증

```bash
npm run release:ios:verify:prod-env
```

확인 항목:

- `EXPO_PUBLIC_API_BASE_URL=https://www.glsoop.com`
- `EXPO_PUBLIC_API_BASE_URL=https://glsoop.com`
- `EXPO_PUBLIC_API_DEBUG=false`
- `EXPO_PUBLIC_GROWTH_TELEMETRY=false`

production 빌드의 소스 오브 트루스는 로컬 `.env`가 아니라 EAS production environment다.
로컬 `.env`의 `http://127.0.0.1:3000` 값이 production 빌드에 들어가면 안 된다.
`m.glsoop.com`은 현재 Cloudflare Access 보호 대상이라 production native API base로 사용하지 않는다.

#### production API origin 검증

```bash
npm run release:ios:verify:api
```

검증 경로:

- `GET https://glsoop.com/api/runtime-config`

확인 기준:

- `200 OK`
- JSON 응답
- `ok: true`
- 앱이 사용하는 공개 응답 형태를 유지
  - `legal.versions.*`가 있으면 값 확인
  - 없어도 `ok: true`와 JSON 계약이 유지되면 origin 검증은 통과로 본다

위 검증이 실패하면 build를 진행하지 않는다.

### 3. build와 submit 분리

1단계는 build만 수행한다.

```bash
npx eas-cli build --platform ios --profile production
```

build 성공 후 확인:

- profile
- artifact 형태
- bundle identifier
- version
- buildNumber

여기서 mismatch가 보이면 submit으로 넘어가지 않고 설정을 수정한 뒤 재빌드한다.

2단계는 build 검증이 끝난 뒤에만 submit/TestFlight 반영 절차로 진행한다.

기본 제출 명령:

```bash
npx eas-cli submit --platform ios --latest
```

첫 pass에서 build와 submit을 분리하는 이유:

- build 설정/서명 문제 분리
- 제출 문제 분리
- App Store Connect 처리 문제 분리
- 설치 후 런타임 문제 분리

### 4. App Store Connect/TestFlight 처리 대기

submit 또는 업로드 후에는 즉시 설치되지 않는다고 가정한다.

확인 순서:

1. App Store Connect processing 완료 대기
2. 필요 시 export compliance 응답
3. 필요 시 beta app 정보 확인
4. 내부 테스트 그룹에 build 연결
5. 내부 테스터 설치 확인

`Ready to Submit` 또는 내부 테스트 가능한 상태가 되기 전에는 설치 검증 단계로 넘어가지 않는다.

### 5. buildNumber 규칙

- 첫 시도는 `ios.buildNumber = "1"` 유지
- App Store Connect 기존 이력에서 같은 version/buildNumber가 확인되면 즉시 증가
- 충돌 판단은 submit뿐 아니라 upload/processing 단계까지 포함
- 최종 판단 기준은 로컬 가정이 아니라 App Store Connect build 이력

---

## Test Plan

### 빌드 전

```bash
npm run lint
npm run typecheck
npm run release:ios:verify:config
npm run release:ios:verify:prod-env
npm run release:ios:verify:api
npm run release:ios:context
```

### 빌드

```bash
npx eas-cli build --platform ios --profile production
```

### 제출/처리 확인

```bash
npx eas-cli submit --platform ios --latest
```

필요 시 내부 테스트 그룹 지정:

```bash
npx eas-cli submit --platform ios --latest --groups "<internal-group>"
```

### 설치 후 스모크

- 앱 실행과 첫 화면 진입
- 로그인 또는 기존 세션 복구
- 홈 피드 로드
- 글 상세 진입
- 글쓰기 진입과 임시저장
- 북마크 기본 동작
- 성장 탭 기본 진입
- `내 정보` 정책/지원 링크 진입

### 실패 분기

- build 실패: EAS 설정, signing, bundle identifier, env 주입 확인
- submit 실패: Apple 권한, App Store Connect 연결, build number 충돌 확인
- processing 지연/차단: export compliance, beta 설정, build status 확인
- 설치 후 런타임 실패: production API origin과 production env 값 확인

---

## Assumptions

- App Store Connect에는 `com.glsoop.app` 앱 레코드가 이미 존재한다.
- 이번 범위는 내부 TestFlight 설치 검증까지다.
- production API base는 `https://www.glsoop.com`를 사용한다.
- 실제 build 진행 조건은 `https://www.glsoop.com/api/runtime-config` 응답 검증 통과다.
- dirty worktree는 유지하지만, 빌드 기준 `HEAD + diff`는 반드시 기록한다.
- production env는 EAS production environment가 authoritative source다.

---

## References

- https://docs.expo.dev/build/eas-json/
- https://docs.expo.dev/tutorial/eas/ios-production-build/
- https://docs.expo.dev/submit/introduction
- https://docs.expo.dev/eas/environment-variables/
- https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview
