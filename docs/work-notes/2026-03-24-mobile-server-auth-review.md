# 2026-03-24 작업 노트 (모바일/서버 인증-세션-계정관리 코드 리뷰)

- 문서 타입: `Work Note`
- 적용 범위: `glsoop-mobile/docs/work-notes/2026-03-24-mobile-server-auth-review.md`
- 대상 독자: 모바일/서버 개발자, QA
- 상태: `Draft`
- 최종 업데이트: `2026-03-24`
- Owner: `taehun`
- 관련 문서:
  - `docs/work-notes/2026-03-20-mobile-server-gap.md`
  - `docs/work-notes/2026-03-23-expo-login-paper-followup.md`
  - `src/auth/AuthGate.tsx`
  - `src/screens/AuthLogin.tsx`
  - `src/navigation/TabsBar.tsx`
  - `src/screens/Home.tsx`
  - `src/screens/PostDetail.tsx`
  - `src/screens/Author.tsx`
  - `src/lib/routeAccess.ts`
  - `../glsoop/routes/authRoutes.js`
  - `../glsoop/middleware/auth.js`
  - `../glsoop/utils/accountLifecycle.js`
  - `../glsoop/tests/e2e/auth-session-management.spec.js`
  - `../glsoop/tests/e2e/auth-funnel-mobile.spec.js`

---

## 1. 리뷰 배경

최근 모바일과 서버 양쪽에서 다음 성격의 변경이 연속으로 들어갔다.

- 모바일
  - App Store readiness 정리
  - `내 정보` → `프로필 홈 + 계정 센터` 재구성
  - 게스트도 읽기 가능한 공개/보호 라우트 분리
  - 세션 강제 해제 대응 강화
- 서버
  - 계정 비활성화 / 즉시 삭제 도입
  - 재활성화 로그인 분기 추가
  - 세션 정리 E2E 보강

이 문서는 위 흐름을 기준으로 모바일 `glsoop-mobile` 과 서버 `glsoop` 을 함께 코드 리뷰한 결과를 남긴다.

리뷰 범위는 다음에 집중했다.

- 인증/세션
- 계정 비활성화/재활성화/삭제
- 공개/보호 라우트 분리
- 모바일-서버 계약 정합성

---

## 2. 요약 결론

전체적으로 방향은 맞다.

- 서버는 계정 비활성화/삭제 계약과 테스트를 이미 꽤 잘 갖추고 있다.
- 모바일도 공개 읽기 + 회원 전용 행동 차단 방향으로 구조가 정리되고 있다.

하지만 지금 바로 확인된 중요한 갭이 있다.

1. 모바일 로그인 화면이 서버의 `reactivation_required` 계약을 아직 처리하지 못한다.
2. 서버 `POST /api/login/reactivate` 는 기존 로그인 보안 정책과 완전히 같은 수준으로 묶여 있지 않다.
3. 모바일 `AuthGate` 가 일시적 서버 장애를 실제 인증 실패처럼 취급할 수 있다.

즉, “구조는 좋아지고 있지만, 인증 분기 하나와 에러 처리 하나는 지금 보완하지 않으면 운영 중 실제 사용자 문제가 생길 수 있는 상태”로 보는 게 맞다.

---

## 3. 주요 Findings

### Finding 1. 모바일이 계정 재활성화 로그인 계약을 아직 처리하지 못함

- 심각도: `High`
- 영향 범위:
  - 비활성화한 사용자의 모바일 재로그인
  - 서버/웹과 모바일 UX 불일치

#### 근거

서버는 비활성화 계정 로그인 시 즉시 토큰을 발급하지 않고, 먼저 재활성화 확인이 필요하다는 응답을 반환한다.

- 서버 응답 분기:
  - [authRoutes.js](/Users/gimtaehun/2026/workspace/projects/glsoop/routes/authRoutes.js#L1581)
- 서버 재활성화 엔드포인트:
  - [authRoutes.js](/Users/gimtaehun/2026/workspace/projects/glsoop/routes/authRoutes.js#L1605)
- 서버 모바일 퍼널 테스트:
  - [auth-funnel-mobile.spec.js](/Users/gimtaehun/2026/workspace/projects/glsoop/tests/e2e/auth-funnel-mobile.spec.js#L172)

반면 모바일 로그인 화면은 `/api/login` 응답을 사실상 `ok + token` 전제로만 처리한다.

- 모바일 로그인 처리:
  - [AuthLogin.tsx](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/src/screens/AuthLogin.tsx#L43)

현재 흐름은 이렇다.

- 서버가 `ok: true`, `reactivation_required: true`, `scheduled_purge_at` 를 반환
- 모바일은 토큰이 없다고 보고
- `"서버 인증 정보를 확인할 수 없어요"` 메시지로 종료

#### 왜 문제인가

모바일에서는 이미 계정 비활성화 실행이 가능하다. 그런데 비활성화 후 복귀는 모바일에서 완결되지 않는다.

즉, 사용자는 앱 안에서 비활성화는 할 수 있는데 앱 안에서 자연스럽게 되돌아오지는 못한다. 이건 단순 후속 개선이 아니라 실제 계정 라이프사이클 계약 미흡이다.

#### 권장 액션

- 모바일 `AuthLogin` 에 `reactivation_required` 분기 추가
- 재활성화 확인 모달 또는 전용 단계 추가
- `POST /api/login/reactivate` 호출 후 기존 로그인 성공 흐름으로 연결
- 서버의 `scheduled_purge_at` 를 사용자 안내 문구에 반영

---

### Finding 2. 서버 `POST /api/login/reactivate` 가 기존 로그인 보안 흐름을 우회함

- 심각도: `Medium-High`
- 영향 범위:
  - 계정 잠금 정책 일관성
  - 로그인 실패 추적
  - 보안 감사 로그

#### 근거

기존 로그인은 잠금 상태 확인, 실패 누적, 잠금 전환, 로그인 이벤트 기록을 수행한다.

- 일반 로그인 잠금/실패 처리:
  - [authRoutes.js](/Users/gimtaehun/2026/workspace/projects/glsoop/routes/authRoutes.js#L1510)
  - [authRoutes.js](/Users/gimtaehun/2026/workspace/projects/glsoop/routes/authRoutes.js#L1532)

하지만 `POST /api/login/reactivate` 쪽은 같은 `loginLimiter` 는 쓰지만, 아래가 빠져 있다.

- 계정 단위 잠금 상태 조회
- 실패 누적/잠금 전환
- 실패 이벤트 기록 정렬

관련 코드:

- [authRoutes.js](/Users/gimtaehun/2026/workspace/projects/glsoop/routes/authRoutes.js#L1605)

#### 왜 문제인가

비활성화 계정은 별도 인증 엔드포인트가 하나 더 생긴 셈이다. 이 엔드포인트가 기존 로그인보다 느슨하면 아래 문제가 생긴다.

- 잠금 정책 우회
- 로그인 실패 데이터 누락
- 운영 시 “왜 이 계정은 잠금이 안 걸렸지?” 같은 감사 불일치

#### 권장 액션

- `login/reactivate` 에도 일반 로그인과 동일한 잠금/실패 추적 정책 적용
- 실패/잠금 로그를 공통 함수로 묶어 중복 분기 제거
- 일반 로그인과 재활성화 로그인 모두 같은 감사 기준으로 맞추기

---

### Finding 3. 모바일 `AuthGate` 가 일시적 서버 장애를 인증 실패처럼 취급할 수 있음

- 심각도: `Medium`
- 영향 범위:
  - 보호 화면 진입 UX
  - 세션 만료와 서버 장애의 구분

#### 근거

모바일은 보호 화면 접근 시 `/api/me` 로 토큰 유효성을 다시 확인한다.

- 인증 게이트:
  - [AuthGate.tsx](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/src/auth/AuthGate.tsx#L47)

문제는 `401/403` 이 아닌 경우에도, 보호 화면이면 로그인 화면으로 보내는 분기가 있다는 점이다.

- 비인증 외 오류 처리:
  - [AuthGate.tsx](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/src/auth/AuthGate.tsx#L87)

즉 다음 케이스가 섞일 수 있다.

- 실제 세션 만료
- `/api/me` 의 일시적 `500`
- 순간 네트워크 오류

#### 왜 문제인가

사용자 입장에서는 “로그아웃됐다”고 느끼지만, 실제로는 토큰이 살아 있고 서버만 잠깐 흔들린 상황일 수 있다.

지금처럼 공개/보호 라우트를 나누는 구조에서는 더더욱,

- `401/403` 은 인증 실패로 분기
- 그 외는 에러 상태/재시도 상태로 남기기

가 더 자연스럽다.

#### 권장 액션

- `401/403` 만 강제 로그아웃/로그인 리다이렉트
- 나머지 오류는 보호 화면 내 에러 상태로 유지
- 최소한 네트워크/500 과 인증 실패는 UX 상 분리

---

## 4. 코드상 확인된 긍정 요소

아래는 현재 좋은 방향으로 보이는 부분이다.

### 4.1 서버 계정 정리 로직 자체는 구조가 나쁘지 않음

- 계정 비활성화 / 삭제 유틸 분리:
  - [accountLifecycle.js](/Users/gimtaehun/2026/workspace/projects/glsoop/utils/accountLifecycle.js#L85)
- 비활성화 시 purge 예정 시각 저장:
  - [accountLifecycle.js](/Users/gimtaehun/2026/workspace/projects/glsoop/utils/accountLifecycle.js#L174)
- 삭제 시 관련 테이블 정리 및 세션 삭제 포함:
  - [accountLifecycle.js](/Users/gimtaehun/2026/workspace/projects/glsoop/utils/accountLifecycle.js#L119)

특히 `auth_sessions` 정리가 purge 로직 안에 포함된 점은 좋다.

### 4.2 서버 테스트 보강이 잘 들어가 있음

- 전체 로그아웃 후 `/api/me` 401 확인
- 비활성화 후 세션 revoke 확인
- grace period 내 재활성화 확인
- grace period 만료 후 purge 확인
- delete mode 즉시 삭제 확인

관련 테스트:

- [auth-session-management.spec.js](/Users/gimtaehun/2026/workspace/projects/glsoop/tests/e2e/auth-session-management.spec.js#L295)

### 4.3 모바일 공개/보호 라우트 분리 방향은 타당함

- 보호 라우트 판별:
  - [routeAccess.ts](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/src/lib/routeAccess.ts#L1)
- 탭/FAB 로그인 유도:
  - [TabsBar.tsx](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/src/navigation/TabsBar.tsx#L40)
- 홈/상세/작가 화면에서 회원 전용 행동만 로그인 유도:
  - [Home.tsx](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/src/screens/Home.tsx)
  - [PostDetail.tsx](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/src/screens/PostDetail.tsx)
  - [Author.tsx](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/src/screens/Author.tsx)

이 방향 자체는 지금 제품 상황에 맞다.

---

## 5. 우선순위 제안

### P0

1. 모바일 `reactivation_required` 대응 추가

이건 가장 먼저 해야 한다. 계정 비활성화 기능을 노출한 이상, 복귀 경로도 앱에서 최소한 지원돼야 한다.

### P1

2. 서버 `login/reactivate` 를 일반 로그인과 같은 보안 정책으로 정렬
3. 모바일 `AuthGate` 에서 비인증 오류와 인증 오류 분리

### P2

4. 모바일/서버 공통 auth contract 문서화
5. 게스트 모드에서의 CTA/카피 정리

---

## 6. 추천 후속 작업

### 모바일

- `AuthLogin` 에 재활성화 분기 추가
- 재활성화 확인 UI 추가
- `POST /api/login/reactivate` 연동
- deactivate 성공 후 다시 로그인 시나리오 QA

### 서버

- `login/reactivate` 에 잠금/실패 누적/로그 이벤트 정렬
- 필요 시 공통 로그인 성공/실패 함수 재사용 범위 확대

### QA

- 모바일에서 비활성화 → 로그인 → 재활성화 → 메인 진입
- grace period 지난 계정 로그인 시도
- 서버 `/api/me` 일시 실패 시 보호 화면 UX
- 두 기기 로그인 상태에서 `logout-all` 이후 각 화면 동작

---

## 7. 리뷰 범위와 한계

이번 리뷰는 코드 읽기 중심으로 진행했다.

- 모바일 전체 기능을 전부 실행해본 것은 아님
- 서버 전체 라우트를 모두 검토한 것은 아님
- 하지만 인증/세션/계정 관리/공개 라우트와 직접 연결된 핵심 경로는 확인함

따라서 이 문서는 “전체 시스템 완전 감사”라기보다,

- 현재 변경 흐름에서 실제 사고 가능성이 높은 지점
- 모바일-서버 계약이 어긋난 지점

을 먼저 잡아내는 목적의 리뷰 노트로 보는 것이 맞다.

---

## 8. 한 줄 결론

지금 가장 중요한 건 `모바일 재활성화 로그인 미지원` 해결이다.

서버는 이미 그 계약을 요구하고 있고, 모바일은 아직 그 분기를 모르기 때문에, 이 상태로는 계정 비활성화 기능이 모바일에서 완결되지 않는다.
