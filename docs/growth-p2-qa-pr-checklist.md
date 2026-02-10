# Growth P2 QA & PR Checklist

## 범위
- 브랜치: `feature/mobile-growth-p2-e2e-qa`
- 핵심 변경: `e2e/growth-flow.spec.ts`
- 목적: 성장 탭 핵심 사용자 플로우를 E2E로 고정해 회귀를 조기에 탐지

## 자동 검증
- [x] `npx playwright test e2e/growth-flow.spec.ts`
- [x] 결과: `2 passed`
- [x] 시나리오 1: 비로그인 상태에서 성장 진입 시 인증 화면 유도
- [x] 시나리오 2: 로그인 상태에서 성장 메인/상세 이동 + 퀘스트 보상 수령

## 수동 QA 체크리스트
- [ ] 성장 탭 첫 진입 시 요약/업적/퀘스트 섹션이 정상 노출
- [ ] 업적 상세 진입/복귀 동작 정상
- [ ] 퀘스트 상세 진입/복귀 동작 정상
- [ ] 보상 수령 가능한 퀘스트에서 수령 처리 후 `보상 수령됨` 상태 반영
- [ ] pull-to-refresh 동작 및 로딩 인디케이터 노출
- [ ] 업적/퀘스트 0건 상태에서 무한 재요청 없이 안정적으로 멈춤
- [ ] 로그아웃/세션 만료 상태에서 성장 접근 시 인증 화면 유도

## PR 설명 초안
### 제목
`test(growth): add resilient end-to-end flow coverage`

### 요약
- 성장 탭 핵심 동선을 Playwright E2E로 추가했습니다.
- 웹 러너에서 발생하던 상호작용 불안정(오버레이/다이얼로그)을 반영해 시나리오를 안정화했습니다.

### 변경 사항
- `e2e/growth-flow.spec.ts` 신규 추가
- 인증 분기(비로그인) 시나리오 추가
- 로그인 상태 성장 메인/상세 이동 시나리오 추가
- 퀘스트 보상 수령 후 상태 반영 검증 추가

### 검증
- `npx playwright test e2e/growth-flow.spec.ts` 통과 (`2 passed`)

### 리스크/주의
- 현재 E2E는 web 기준 시나리오이며, 네이티브 동작은 별도 수동 확인이 필요합니다.
- `test-results/` 산출물은 커밋 대상이 아닙니다.

