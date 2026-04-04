# Admin / Web 보안 하드닝 실행 계획

- 문서 타입: `Execution Plan`
- 적용 범위: `../glsoop`, 필요 시 `glsoop-mobile`
- 대상 독자: 서버 개발자, 운영자, QA, 릴리스 담당자
- 상태: `Draft`
- 최종 업데이트: `2026-04-04`
- Owner: `taehun`
- 관련 문서:
  - `docs/release/2026-04-04-ios-app-review-remediation-plan.md`
  - `docs/release/ios-resubmission-preflight-status.md`

---

## 0) 문서 목적

이 문서는 `glsoop` 웹사이트와 `admin` 페이지의 현재 보안 상태를 빠르게 점검한 뒤,
어떤 순서로 하드닝할지 실행 계획으로 정리한다.

이번 목적은 "완벽한 보안" 선언이 아니라 아래 3가지를 빠르게 달성하는 것이다.

1. App Review와 운영에 필요한 공개/support/admin 경로를 의도한 URL 정책으로 고정한다.
2. 관리자 페이지와 일반 웹 API의 인증/권한/요청 위조 방어를 한 단계 올린다.
3. 이후 Android / Galaxy UI 개선과 별개로 서버 보안 작업을 추적 가능한 단위로 나눈다.

---

## 1) 현재 판단 요약

빠른 정적 점검 기준으로는 다음과 같이 본다.

- 치명적인 인증 우회나 공개 admin 노출은 현재 코드에서 바로 보이지 않는다.
- 기본 보안 헤더, 쿠키 옵션, 세션 재검증, 로그인 rate limit 같은 기본기는 갖춰져 있다.
- 하지만 admin 운영 관점에서는 아직 "기본선 통과" 수준이고,
  `CSRF/Origin 방어`, `admin 추가 보호`, `CSP/쿠키 범위 최소화`는 다음 단계로 필요하다.

즉, 지금 상태는:

- `서비스 운영 가능`
- `App Review 대응 가능`
- `보안 하드닝 여지 큼`

---

## 2) 이번 점검에서 본 핵심 포인트

### A. 이미 괜찮은 부분

- `httpOnly`, `secure`, `sameSite=lax` 기반 auth cookie 사용
- JWT + 서버측 auth session(`sid`) 재검증
- `is_admin` DB 재확인 기반 admin gate
- Helmet + CSP + 제한된 CORS host 설정
- 로그인/회원가입/비밀번호 관련 rate limit 적용

### B. 우선 보강이 필요한 부분

- state-changing 요청에 대한 명시적 `CSRF token` 또는 `Origin/Referer` 검증 부재
- admin 접근이 사실상 `일반 로그인 세션 + is_admin` 1단 구조
- CSP와 쿠키/도메인 정책이 현재 제품 운영 요구에 비해 아직 넓을 수 있음

### C. 방금 반영한 경로 정책

- `/support`는 clean URL로만 노출
- `/html/support.html` 직접 접근은 차단
- support 페이지는 `admin`과 유사한 진입 정책으로 정리

---

## 3) 우선순위

### P0. 즉시 하드닝

1. `/support` clean URL 정책을 운영 서버에 재배포해 direct html 접근 차단 반영
2. admin 및 주요 쓰기 API에 `Origin/Referer` 검증 또는 CSRF 방어 추가
3. 운영자가 실제 쓰는 admin 접근 경로를 기준으로 추가 인증 전략 확정

### P1. 관리자 보호 강화

1. admin 접근 시 재인증 정책 도입
2. 가능하면 admin 전용 2차 인증 또는 IP allowlist 적용
3. admin 보안 이벤트 로깅 정리

### P2. 웹 전반 보안 강화

1. CSP에서 불필요하게 넓은 허용 범위 축소
2. auth cookie domain / sameSite 정책 재검토
3. 민감 페이지와 API의 응답 헤더 / 캐시 정책 재점검

### P3. 운영 안정성

1. production 배포 후 보안 스모크 체크리스트 문서화
2. admin 계정 운영 원칙 정리
3. incident 대응 연락 체계 정리

---

## 4) 실행 트랙

## Track A. 경로 정책 고정

목표:

- support 페이지는 `/support`에서만 접근 가능하게 하고,
  예전 html 직접 접근 경로는 막는다.

대상 저장소:

- `../glsoop`

작업:

- `/html/support.html` 404 처리
- `/support` clean URL 유지
- legal/support E2E에 direct path 차단 검증 추가

완료 기준:

- `/support` -> `200`
- `/html/support.html` -> `404`

---

## Track B. 요청 위조 방어

목표:

- 브라우저 기반 state-changing 요청이 의도된 origin에서만 들어오도록 제한한다.

대상 저장소:

- `../glsoop`

후보 방식:

- 1안: state-changing 요청에 `Origin/Referer` 검증 추가
- 2안: admin 및 주요 쓰기 API에 CSRF token 도입
- 권장 순서: 먼저 `Origin/Referer` 검증으로 빠르게 막고, 필요 시 CSRF token으로 확장

대상 엔드포인트 우선순위:

- `POST/PUT/PATCH/DELETE /api/admin/**`
- 로그인 상태에서 쓰기 성격을 가지는 사용자 액션 API

완료 기준:

- 허용 origin 외 브라우저 요청 차단
- 정상 웹/앱 플로우 영향 없음
- admin 주요 기능 smoke test 통과

---

## Track C. Admin 추가 보호

목표:

- admin 권한 탈취 시 피해 범위를 줄인다.

대상 저장소:

- `../glsoop`

후보 방식:

- admin 페이지 진입 시 최근 재인증 확인
- admin 전용 OTP 또는 이메일 확인
- 운영 고정 IP가 가능하면 allowlist 적용

결정해야 할 것:

- 관리자 수
- 관리자 접속 위치 고정 여부
- OTP/TOTP 도입 허용 여부

완료 기준:

- 일반 사용자 세션만 탈취해서는 admin 접근이 어렵다
- 운영자가 실제로 감당 가능한 수준의 UX 유지

---

## Track D. CSP / Cookie / Header 축소

목표:

- 현재 허용 범위가 넓은 보안 정책을 실제 사용 범위에 맞게 줄인다.

대상 저장소:

- `../glsoop`

작업 후보:

- `style-src 'unsafe-inline'` 축소 가능성 검토
- `crossOriginResourcePolicy` 범위 재검토
- `AUTH_COOKIE_DOMAIN` 필요 범위 재확인
- 민감 응답 캐시 정책 점검

완료 기준:

- 실제 사용하는 리소스만 허용
- 기존 페이지 동작 회귀 없음

---

## 5) 검증 계획

### 자동 검증

- support / legal route E2E
- admin smoke test
- 주요 인증 흐름 회귀 테스트

### 수동 검증

- 비로그인 사용자로 `/support` 접근
- `/html/support.html` 직접 접근 차단 확인
- admin 로그인 / 진입 / 주요 작업 확인
- 비정상 origin 또는 차단 시나리오 확인

---

## 6) 내가 추가로 받아야 하는 정보

다음 4개가 있으면 하드닝 설계를 더 정확히 고정할 수 있다.

1. admin 계정이 몇 명인지
2. admin이 접속하는 고정 장소나 고정 IP가 있는지
3. admin 2차 인증으로 `이메일 OTP`, `TOTP`, `IP 제한` 중 어떤 방식이 현실적인지
4. `m.glsoop.com`과 `www.glsoop.com` 사이에서 auth cookie를 반드시 공유해야 하는지

---

## 7) 추천 실행 순서

1. `Track A` 운영 반영 확인
2. `Track B` 먼저 구현
3. `Track C` 정책 확정 후 구현
4. `Track D`는 회귀 테스트 여유가 있을 때 진행

---

## 8) 현재 상태 메모

- `2026-04-04`: `/support` clean URL 추가 완료
- `2026-04-04`: `/html/support.html` 직접 접근 차단 코드 반영 완료
- `2026-04-04`: 빠른 정적 점검 기준으로
  - critical auth bypass 미발견
  - medium 수준의 추가 하드닝 필요 항목 존재
