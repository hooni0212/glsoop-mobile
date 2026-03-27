# 글숲 모바일 P0 계약/인증 갭 수정 프롬프트

## 목표

`glsoop-mobile`에서 문서 [2026-03-20-mobile-server-gap.md](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/docs/work-notes/2026-03-20-mobile-server-gap.md)의 `P0 선행 게이트`만 해결한다.

이번 작업은 기능 확장보다 먼저, 서버 계약과 모바일 구현이 충돌하는 항목을 정리하는 데 집중한다.

대상 Gap-ID:

- `AUTH-P0-01`
- `AUTH-P0-02`
- `AUTH-P0-03`
- `AUTHOR-P0-01`
- `DOCS-P1-01`

P1 이후 기능 추가는 이번 작업에 포함하지 않는다.

## 필수 참고 문서

- [2026-03-20-mobile-server-gap.md](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/docs/work-notes/2026-03-20-mobile-server-gap.md)
- [인증-쿠키-세션-정책.md](/Users/gimtaehun/2026/workspace/projects/glsoop/docs/서버/API/인증-쿠키-세션-정책.md)

필요 시 서버 근거는 아래를 직접 확인한다.

- `../glsoop/routes/authRoutes.js`
- `../glsoop/routes/runtimeRoutes.js`
- `../glsoop/routes/userRoutes.js`
- `../glsoop/routes/postRoutes.js`

## 고정 범위

### 포함

- 회원가입 legal fields/runtime-config 연동
- 네이티브 로그인 정책 차이 정리
- 인증 저장소 전략 정리
- 작가 글 목록 페이지네이션 계약 수정
- 모바일 API 문서 정정 또는 경고/상태 조정
- 작업 후 갭 노트 진행 상태 업데이트

### 제외

- 마이페이지 기능 추가
- 팔로우 버튼 구현
- 글 편집 UI 구현
- 비밀번호 재설정 화면 구현
- 성장/북마크/검색 P1 이후 기능 추가

## 구현 지시

### `AUTH-P0-01`

- 모바일 회원가입 흐름이 `/api/runtime-config`에서 legal version을 먼저 읽고, `/api/signup` 요청에 아래 필드를 포함하도록 수정한다.
  - `age_confirmed`
  - `terms_agreed`
  - `privacy_agreed`
  - `terms_version`
  - `privacy_version`
- 현재 UI에 필요한 최소 동의 입력 수단과 실패 메시지 분기를 추가한다.
- 서버 field error를 모바일에서 해석 가능하게 유지한다.

### `AUTH-P0-02`

- 서버 로그인 응답이 `token`을 반환하지 않는 현재 정책과, 모바일 네이티브가 토큰을 기대하는 현재 구현 차이를 정리한다.
- 이번 작업에서 정책이 확정되지 않으면, 코드 변경 대신 아래를 문서화한다.
  - 웹은 쿠키 세션 유지
  - 네이티브는 `쿠키 세션 유지` vs `Bearer 토큰 공식 지원` 중 결정 필요
- 정책 미확정 시 상태는 `정책 결정 필요`로 남긴다.

### `AUTH-P0-03`

- 현재 인증 저장소가 `AsyncStorage`라는 사실과 대체 필요성을 정리한다.
- 정책이 토큰 기반으로 확정되지 않았다면 저장소 마이그레이션 코드는 강행하지 않는다.
- 대신 저장소 의존 경로와 후속 전환 지점을 문서/코멘트로 명확히 남긴다.

### `AUTHOR-P0-01`

- `useAuthorPosts`를 서버 `offset/limit + has_more` 계약에 맞춘다.
- `cursor`/`nextCursor` 전제를 제거하거나, 서버 응답 기준으로 안전하게 fallback 하도록 바꾼다.
- loadMore 시 중복 append가 발생하지 않아야 한다.

### `DOCS-P1-01`

- `docs/api/auth.md`, `docs/api/posts.md`를 실제 서버/모바일 구현 기준으로 정정한다.
- 이번 작업에서 전면 정정이 어렵다면, 최소한 문서 상단에 참고용/주의 문구와 현재 상태를 명시한다.
- 핵심 엔드포인트/메서드/응답 규칙은 실제 구현과 맞춰야 한다.

## 문서 업데이트 의무

코드/문서 수정이 끝나면 [2026-03-20-mobile-server-gap.md](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/docs/work-notes/2026-03-20-mobile-server-gap.md)도 함께 갱신한다.

### 갱신 대상

- `## 3.1 Gap-ID 상태 업데이트`
- `## 10. 반영 로그`
- 문서 상단 `최종 업데이트`

### 상태 규칙

- `미착수`: 아직 코드/문서 변경 없음
- `진행 중`: 일부 반영됐지만 Acceptance Criteria 미충족
- `반영됨`: 코드/문서/검증까지 완료
- `정책 결정 필요`: 구현 전에 팀 결정이 필요
- `차단됨`: 외부 의존성 또는 계약 미확정으로 진행 불가

### 상태 업데이트 규칙

- 이번 작업 범위의 `Gap-ID`만 상태를 변경한다.
- `반영됨`으로 올릴 때는 근거 경로와 테스트 결과를 함께 적는다.
- 정책 미확정이면 코드 반영과 분리해서 `정책 결정 필요`로 둔다.

## 테스트/검증 기준

### `AUTH-P0-01`

- signup 해피패스가 성공해야 한다.
- 필수 동의/버전 누락 시 field error 분기가 가능해야 한다.

### `AUTHOR-P0-01`

- author posts loadMore에서 중복 append가 없어야 한다.
- 서버 `has_more` 기반으로 더보기 동작이 맞아야 한다.

### `DOCS-P1-01`

- `docs/api/auth.md`, `docs/api/posts.md`의 핵심 엔드포인트가 실제 구현과 일치해야 한다.

### 갭 노트 검증

- 작업 대상 `Gap-ID` 상태가 모두 갱신되어야 한다.
- `반영 로그`에 날짜, 변경 내용, 근거가 남아야 한다.
- `최종 업데이트` 날짜가 실제 수정일과 일치해야 한다.

## 최종 보고 형식

최종 답변에는 아래를 포함한다.

1. 이번에 반영한 Gap-ID 목록과 최종 상태
2. 수정한 코드/문서 파일
3. 테스트/검증 결과
4. 아직 남은 정책 결정 항목
5. 갭 노트에 반영한 상태 업데이트 요약
