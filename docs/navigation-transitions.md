# Navigation Transition Rules

이 문서는 `glsoop-mobile`의 화면 전환 규칙(라우팅 메서드, 애니메이션, 뒤로가기 기대 동작)을 정리한다.

## 전환 규칙 표

| 상황 | From -> To | 메서드 | 애니메이션 | 백 동작 |
|---|---|---|---|---|
| 탭에서 글쓰기 진입 | `/(tabs)/*` -> `/write` | `push` | `slide_from_bottom` | 닫기 시 탭으로 복귀 |
| 글쓰기에서 임시저장함 | `/write` -> `/write-drafts` | `push` | 기본 push | 백 시 `/write` 복귀 |
| 임시저장 열기 | `/write-drafts` -> `/write?draftId=...` | `push` | 기본 push | 백 시 `/write-drafts` 복귀 |
| 글쓰기 성공 후 홈 | `/write` -> `/(tabs)` | `replace` | 모달 닫힘 전환 | 백 시 글쓰기로 재진입 안 함 |
| 글쓰기 성공 후 방금 글 보기 | `/write` -> `/posts/:id` | `replace` | 모달 종료 후 상세 진입 | 백 시 글쓰기로 재진입 안 함 |
| 피드/작가 글에서 상세 | `/(tabs)/index` or `/users/:id` -> `/posts/:id` | `push` | horizontal push | 백 시 리스트 복귀 |
| 상세에서 작가 프로필 | `/posts/:id` -> `/users/:id` | `push` | horizontal push | 백 시 상세 복귀 |
| 인증 진입(강제) | 임의 화면 -> `/(auth)` | `replace` | `fade` 권장 | 백 시 보호화면 복귀 방지 |
| 로그아웃 후 이동 | `/(tabs)/*` -> `/(auth)` | `replace` | `fade` 권장 | 백 시 앱 본문 복귀 방지 |
| 단순 닫기/취소 | 현재 화면 -> 이전 화면 | `back` | 스택 기본 | 직전 화면으로 일관 복귀 |

## 공통 규칙

- 완료/종료/권한변경: `replace`
- 탐색: `push`
- 되돌아가기: `back`

## 적용 메모

- `write`는 모달 성격이므로 `Stack.Screen(name="write")`에서 모달 프레젠테이션을 유지한다.
- 작성 중 이탈 확인(임시저장 confirm)은 상단 닫기/제스처/하드웨어 백 모두 동일하게 동작하도록 유지한다.
- 성공 후 목적지 선택 UX(홈/방금 글 보기)는 히스토리 오염 방지를 위해 `replace`를 사용한다.
