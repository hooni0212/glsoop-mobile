# Growth P8 Release Gate Checklist

## 범위
- 브랜치: `feature/mobile-growth-p8-release-gate`
- 목적: 성장 탭 배포 전 회귀 시나리오와 수동 검증 기준을 고정
- 핵심 변경
  - `e2e/growth-flow.spec.ts` 실패 경로 시나리오 추가
  - 배포 전 체크리스트 문서화

## 자동 검증
- [x] `npx playwright test e2e/growth-flow.spec.ts`
- [x] 시나리오: 비로그인 진입 시 인증 유도
- [x] 시나리오: 로그인 후 메인/상세 이동 + 보상 수령
- [x] 시나리오: 인기 글 클릭 시 게시글 상세 이동
- [x] 시나리오: dashboard 실패 시 fallback + top posts pending
- [x] 시나리오: dashboard + fallback 동시 실패 시 오류 UI 노출
- [x] 시나리오: `top_posts=[]` 시 empty UI 노출

## 수동 QA 게이트
- [ ] 성장 홈 진입 시 카드/섹션 레이아웃 깨짐 없음 (iOS/Android/Web)
- [ ] pull-to-refresh 실행 시 로딩 인디케이터가 노출되고 멈춤 상태가 정상
- [ ] 업적/퀘스트 상세 이동 및 뒤로가기 동작 정상
- [ ] 보상 수령 후 상태(`보상 수령됨`) 즉시 반영
- [ ] top posts pending/empty/default 세 상태가 서버 응답에 맞게 분기
- [ ] 네트워크 불안정 상태에서 오류 문구가 사용자에게 이해 가능하게 노출
- [ ] 접근성 라벨(업적/퀘스트 이동, top posts 항목)이 스크린 리더에서 의미 전달

## 릴리스 판단 기준
- [ ] 자동 검증 100% green
- [ ] 치명도 High 버그 0건
- [ ] 수동 QA 게이트 전부 체크 완료
- [ ] 서버 계약 문서(`docs/api/growth.md`)와 실제 응답 스키마 일치
