# 2026-03-20 작업 노트 (모바일: 글숲)

- 문서 타입: `Work Note`
- 적용 범위: `glsoop-mobile/docs/work-notes/2026-03-20-mobile-server-gap.md`
- 대상 독자: 모바일/서버 개발자, QA
- 상태: `Draft`
- 최종 업데이트: `2026-03-21`
- Owner: `taehun`
- 관련 문서:
  - `docs/api/README.md`
  - `docs/api/auth.md`
  - `docs/api/posts.md`
  - `docs/api/users.md`
  - `docs/api/interactions.md`
  - `docs/api/growth.md`
  - `../glsoop/docs/참고/API-레퍼런스.md`

---

## 1. 배경 및 이번 정리 기준 변경

이 문서는 "서버에 라우트가 있는데 모바일이 안 붙은 항목"만 적는 메모가 아니다.

이번 기준은 서버 웹에서 이미 실제 사용자 플로우로 동작하는 기능까지 포함해, 모바일이 아직 따라오지 못한 사용자 기능 갭을 다시 정리하는 것이다.

즉, 기준은 아래 순서다.

1. 서버 웹 페이지에서 사용자 기능이 실제 노출되는가
2. 해당 기능을 뒷받침하는 API/스크립트/E2E 근거가 있는가
3. 모바일에서 같은 사용자 행동이 가능한가

이 기준으로 보면 모바일은 이미 피드/검색/북마크/성장/코스메틱 등 핵심 뼈대는 상당 부분 붙어 있다. 반면 인증 보조 흐름, 마이페이지, 소셜, 글 편집, 상세 보조 기능은 서버 웹 대비 아직 차이가 크다.

추가로 이번 재검토에서 확인한 핵심은, 일부 항목은 단순히 "화면이 없다" 수준의 갭이 아니라 서버 계약과 모바일 구현이 직접 충돌하는 런타임 차단 위험이라는 점이다. 특히 회원가입 필수 동의/버전 검증, 네이티브 로그인 토큰 처리, 작가 글 목록 페이지네이션 계약은 기능 우선순위보다 먼저 다뤄야 한다.

## 2. 비교 기준

### 2.1 서버 선구현으로 인정한 기준

- `../glsoop/public/html/*`에서 진입 페이지가 존재한다.
- `../glsoop/public/js/*`에서 실제 사용자 액션이 구현되어 있다.
- 필요 시 `../glsoop/routes/*` 또는 `../glsoop/tests/e2e/*`에서 API/플로우 근거를 보강한다.

### 2.2 모바일 구현 상태 판정 기준

- `구현됨`: 모바일에 같은 사용자 기능이 있고 화면, 상태, API 연결이 있으며 서버 필수 검증을 통과하는 해피패스가 확인된다.
- `부분 구현`: 핵심 기능 일부만 있거나 서버 웹의 중요한 UX/보조 흐름이 빠져 있다.
- `미구현`: 서버 웹에서 실제 동작이 확인되는데 모바일에는 화면/서비스/플로우가 없다.
- `범위 제외`: 관리자 기능, 운영 통계, 웹 전용 표현 최적화.

### 2.3 이번 비교에 포함한 모바일 근거 경로

- 화면: `src/screens/*`, `app/*`
- 기능 훅: `src/features/*`
- 서비스/API 연결: `src/services/*`
- 전역 인증: `src/auth/AuthGate.tsx`

### 2.4 관련 문서 신뢰도 메모

- `docs/api/auth.md`, `docs/api/posts.md` 등 일부 모바일 API 문서는 현재 서버 구현 및 모바일 실제 호출과 어긋나는 부분이 있다.
- 따라서 이 작업 노트에서는 관련 문서를 참고 링크로만 두고, 판정의 최종 근거는 서버 코드/서버 웹 스크립트/모바일 실제 코드로 잡는다.
- 후속 작업으로 API 문서 정정 또는 상태 재분류(`Draft` 유지/`Deprecated` 검토)가 필요하다.

### 2.5 관련 문서 상태 기준

- 핵심 엔드포인트 2개 이상이 실제 구현과 다르면 해당 문서는 `Deprecated` 후보로 본다.
- 핵심 엔드포인트 1개만 어긋나도 신규 구현의 정답 소스로는 쓰지 않는다.
- 정정 전까지 PR/QA에서는 이 작업 노트와 서버 코드 경로를 우선 근거로 삼는다.

### 2.6 Gap-ID 규칙

- 선행 게이트와 주요 구현 묶음에는 `Gap-ID`를 붙인다.
- 형식: `<도메인>-<우선순위>-<번호>`
- 예시:
  - `AUTH-P0-01`
  - `AUTHOR-P0-01`
  - `ME-P1-01`
  - `EDITOR-P1-01`

## 3. 선행 게이트: 계약/데이터 모델 갭

### 3.1 Gap-ID 상태 업데이트

| Gap-ID | 현재 상태 | 마지막 반영일 | 근거 | 남은 이슈 |
| --- | --- | --- | --- | --- |
| `AUTH-P0-01` | `진행 중` | `2026-03-21` | `src/screens/AuthSignup.tsx`에 runtime-config 연동, 필수 동의 UI, signup legal fields, field error 표시를 반영함. `npm run lint` 통과 | 실제 서버 호출 기준 signup 해피패스 검증, OTP까지 포함한 E2E 확인 필요 |
| `AUTH-P0-02` | `정책 결정 필요` | `2026-03-21` | 서버는 로그인 응답에 `token`을 내려주지 않고, 모바일 네이티브는 token 기반 완료를 기대함 | 네이티브 인증을 쿠키 세션으로 갈지 Bearer로 갈지 결정 필요 |
| `AUTH-P0-03` | `정책 결정 필요` | `2026-03-21` | 현재 모바일 저장소는 `AsyncStorage` 기반 | 인증 정책 확정 후 secure storage 전환 여부 결정 필요 |
| `AUTHOR-P0-01` | `진행 중` | `2026-03-21` | `src/features/users/useAuthorPosts.ts`를 `offset/limit + has_more` 기준으로 재설계했고 중복 append 방지 merge를 추가했다. `npm run lint` 통과 | 실제 목록/더보기/새로고침 기준으로 중복 없는지 런타임 검증 필요 |
| `DOCS-P1-01` | `반영됨` | `2026-03-21` | `docs/api/auth.md`, `docs/api/posts.md`를 현재 서버 라우트와 모바일 실제 호출 기준으로 재작성했다 | 나머지 API 문서도 같은 기준으로 순차 점검 필요 |

아래 항목은 단순 기능 추가보다 먼저 정리되어야 하는 선행 게이트다.

| Gap-ID | 항목 | 현재 확인 내용 | 영향 | 권장 조치 | 우선순위 |
| --- | --- | --- | --- | --- | --- |
| `AUTH-P0-01` | 회원가입 필수 동의/버전 필드 | 서버 `POST /api/signup`은 `age_confirmed`, `terms_agreed`, `privacy_agreed`, `terms_version`, `privacy_version`를 검증한다. 모바일 `AuthSignup.tsx`는 `{ name, nickname, email, pw }`만 전송한다 | 가입 해피패스가 서버에서 400/409로 차단될 수 있음 | 모바일 가입 UI/요청 바디를 서버 정책에 맞게 수정하고, 성공 E2E를 다시 확보 | P0 |
| `AUTH-P0-02` | 네이티브 로그인 인증 방식 | 서버 로그인 응답은 쿠키 세션 중심이고 응답 body에 `token`을 주지 않는다. 모바일은 비웹 플랫폼에서 토큰 없이는 로그인 완료 처리를 못 한다 | 웹은 동작 가능하지만 네이티브 앱 로그인 전략이 불안정함 | 쿠키 세션 유지 여부 vs Bearer 토큰 공식 지원 여부를 서버/모바일 공통 정책으로 먼저 확정 | P0 |
| `AUTH-P0-03` | 인증 저장소 전략 | 모바일 auth token 저장소가 `AsyncStorage`다 | 인증 전략 확정 후 보안 저장소 전환 필요 가능성 큼 | 네이티브 인증 모델이 토큰 기반이면 Keychain/Keystore 계열 저장소로 전환 검토 | P0 |
| `AUTHOR-P0-01` | 작가 글 목록 페이지네이션 | 모바일 `useAuthorPosts`는 `cursor`/`nextCursor`를 기대하지만 서버 패턴은 `limit/offset` + `has_more` 기반이다 | 중복 append, loadMore 오동작, hasMore 판정 불안정 가능 | `users/:id/posts` 계약을 서버 기준으로 다시 고정하고 모바일 훅 정리 | P0 |
| `DOCS-P1-01` | 응답 키/메서드 문서 불일치 | `docs/api/*.md` 일부 내용이 실제 서버 구현과 다르다 | 신규 개발자/QA가 잘못된 스펙을 기준으로 판단할 수 있음 | 작업 노트 반영 후 API 문서 정정 또는 상태 강등 | P1 |

## 4. 기능 갭 요약

### 4.1 구현 상태 요약

| 기능군 | 현재 판단 | 메모 |
| --- | --- | --- |
| 인증/계정 | 런타임 리스크를 포함한 부분 구현 | 로그인/OTP 화면은 있으나 가입 필수 동의/버전, 네이티브 인증 방식, 비밀번호 재설정, 세션 관리가 비어 있음 |
| 마이페이지/내 활동 | 미구현에 가까운 부분 구현 | 모바일 `Me`는 조회 중심. 서버 웹 `mypage`의 수정/목록/세션/설정 흐름이 거의 없음 |
| 작가 페이지/소셜 | 계약 갭을 동반한 부분 구현 | 작가 프로필/글 목록은 있으나 팔로우, 정렬, share/overflow, about 토글이 없고 posts 페이지네이션 계약도 재점검 필요 |
| 게시글 상세/상호작용 | 부분 구현 | 좋아요, 북마크 모달, 공유 이벤트는 있음. 관련 글, 작성자 전용 관리 흐름은 없음 |
| 작성/수정/드래프트 | 부분 구현 | 새 글 작성과 로컬 드래프트는 있음. 기존 글 편집, 레이아웃 편집, 해시태그 칩은 없음 |
| 검색/탐색 | 부분 구현 | 검색과 일반 피드는 있음. 서버 웹 `following` 피드 분기가 없음 |
| 북마크 | 부분 구현 | 목록/생성/수정/삭제/아이템 조회는 있음. 나머지 개선은 폴더 UX 다듬기 수준 |
| 성장/코스메틱 | 부분 구현 | 요약/업적/퀘스트/코스메틱은 있음. `top_posts`는 pending 성격이 남아 있음 |

### 4.2 P0 선행 게이트

- 회원가입 필수 동의/버전 검증 반영
- 네이티브 로그인 인증 방식 확정
- 인증 저장소 전략 정리
- 작가 글 목록 페이지네이션 계약 정리
- 관련 API 문서의 정답 소스 재지정

#### P0 정책 결정 문장

- `web`은 서버의 쿠키 세션 정책을 유지한다.
- `ios/android`는 아래 둘 중 하나를 명시적으로 결정 완료 상태로 둔다.
  - `옵션 A` 쿠키 세션 유지: 네이티브에서 쿠키 유지, 만료, 리다이렉트 후 인증 복귀까지 검증한다.
  - `옵션 B` Bearer 토큰 공식 지원: 로그인 응답 또는 별도 발급 경로, 저장소, 만료 정책을 함께 고정한다.
- 네이티브 인증 정책이 문서와 코드에 동시에 반영되기 전까지 로그인 항목은 `구현됨`으로 올리지 않는다.

### 4.3 P1 우선순위

- 마이페이지/내 활동 보강
  - 프로필 수정
  - 내 글/좋아요한 글/팔로잉 목록
  - 작성 글 삭제
  - 세션 조회/전체 로그아웃
- 작가 페이지 소셜 보강
  - 팔로우/언팔로우
  - 최신 글 CTA
  - 정렬 전환
- 글 편집 흐름 추가
  - 편집용 조회
  - 수정 저장
  - 기존 글 기반 드래프트 복구

### 4.4 P2 우선순위

- 비밀번호 재설정 전체 플로우
- 상세의 관련 글 섹션
- 피드 `following` 분기
- 북마크 폴더 수정 UI

### 4.5 P3 우선순위

- 작가 페이지 overflow/share 보강
- editor 레이아웃 편집/해시태그 칩/미리보기 강화
- 성장 `top_posts`를 실제 데이터 중심으로 고도화

## 5. 기능군별 상세 표

### 5.1 인증/계정

| 기능 | 서버 웹 구현 근거 | 서버 API 근거 | 모바일 현재 상태 | 차이 메모 | 우선순위 |
| --- | --- | --- | --- | --- | --- |
| 로그인 | `../glsoop/public/html/login.html`, `../glsoop/public/js/login.js` | `../glsoop/routes/authRoutes.js` `POST /login` | `부분 구현` | 웹 쿠키 세션 기준으로는 동작 가능하지만, 네이티브 앱은 토큰 없는 로그인 응답 처리 전략이 확정되지 않았다 | P0 |
| 로그인 후 guard/redirect | `../glsoop/routes/authPageRoutes.js`, `../glsoop/tests/e2e/auth-page-guard.spec.js` | `GET /api/me` | `부분 구현` | 모바일은 `(auth)` vs `(tabs)` 전역 게이트는 있음. 서버 웹의 `next/from` 기반 세밀한 redirect UX는 없음 | P2 |
| 회원가입 + 이메일 인증 | `../glsoop/public/html/signup.html`, `../glsoop/public/js/signup.js`, `../glsoop/public/js/verify-email.js` | `POST /signup`, `POST /verify-email`, `POST /verify-email/resend` | `부분 구현` | OTP 단계 자체는 있으나, 현재 요청 바디가 서버 필수 동의/버전 검증을 통과하지 못해 가입 해피패스가 보장되지 않는다 | P0 |
| 회원가입 시 법적 동의/버전 검증 | `../glsoop/tests/e2e/auth-signup-consent.spec.js` | `GET /api/runtime-config`, `POST /api/signup` | `부분 구현` | 모바일 가입 화면에 필수 동의와 version payload는 반영했다. 다만 실제 서버 기준 해피패스 검증과 OTP까지 포함한 종단 확인이 남아 있다 | P0 |
| 비밀번호 찾기/재설정 요청 | `../glsoop/public/html/forgot-password.html`, `../glsoop/public/js/forgot-password.js` | `POST /api/password-reset-request` | `미구현` | 모바일 auth 흐름에 진입점 자체가 없음 | P2 |
| 재설정 토큰 검증/새 비밀번호 저장 | `../glsoop/public/html/reset-password.html`, `../glsoop/public/js/reset-password.js` | `POST /api/password-reset/validate`, `POST /api/password-reset` | `미구현` | 토큰 검증, 강도 체크, 완료 후 로그인 이동 흐름이 모두 없음 | P2 |
| 전체 로그아웃 | `../glsoop/public/js/mypage.js`, `../glsoop/tests/e2e/mypage-redesign.spec.js` | `POST /api/logout-all` | `미구현` | 모바일 `src/screens/Me.tsx`는 현재 기기 로그아웃만 있음 | P1 |
| 세션 목록 조회 | `../glsoop/public/js/mypage.js`, `../glsoop/tests/e2e/mypage-redesign.spec.js` | `GET /api/me/sessions` | `미구현` | 모바일에 세션 목록 UI가 없음 | P1 |

### 5.2 마이페이지/내 활동

| 기능 | 서버 웹 구현 근거 | 서버 API 근거 | 모바일 현재 상태 | 차이 메모 | 우선순위 |
| --- | --- | --- | --- | --- | --- |
| 내 정보 요약 조회 | `../glsoop/public/html/mypage.html`, `../glsoop/public/js/mypage.js` | `GET /api/me` | `구현됨` | 모바일 `src/screens/Me.tsx`에서 기본 프로필/레벨/팔로워 수 조회 | 유지 |
| 프로필 수정 | `../glsoop/public/js/mypage.js`, `../glsoop/tests/e2e/mypage-redesign.spec.js` | `PUT /api/me` | `미구현` | 모바일 `Me`는 조회만 하고 수정 폼이 없음 | P1 |
| 내 글 목록 | `../glsoop/public/js/mypage.js`, `../glsoop/tests/e2e/mypage-redesign.spec.js` | `GET /api/posts/my` | `미구현` | 모바일에 마이페이지 내 글 탭이 없음 | P1 |
| 좋아요한 글 목록 | `../glsoop/public/js/mypage.js`, `../glsoop/tests/e2e/mypage-redesign.spec.js` | `GET /api/posts/liked` | `미구현` | 모바일에 좋아요한 글 목록 화면이 없음 | P1 |
| 팔로잉 목록 | `../glsoop/public/js/mypage.js`, `../glsoop/tests/e2e/mypage-redesign.spec.js` | `GET /api/me/followings` | `미구현` | 모바일은 숫자만 보이고 실제 목록 진입이 없음 | P1 |
| remember login 등 계정 설정 | `../glsoop/public/js/mypage.js`, `../glsoop/tests/e2e/mypage-redesign.spec.js` | `PUT /api/me` | `미구현` | 서버 웹은 `remember_login_enabled`를 편집한다. 모바일은 관련 UI가 없음 | P1 |
| 성장 요약 카드 노출 | `../glsoop/public/js/mypage.js` | `GET /api/growth/summary` | `부분 구현` | 모바일은 `Me` 자체에서 별도 성장 요약 카드를 보여주지 않고, 성장 탭으로 분리되어 있음 | P2 |
| 작성 글 삭제 | `../glsoop/public/js/mypage.js`, `../glsoop/tests/e2e/mypage-redesign.spec.js` | `DELETE /api/posts/:id` | `미구현` | 모바일에 내 글 관리/삭제 진입점이 없음 | P1 |

### 5.3 작가 페이지/소셜

| 기능 | 서버 웹 구현 근거 | 서버 API 근거 | 모바일 현재 상태 | 차이 메모 | 우선순위 |
| --- | --- | --- | --- | --- | --- |
| 작가 프로필/작성 글 목록 | `../glsoop/public/html/author.html`, `../glsoop/public/js/author.js` | `GET /api/users/:id/profile`, `GET /api/users/:id/posts` | `부분 구현` | 모바일 `useAuthorPosts`를 서버 `offset/has_more` 패턴으로 맞췄다. 다만 실제 목록/더보기 기준 런타임 검증과 나머지 소셜 UX 보강이 남아 있다 | P0 |
| 팔로우/언팔로우 | `../glsoop/public/js/author.js`, `../glsoop/tests/e2e/author-cta-flow.spec.js` | `POST /api/users/:id/follow` | `미구현` | 모바일 작가 화면에 follow 버튼 자체가 없음 | P1 |
| 최신 글 CTA | `../glsoop/public/js/author.js`, `../glsoop/tests/e2e/author-cta-flow.spec.js` | `GET /api/users/:id/posts` | `미구현` | 모바일은 목록은 있지만 별도 최신 글 CTA는 없음 | P1 |
| 소개문 접기/펼치기 | `../glsoop/public/js/author.js` | `GET /api/users/:id/profile` | `미구현` | 모바일 `Author.tsx`는 bio를 고정 출력 | P2 |
| 정렬 전환 | `../glsoop/public/js/author.js` | `GET /api/users/:id/posts` 정렬 쿼리 사용 | `미구현` | 모바일 `useAuthorPosts`는 페이지네이션 중심이며 정렬 UI가 없고, 그 전에 목록 계약 정리가 선행돼야 한다 | P1 |
| overflow/share 동작 | `../glsoop/public/js/author.js`, `../glsoop/tests/e2e/author-overflow-actions.spec.js` | 공유는 클라이언트 중심 | `미구현` | 모바일 작가 화면에는 share/overflow가 없음 | P3 |
| 내 프로필일 때 프로필 꾸미기 진입 | `../glsoop/public/js/author.js` | `GET /api/users/:id/profile` | `구현됨` | 모바일 `Author.tsx`에서 own profile이면 `profile-customize` 이동 가능 | 유지 |

### 5.4 게시글 상세/상호작용

| 기능 | 서버 웹 구현 근거 | 서버 API 근거 | 모바일 현재 상태 | 차이 메모 | 우선순위 |
| --- | --- | --- | --- | --- | --- |
| 글 상세 조회 | `../glsoop/public/html/post.html`, `../glsoop/public/js/post.js` | `GET /api/posts/:id` | `구현됨` | 모바일 `src/features/posts/usePost.ts` + `src/screens/PostDetail.tsx` | 유지 |
| 좋아요 | `../glsoop/public/js/post.js`, `../glsoop/tests/e2e/post-mobile-actions.spec.js` | `POST /api/posts/:id/toggle-like` | `구현됨` | 모바일 상세/작가/북마크 목록에서 반영 | 유지 |
| 북마크 모달 | `../glsoop/public/js/post.js`, `../glsoop/public/js/bookmarkModal.js`, `../glsoop/tests/e2e/post-mobile-actions.spec.js` | `/api/bookmarks/*`, `GET /api/posts/:id/bookmarks` | `구현됨` | 모바일 `PostDetail.tsx`에 최근 폴더 + 생성 + 토글 포함 | 유지 |
| 공유 모달/공유 이벤트 | `../glsoop/public/js/post.js` | `POST /api/share-events` | `부분 구현` | 모바일은 시스템 Share + `src/services/shareService.ts` 로그는 있음. 서버 웹의 전용 모달/내보내기 UI는 없음 | P2 |
| 관련 글 노출 | `../glsoop/public/js/post.js`, `../glsoop/tests/e2e/post-mobile-actions.spec.js` | `GET /api/posts/:id/related` | `미구현` | 모바일 상세에는 관련 글 섹션이 없음 | P2 |
| 작성자 전용 삭제/편집 진입 | `../glsoop/public/js/post.js`, `../glsoop/public/js/post3.js` | `GET /api/posts/:id/edit`, `DELETE /api/posts/:id` | `미구현` | 모바일 상세에 작성자 관리 액션이 없음 | P1 |
| 모바일 액션 독 전환 | `../glsoop/public/js/post.js` | 클라이언트 UX | `범위 제외` | 모바일 앱은 네이티브 화면 구조가 달라 웹 전용 표현 최적화로 분류 | 제외 |

### 5.5 작성/수정/드래프트

| 기능 | 서버 웹 구현 근거 | 서버 API 근거 | 모바일 현재 상태 | 차이 메모 | 우선순위 |
| --- | --- | --- | --- | --- | --- |
| 새 글 작성 | `../glsoop/public/html/editor.html`, `../glsoop/public/html/editor2.html`, `../glsoop/public/js/editor.js`, `../glsoop/public/js/editor2.js` | `POST /api/posts` | `구현됨` | 모바일 `src/screens/Write.tsx`, `src/services/postService.ts` | 유지 |
| 로컬 드래프트 저장/복구 | `../glsoop/public/js/editor2.js`, `../glsoop/docs/참고/API-레퍼런스.md` | 서버 draft API 없음, local draft 규칙만 존재 | `부분 구현` | 모바일 `src/services/draftStorage.ts`에 로컬 draft는 있으나 서버 웹처럼 create/edit 키 분리, TTL 정리, 사용자 토큰 기반 충돌 방지는 없음 | P1 |
| 기존 글 편집 진입 | `../glsoop/public/js/editor2.js` | `GET /api/posts/:id/edit` | `미구현` | 모바일 write 화면은 생성 전용 | P1 |
| 수정 저장 | `../glsoop/public/js/editor2.js` | `PUT /api/posts/:id` | `미구현` | 모바일 post update API 사용 코드가 없음 | P1 |
| 드래프트 삭제 | `../glsoop/public/js/editor2.js` | local draft 규칙 | `구현됨` | 모바일 `deleteWriteDraft`, `clearAllWriteDrafts`, `WriteDrafts` 화면 존재 | 유지 |
| 해시태그 칩 | `../glsoop/public/js/editor2.js` | `POST /api/posts` `tags` | `미구현` | 모바일 서비스는 `tags` 필드를 지원하지만 UI 입력이 없다. 서버/문서의 필드명 불일치도 함께 정리해야 한다 | P3 |
| 레이아웃 편집/미리보기 | `../glsoop/public/js/editor2.js`, `../glsoop/public/js/editor2LayoutEditor.js` | `POST /api/posts`, `PUT /api/posts/:id` `layout_json` | `미구현` | 모바일 작성기는 plain text 중심이고 layout 편집이 없음 | P3 |
| 인증 리다이렉트 | `../glsoop/public/js/editor2.js` | `GET /api/me` | `부분 구현` | 모바일은 글로벌 auth gate가 있지만, editor 전용 `next/from` 리다이렉트 UX는 약함 | P2 |

### 5.6 검색/탐색

| 기능 | 서버 웹 구현 근거 | 서버 API 근거 | 모바일 현재 상태 | 차이 메모 | 우선순위 |
| --- | --- | --- | --- | --- | --- |
| 일반 피드 조회 | `../glsoop/public/explore.html`, `../glsoop/public/js/home.js`, `../glsoop/public/js/index.js` | `GET /api/posts`, `GET /api/posts/feed` | `구현됨` | 모바일 `src/features/feed/useFeed.ts`로 일반 피드 지원 | 유지 |
| `following` 피드 분기 | `../glsoop/public/explore.html`, `../glsoop/routes/postRoutes.js` | `GET /api/posts?type=following` | `미구현` | 모바일 feed 훅에 `type=following` 지원이 없음 | P2 |
| 검색 결과 조회 | `../glsoop/routes/searchRoutes.js`, `../glsoop/tests/e2e/search-api.spec.js` | `GET /api/search` | `구현됨` | 모바일 `src/features/search/useSearch.ts`, `src/screens/Search.tsx` | 유지 |
| 검색 결과 정렬 | 서버 웹은 API/페이지 수준 정렬 조합, 모바일은 탭별 client sort | `GET /api/search` | `구현됨` | 모바일이 posts/authors 각각 정렬 제공 | 유지 |
| 검색 결과에서 글/작가 이동 | 서버 검색/탐색 페이지 동작 | `GET /api/search` | `구현됨` | 모바일 `Search.tsx`에서 post detail / author 이동 가능 | 유지 |

### 5.7 북마크

| 기능 | 서버 웹 구현 근거 | 서버 API 근거 | 모바일 현재 상태 | 차이 메모 | 우선순위 |
| --- | --- | --- | --- | --- | --- |
| 폴더 목록 조회 | `../glsoop/public/html/bookmarks.html`, `../glsoop/public/js/bookmarks.js` | `GET /api/bookmarks/lists` | `구현됨` | 모바일 `src/screens/Bookmarks.tsx` | 유지 |
| 폴더 생성 | `../glsoop/public/js/bookmarks.js` | `POST /api/bookmarks/lists` | `구현됨` | 모바일 생성 폼 있음 | 유지 |
| 폴더 수정 | `../glsoop/public/js/bookmarks.js` | `PATCH /api/bookmarks/lists/:listId` | `구현됨` | 모바일 `src/screens/Bookmarks.tsx`에서 이름/설명 수정 UI와 `renameBookmarkList` 연결을 반영했다 | 유지 |
| 폴더 삭제 | `../glsoop/public/js/bookmarks.js` | `DELETE /api/bookmarks/lists/:listId` | `구현됨` | 모바일 폴더 삭제 가능 | 유지 |
| 폴더별 글 목록/더보기 | `../glsoop/public/js/bookmarks.js` | `GET /api/bookmarks/lists/:listId/items` | `구현됨` | 모바일 목록/페이지네이션 있음 | 유지 |
| 글 추가/제거 | `../glsoop/public/js/bookmarkModal.js`, `../glsoop/public/js/bookmarks.js` | `POST/DELETE /api/bookmarks/lists/:listId/items*` | `구현됨` | 모바일 상세 모달과 북마크 화면 모두 지원 | 유지 |
| 최근 사용 폴더 | `../glsoop/public/js/bookmarkModal.js` | `GET /api/bookmarks/lists/recent` | `구현됨` | 모바일 상세 북마크 모달에서 최근 폴더 정렬 지원 | 유지 |

### 5.8 성장/코스메틱

| 기능 | 서버 웹 구현 근거 | 서버 API 근거 | 모바일 현재 상태 | 차이 메모 | 우선순위 |
| --- | --- | --- | --- | --- | --- |
| 성장 대시보드/요약/업적/퀘스트 | `../glsoop/public/html/growth.html`, `../glsoop/public/js/growth-dashboard.js`, `../glsoop/tests/e2e/growth-dashboard.spec.js` | `/api/growth/dashboard`, `/api/growth/summary`, `/api/growth/achievements`, `/api/quests/active` | `구현됨` | 모바일 `src/features/growth/useGrowthData.ts`, `src/screens/Growth.tsx` 등 | 유지 |
| 퀘스트 보상 수령 | `../glsoop/public/js/growth-dashboard.js` | `POST /api/quests/:stateId/claim` | `구현됨` | 모바일 reward claim 연결 완료 | 유지 |
| `top_posts` 노출 | `../glsoop/public/js/growth-dashboard.js` | `GET /api/growth/top-posts`, dashboard 포함 응답 | `부분 구현` | 모바일은 `TopPostsList`가 있고 `useGrowthData`도 타입을 갖지만 pending/ready 성격이 섞여 있어 실제 제품 우선순위 재확인 필요 | P3 |
| 퀘스트 보상 코스메틱 반영 | `../glsoop/routes/growthRoutes.js`, `../glsoop/routes/cosmeticsRoutes.js` | claim + cosmetics API | `부분 구현` | 모바일은 코스메틱 인벤토리/적용은 가능하지만 퀘스트 보상 획득 직후 인벤토리/프로필 반영 UX는 약함 | P2 |
| 프로필 코스메틱 적용 | `../glsoop/routes/cosmeticsRoutes.js`, 서버 작가/마이페이지 카드 렌더링 | `GET /api/cosmetics/me`, `PUT /api/me/profile-cosmetics` | `구현됨` | 모바일 `src/screens/ProfileCustomize.tsx`, `src/features/cosmetics/useMyCosmetics.ts` | 유지 |

## 6. 우선순위 제안

### P0. 기능 개발 전 선행 합의/계약 정리

- 회원가입 필수 동의/버전 필드 반영
- 네이티브 로그인 인증 방식 확정
- 인증 저장소 전략 재정리
- 작가 글 목록 페이지네이션 계약 정리
- `docs/api/*` 정정 또는 상태 강등

### P1. 서버 웹과 기능 체감 차이가 큰 영역

- 마이페이지를 `조회`에서 `관리` 화면으로 확장
  - 프로필 수정
  - 내 글/좋아요한 글/팔로잉 목록
  - 작성 글 삭제
  - 세션 목록/전체 로그아웃
- 작가 페이지 소셜 액션 추가
  - 팔로우
  - 최신 글 CTA
  - 정렬 전환
- 글 편집 흐름 추가
  - `GET /api/posts/:id/edit`
  - `PUT /api/posts/:id`
  - edit draft 분기

### P2. 제품 완성도를 끌어올리는 보조 흐름

- 비밀번호 재설정 전체 플로우
- 상세 관련 글
- 일반 피드 vs 팔로잉 피드 분리
- 북마크 폴더 수정 UI
- 성장 보상 직후 코스메틱 반영 UX

### P3. 고도화/정책 확정이 필요한 영역

- 작가 페이지 overflow/share
- editor 해시태그 칩/레이아웃 편집
- 성장 `top_posts`의 최종 노출 정책

## 7. 다음 구현 묶음 제안

### 묶음 0. 인증/계약 게이트

- 모바일 회원가입 요청을 서버 강제 필드와 맞춘다
  - Gap-ID: `AUTH-P0-01`
  - `age_confirmed`
  - `terms_agreed`
  - `privacy_agreed`
  - `terms_version`
  - `privacy_version`
- 로그인 전략을 플랫폼별로 고정한다
  - Gap-ID: `AUTH-P0-02`
  - 웹: 쿠키 세션 유지
  - 네이티브: 쿠키 세션 유지 가능 여부 또는 Bearer 토큰 공식 지원 여부 확정
- 인증 저장소 전략을 로그인 정책과 함께 고정한다
  - Gap-ID: `AUTH-P0-03`
- `useAuthorPosts`를 서버 페이지네이션 패턴에 맞게 재설계한다
  - Gap-ID: `AUTHOR-P0-01`
- `docs/api/auth.md`, `docs/api/posts.md`를 실제 구현 기준으로 정리한다
  - Gap-ID: `DOCS-P1-01`

#### 묶음 0 Acceptance Criteria

- `AUTH-P0-01`
  - 모바일 회원가입 요청에 서버 필수 동의/버전 필드가 모두 포함된다.
  - 정상 값으로 `/api/signup` 호출 시 400/409가 아닌 성공 응답이 나온다.
  - 실패 시 field error를 기반으로 화면 분기가 가능하다.
- `AUTH-P0-02`
  - 로그인 정책이 `web`과 `ios/android` 기준으로 문서에 명시된다.
  - `POST /api/login` 이후 동일 인증 컨텍스트로 `GET /api/me`가 성공한다.
  - 네이티브 로그인 해피패스가 실제 기기 또는 동등 환경에서 1회 이상 확인된다.
- `AUTH-P0-03`
  - 토큰 기반이면 `AsyncStorage` 대체 여부가 결정된다.
  - 쿠키 기반이면 저장소에 토큰을 남기지 않는 정책이 문서에 적힌다.
- `AUTHOR-P0-01`
  - 작가 글 목록이 서버 `offset/limit + has_more` 계약에 맞춰 동작한다.
  - loadMore 시 중복 append가 발생하지 않는다.
  - refresh 이후 첫 페이지와 다음 페이지가 구분된다.
- `DOCS-P1-01`
  - `docs/api/auth.md`, `docs/api/posts.md` 핵심 엔드포인트가 실제 구현과 일치한다.
  - 정정 전까지는 문서 상단에 참고용/주의 문구가 표시된다.

### 묶음 A. 마이페이지 회복

- `Me` 화면을 조회 카드에서 탭형 관리 화면으로 확장
- 필요한 API
  - `PUT /api/me`
  - `GET /api/posts/my`
  - `GET /api/posts/liked`
  - `GET /api/me/followings`
  - `GET /api/me/sessions`
  - `POST /api/logout-all`
- 이 묶음만 끝나도 서버 웹 대비 가장 큰 공백이 줄어든다.

### 묶음 B. 작가/상세 소셜 액션 보강

- 작가 페이지에 팔로우 버튼, 최신 글 CTA, 정렬 추가
- 상세에 관련 글 섹션과 작성자 관리 액션 추가
- 필요한 API
  - `POST /api/users/:id/follow`
  - `GET /api/posts/:id/related`
  - `GET /api/posts/:id/edit`
  - `DELETE /api/posts/:id`

### 묶음 C. 작성기 2단계 확장

- 생성 전용 작성기를 편집 가능 작성기로 확장
- draft를 create/edit로 분기하고 TTL/정리 정책을 서버 웹 규칙에 맞춘다
- 해시태그 입력은 이 단계에서 같이 붙이는 편이 자연스럽다

### 묶음 D. 인증 보조 흐름 보강

- 비밀번호 찾기/재설정
- 로그인 후 `next/from` 기반 복귀 UX

## 8. 완료 기준 메모

각 항목은 화면 추가만으로 완료 처리하지 않는다. 최소 완료 기준은 아래와 같다.

- 서버 필수 검증을 통과하는 해피패스 확인
- 모바일 실제 API 요청/응답 계약 확인
- 회귀 위험이 큰 흐름은 E2E 또는 최소 재현 케이스 추가
- 관련 문서가 있으면 현재 구현과 모순되지 않게 동기화

### 팀 Definition of Done

- 코드 변경이 서버 계약과 충돌하지 않는다.
- 사용자 해피패스와 대표 실패 케이스가 최소 1개 이상 검증된다.
- 새 API 사용 방식은 문서 정정 또는 기존 문서 상태 변경에 반영된다.
- 관련 `Gap-ID` 상태가 함께 업데이트된다.

### 추적성 메모

- 후속 PR, E2E, QA 체크리스트에는 가능하면 `Gap-ID`를 함께 남긴다.
- 권장 표기 예시:
  - PR: `AUTH-P0-01`
  - 테스트: `AUTHOR-P0-01`
  - QA 체크리스트: `ME-P1-01`

## 9. 메모

- 이번 정리는 관리자 API, 운영 통계, 웹 전용 레이아웃 최적화는 제외했다.
- 특히 `post.js`의 모바일 액션 독 전환처럼 웹 렌더링 보정에 가까운 항목은 모바일 앱 미구현으로 분류하지 않았다.
- 반대로 `mypage.js`, `author.js`, `editor2.js`처럼 서버 웹에서 이미 사용자 행동 흐름이 완성된 기능은 라우트 유무와 별개로 모바일 갭 항목에 포함했다.

## 10. 반영 로그

- `2026-03-21`: `Gap-ID`, `Acceptance Criteria`, `Definition of Done`, 추적성 메모를 추가해 문서를 실행 기준서 형태로 확장했다.
- `2026-03-21`: `## 3.1 Gap-ID 상태 업데이트` 섹션을 추가해 P0/P1 핵심 항목의 현재 반영률을 기록할 수 있게 했다.
- `2026-03-21`: [p0-gap-fix-agent-prompt.md](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/docs/prompts/p0-gap-fix-agent-prompt.md) 프롬프트를 추가해 P0 작업 시 코드 수정과 갭 노트 상태 업데이트를 함께 수행하도록 기준을 만들었다.
- `2026-03-21`: `AUTH-P0-01` 기준으로 `src/screens/AuthSignup.tsx`에 runtime-config 연동, 필수 동의 UI, signup legal fields, field error 표시를 반영했고 `npm run lint`를 통과했다. 실제 서버 해피패스/OTP 종단 검증은 샌드박스 네트워크 제약으로 별도 확인이 남아 있다.
- `2026-03-21`: `AUTHOR-P0-01` 기준으로 `src/features/users/useAuthorPosts.ts`를 `offset/limit + has_more` 계약으로 재정렬했고, loadMore 중복 append를 줄이기 위한 dedupe merge를 추가했다. 실제 기기/목록 기준 런타임 검증은 별도 확인이 남아 있다.
- `2026-03-21`: `DOCS-P1-01` 기준으로 `docs/api/auth.md`, `docs/api/posts.md`를 현재 서버 라우트와 모바일 실제 호출 기준으로 다시 정리했다. 예전 `PATCH /posts/:postId`, Bearer-only, signup legal fields 누락 같은 오래된 설명을 제거했다.
- `2026-03-21`: 북마크 폴더 수정 UI를 `src/screens/Bookmarks.tsx`에 추가해 `renameBookmarkList` 서비스가 실제 화면에서 동작하도록 연결했다. `폴더 수정` 항목은 `구현됨`으로 상향했다.
