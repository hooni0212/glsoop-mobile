# Mobile Release Preflight Checklist (2026-02-16)

## 0) 목적
출시 전 `최적화`, `보안`, `UI/UX` 관점의 필수 점검 항목을 고정하고,
Go/No-Go 결정을 체크리스트 기반으로 수행한다.

---

## 1) Release Gate (Go 조건)
아래 조건을 모두 만족하면 Go:

- `P0` 항목 100% 완료
- `P1` 항목은 완료 또는 명시적 defer(담당자/기한/리스크) 등록
- 자동 검증 통과
- 수동 스모크(로그인/피드/상세/작성/검색/북마크/성장) 완료

---

## 2) P0 (출시 차단 항목)

### 2-1. 타입/정적 검증
- [ ] `npx tsc --noEmit` 통과
- 현재 확인된 실패:
  - `src/screens/Bookmarks.tsx:563`
  - `src/screens/Bookmarks.tsx:573`
  - `src/screens/Bookmarks.tsx:606`
  - `src/screens/Bookmarks.tsx:646`
  - `e2e/write-draft.spec.ts:19` (implicit any)

### 2-2. 작성(Write) E2E 안정화
- [ ] Write 관련 E2E 모두 통과
- 현재 확인된 실패:
  - `e2e/write-draft.spec.ts` (S1/S2/S3)
  - `e2e/write-ux.spec.ts` (S0/S1/S2...)
- 대표 실패 지점:
  - `e2e/write-draft.spec.ts:47` (`write-title-input` fill 중 DOM detached / timeout)

### 2-3. 민감 로그 제거
- [ ] 본문/payload/상태를 직접 출력하는 로그 제거 또는 개발 전용 가드
- 현재 확인된 주요 로그:
  - `src/screens/Write.tsx:155`
  - `src/screens/Write.tsx:165`
  - `src/screens/Write.tsx:188`

### 2-4. Expo 버전 정합성
- [ ] `npx expo install --check` 통과
- 현재 mismatch:
  - `expo@54.0.30 -> ~54.0.33`
  - `expo-constants@18.0.12 -> ~18.0.13`
  - `expo-font@14.0.10 -> ~14.0.11`
  - `expo-router@6.0.21 -> ~6.0.23`

### 2-5. 보안 취약점(High) 해소
- [ ] `npm audit --omit=dev`에서 High/critical = 0
- 현재 확인된 이슈:
  - `tar` (high)
  - `@isaacs/brace-expansion` (high)
  - `undici` (moderate)

---

## 3) P1 (출시 전 강력 권장)

### 3-1. 인증 토큰 저장소 강화
- [ ] `AsyncStorage` -> `SecureStore/Keychain` 전환 검토/적용
- 관련 코드: `src/lib/authToken.ts`

### 3-2. API 디버그 로그 보호
- [ ] 토큰/URL 로그가 운영에서 절대 출력되지 않도록 강제
- 관련 코드: `src/lib/api.ts`

### 3-3. 피드/상세 stale 요청 제어
- [ ] 쿼리/라우트 전환 시 이전 요청 결과가 덮어쓰지 않도록 취소/버전 가드 추가
- 관련 코드:
  - `src/features/feed/useFeed.ts`
  - `src/features/posts/usePost.ts`

### 3-4. 북마크 N+1 호출 완화
- [ ] 북마크 저장 시 폴더별 추가 조회 구조 최적화
- 관련 코드: `src/screens/Home.tsx`

### 3-5. CI Gate 구축
- [ ] GitHub Actions 등으로 최소 게이트 자동화 (`lint`, `tsc`, `e2e:web`)

---

## 4) UI/UX 수동 점검

### 4-1. 핵심 플로우
- [ ] 로그인/로그아웃
- [ ] 홈 피드 스크롤/좋아요/북마크
- [ ] 글 상세 공유/북마크 모달
- [ ] 작성 진입/작성/임시저장/닫기 confirm
- [ ] 검색 탭 전환/정렬/최근 검색어
- [ ] 성장 화면 진입/보상 수령

### 4-2. 품질
- [ ] iOS/Android에서 레이아웃 깨짐 없음
- [ ] 텍스트 잘림/겹침 없음
- [ ] 로딩/에러/빈 상태 메시지 일관성
- [ ] SafeArea 경고 이슈 영향도 확인 (`react-native` SafeAreaView deprecation)

---

## 5) 실행 순서 (권장)

1. [ ] `npm run lint`
2. [ ] `npx tsc --noEmit`
3. [ ] `npx expo install --check`
4. [ ] `npm audit --omit=dev`
5. [ ] `npx playwright test --grep-invert "Write|글쓰기 임시저장"`
6. [ ] `npx playwright test e2e/write-draft.spec.ts e2e/write-ux.spec.ts`
7. [ ] iOS/Android 수동 스모크

---

## 6) 현재 스냅샷 (2026-02-16)
- `npm run lint`: 통과
- `npx tsc --noEmit`: 실패
- `npx expo install --check`: 실패 (버전 mismatch)
- `npm audit --omit=dev`: High 2 / Moderate 1
- Non-Write E2E(`--grep-invert`): 15 passed
- Write E2E: 실패 (timeout/DOM detach)

---

## 7) 승인 기록
- Release Owner: [ ]
- Engineering Owner: [ ]
- QA Owner: [ ]
- 최종 결론: [ ] Go / [ ] No-Go
- 승인 시각: [ ]
