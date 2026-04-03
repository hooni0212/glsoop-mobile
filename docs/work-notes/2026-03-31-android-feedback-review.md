# 2026-03-31 작업 노트 (Android 실사용 피드백 리뷰 + 모바일/서버 정합성)

- 문서 타입: `Work Note`
- 적용 범위: `glsoop-mobile/docs/work-notes/2026-03-31-android-feedback-review.md`
- 대상 독자: 모바일/서버 개발자, QA, PM
- 상태: `In Progress`
- 최종 업데이트: `2026-03-31`
- Owner: `taehun`
- 관련 문서:
  - `docs/work-notes/2026-03-20-mobile-server-gap.md`
  - `docs/work-notes/2026-03-24-mobile-server-auth-review.md`
  - `src/components/write/WriteLayoutSection.tsx`
  - `src/components/write/WriteEditor.tsx`
  - `src/components/paper/PaperReadingCard.tsx`
  - `src/features/growth/useGrowthData.ts`
  - `src/features/search/useSearch.ts`
  - `src/lib/postContent.ts`
  - `src/lib/webFocus.ts`
  - `src/screens/PostDetail.tsx`
  - `src/screens/Author.tsx`
  - `src/screens/Me.tsx`
  - `src/components/growth/TopPostsList.tsx`
  - `../glsoop/routes/postRoutes.js`
  - `../glsoop/routes/feedImageRoutes.js`
  - `../glsoop/routes/growthRoutes.js`
  - `../glsoop/routes/searchRoutes.js`
  - `../glsoop/routes/userRoutes.js`
  - `../glsoop/routes/authRoutes.js`
  - `../glsoop/utils/postPreview.js`
  - `../glsoop/utils/feedImageRenderer.js`
  - `../glsoop/utils/sanitize.js`

---

## 1. 배경

안드로이드 실기기 사용 피드백을 기준으로 현재 모바일 `glsoop-mobile` 과 서버 `glsoop` 을 함께 다시 점검했다.

이번 메모는 단순히 “앱 화면에서 불편했다”를 적는 용도가 아니다.
실사용 피드백이 아래 어느 층위의 문제인지 구분하는 것이 목적이다.

1. 모바일 UI만 손보면 되는가
2. 모바일과 서버의 데이터 계약을 같이 바꿔야 하는가
3. 정책을 먼저 확정하지 않으면 구현을 시작하면 안 되는가

특히 이번 피드백은 안드로이드 한 플랫폼의 렌더링 차이만으로 설명되지 않았다.
공개 데이터 계약, 서버 렌더 이미지 규칙, 모바일 캐시와 fallback 표현이 서로 조금씩 어긋나 있어서,
사용자는 하나의 “안드로이드 문제”처럼 느끼지만 실제 원인은 서로 다른 층위에 흩어져 있는 상태다.

---

## 2. 요약 결론

이번에 받은 8개 피드백은 아래 세 묶음으로 보는 게 맞다.

### 2.1 모바일 단독 조정으로 해결 가능한 항목

- 갤럭시 폰 UI 최적화
- 행간/자간 기능의 발견 가능성 개선
- 성장 인기글 카드/리스트 표현 일부 개편

### 2.2 모바일과 서버를 같이 맞춰야 하는 항목

- 제목 깨짐 수정
- 공유 버튼/공유 플로우 개편
- 레벨 실시간 동기화
- 실명 대신 닉네임 노출

### 2.3 정책을 먼저 확정해야 하는 항목

- “이모지 및 유니코드 사용 금지”

여기서 가장 중요한 점은,
`실명 노출`, `문자 허용 정책`, `공유`, `제목 렌더링`은 모바일만 고쳐서는 다시 어긋날 가능성이 높다는 것이다.
이 항목들은 서버 응답 형식이나 서버 렌더 규칙이 같이 바뀌어야 한다.

---

## 3. 항목별 리뷰

### 3.1 행간/자간을 사용자가 설정할 수 있게 해달라는 요청

- 현재 상태:
  - 모바일 작성 UI와 레이아웃 모델에는 이미 관련 흐름이 들어가 있다.
  - 서버 저장/렌더도 `line_height`, `letter_spacing` 흐름이 연결되어 있다.
- 확인 경로:
  - 모바일: `src/components/write/WriteLayoutSection.tsx`
  - 모바일: `src/components/write/WriteEditor.tsx`
  - 모바일: `src/components/paper/PaperReadingCard.tsx`
  - 모바일: `src/lib/postLayout.ts`
  - 서버: `../glsoop/routes/postRoutes.js`
  - 서버: `../glsoop/routes/feedImageRoutes.js`
  - 서버: `../glsoop/utils/feedImageRenderer.js`
- 왜 피드백이 나왔는가:
  - 기능이 없어서라기보다, 안드로이드 작은 화면에서 옵션 도크의 발견 가능성이 낮다.
  - 박스 선택 이후 어떤 옵션이 현재 활성 박스에 적용되는지 직관성이 약하다.
- 권장 방향:
  - 모바일에서만 UI/정보 구조를 정리한다.
  - `제목/본문 선택 -> 해당 박스 옵션만 노출` 흐름을 더 명확하게 만든다.
  - 서버 계약은 현재 구조를 유지해도 된다.
- 분류: `모바일 단독`

### 3.2 제목 깨짐 현상 수정

- 현재 상태:
  - 모바일 fallback 렌더와 서버 이미지 렌더가 제목 줄바꿈/높이 계산을 완전히 같은 방식으로 쓰지 않는다.
  - 안드로이드는 폰트 fallback과 line-height 체감 차이가 커서 잘림이 더 쉽게 보인다.
- 확인 경로:
  - 모바일: `src/components/write/WriteEditor.tsx`
  - 모바일: `src/components/paper/PaperReadingCard.tsx`
  - 서버: `../glsoop/utils/feedImageRenderer.js`
- 왜 피드백이 나왔는가:
  - 제목 박스 높이가 타이트하고, 서버 SVG 렌더의 clip 영역이 보수적으로 잡혀 있다.
  - 모바일과 서버가 같은 글이라도 제목 줄 수와 실제 보이는 높이가 약간 다를 수 있다.
- 권장 방향:
  - 서버 렌더에서 제목 auto-fit 또는 clip padding 확대를 검토한다.
  - 모바일 fallback과 서버 SVG의 제목 계산식을 최대한 통일한다.
  - Android 실기기 기준 긴 제목, 좁은 폭, 큰 시스템 폰트 조합으로 회귀 테스트를 추가한다.
- 분류: `모바일 + 서버 동시 수정`

### 3.3 갤럭시 폰 UI 최적화

- 현재 상태:
  - 여러 화면에서 고정 간격, 고정 높이, 고정 폰트 비중이 아직 높다.
  - 삼성 키보드 높이, 360dp 전후 폭, 시스템 font scale 확대 상황에서 조밀하게 보일 수 있다.
- 확인 경로:
  - `src/navigation/tabs.styles.ts`
  - `src/components/FeedCard.tsx`
  - `src/components/growth/TopPostsList.tsx`
  - `src/screens/PostDetail.tsx`
- 왜 피드백이 나왔는가:
  - iPhone 기준으로 자연스러운 간격이 갤럭시에서는 더 빽빽하거나 눌린 느낌으로 보일 수 있다.
  - 텍스트와 버튼의 hit area, 탭 높이, 하단 안전영역 체감이 다르다.
- 권장 방향:
  - `width <= 360dp`, `fontScale >= 1.1` 조합을 별도 기준으로 본다.
  - Android 전용 spacing, tab height, bottom action area, 키보드 대응을 조정한다.
  - “전체 디자인 교체”보다 `조밀한 곳 우선`으로 손보는 게 효율적이다.
- 분류: `모바일 단독`

### 3.4 이모지 및 유니코드 사용 차단

- 현재 상태:
  - 서버는 HTML sanitize 위주이고, 문자셋 정책은 강하게 걸려 있지 않다.
  - 모바일도 입력 단계에서 문자 정책을 설명하거나 제한하는 로직이 크지 않다.
- 확인 경로:
  - 서버: `../glsoop/utils/sanitize.js`
  - 서버: `../glsoop/routes/postRoutes.js`
  - 서버: `../glsoop/routes/authRoutes.js`
- 왜 바로 구현하면 위험한가:
  - “유니코드 금지”는 그대로 적용하면 한글도 막게 된다.
  - 실제 요구는 `이모지`, `zero-width/invisible`, `제어문자`, 일부 과한 특수문자 제한에 더 가깝다.
- 권장 방향:
  - 먼저 허용/차단 정책을 문장으로 확정한다.
  - 서버에서 최종 검증을 강제하고, 모바일은 같은 규칙으로 사전 경고를 준다.
  - 닉네임, 제목, 본문, 댓글처럼 입력 필드별로 허용 범위를 나눌지 결정해야 한다.
- 분류: `정책 먼저 확정 후 모바일 + 서버 적용`

### 3.5 공유 버튼 관련 수정

- 현재 상태:
  - 모바일은 시스템 공유창에 텍스트 중심 payload를 넘기는 구조다.
  - 서버에는 공유용 피드 이미지 엔드포인트가 이미 있다.
- 확인 경로:
  - 모바일: `src/screens/PostDetail.tsx`
  - 모바일: `src/services/shareService.ts`
  - 서버: `../glsoop/routes/feedImageRoutes.js`
- 왜 피드백이 나왔는가:
  - 안드로이드에서는 텍스트 공유 결과가 앱마다 다르게 보이거나, 기대하는 카드형 공유 경험이 약하다.
  - 공유 성공/실패 체감과 토스트 UX도 불안정할 수 있다.
- 권장 방향:
  - 서버가 canonical share payload 기준을 더 명확히 내려주는 구조가 좋다.
  - 모바일은 `공유 텍스트`보다 `공유 URL + 공유 이미지` 중심으로 재정리한다.
  - 공유 성공 토스트, share modal 문구, 이벤트 로깅 타이밍도 함께 맞춘다.
- 분류: `모바일 + 서버 동시 수정`

### 3.6 레벨 실시간 동기화

- 현재 상태:
  - 성장 페이지와 마이페이지가 일부 다른 데이터 소스와 캐시 전략을 사용한다.
  - 특히 성장 훅은 TTL 캐시가 있고, 마이페이지는 `/api/me` 와 `/api/growth/summary` 를 따로 읽는다.
- 확인 경로:
  - 모바일: `src/features/growth/useGrowthData.ts`
  - 모바일: `src/screens/Me.tsx`
  - 서버: `../glsoop/routes/authRoutes.js`
  - 서버: `../glsoop/routes/growthRoutes.js`
- 왜 피드백이 나왔는가:
  - 업적 수령 직후 한 화면은 최신값, 다른 화면은 캐시값을 보여줄 수 있다.
  - 사용자 입장에서는 “레벨이 늦게 반영된다”로 느껴진다.
- 권장 방향:
  - 모바일에서 growth/me 공용 invalidate 전략 또는 공용 store를 둔다.
  - 서버는 `/api/me` 또는 claim 응답에 최신 growth summary를 같이 실어주는 방향을 검토한다.
- 분류: `모바일 + 서버 동시 수정`

### 3.7 닉네임 대신 실명이 보이는 문제

- 현재 상태:
  - 공개 API 일부가 `name` 을 그대로 내려주고, 모바일도 화면마다 `name` 또는 `nickname` 사용 기준이 섞여 있다.
- 확인 경로:
  - 서버: `../glsoop/routes/searchRoutes.js`
  - 서버: `../glsoop/routes/userRoutes.js`
  - 서버: `../glsoop/routes/growthRoutes.js`
  - 모바일: `src/features/search/useSearch.ts`
  - 모바일: `src/screens/Author.tsx`
  - 모바일: `src/components/FeedCard.tsx`
- 왜 피드백이 나왔는가:
  - 모바일만 nickname-first 로 바꿔도, 서버가 공개 응답에 real name 을 보내면 다른 화면이나 후속 기능에서 다시 새어 나올 수 있다.
  - 현재는 “자기 자신 화면”과 “타인이 보는 공개 화면”의 표시 규칙이 API 레벨에서 분리되어 있지 않다.
- 권장 방향:
  - 공개 응답은 `display_name` 또는 `nickname || 익명` 기준으로 단일화한다.
  - real `name` 은 `/api/me` 같은 본인 전용 엔드포인트에만 남긴다.
  - 모바일도 모든 공개 surface 에서 `display_name` 을 우선 사용하도록 맞춘다.
- 분류: `모바일 + 서버 동시 수정`
- 진행 현황:
  - `2026-03-31` 기준 1차 반영 완료.
  - 서버 공개 응답은 `display_name` / `author_display_name` 중심으로 정리했고, 기존 `name` / `author_name` 은 alias 로 유지했다.
  - 공개 검색의 작성자 매칭은 real name 제거, nickname 기준으로 통일했다.
  - 모바일은 검색/작가/피드/글 상세/성장 인기글/팔로잉 목록까지 공개 이름 normalizer 로 통일했다.
  - 남은 일은 수동 QA 와 edge surface 추가 점검이다.

### 3.8 성장 인기글 표시 방식 수정

- 현재 상태:
  - 현재 리스트는 기능적으로는 동작하지만, 정보 밀도와 카드 표현이 다소 투박하다.
  - 서버도 display-friendly author field 를 충분히 정리해서 주는 구조는 아니다.
- 확인 경로:
  - 모바일: `src/components/growth/TopPostsList.tsx`
  - 모바일: `src/features/growth/useGrowthData.ts`
  - 서버: `../glsoop/routes/growthRoutes.js`
- 왜 피드백이 나왔는가:
  - 안드로이드에서는 카드 크기, 줄 수, 랭크 정보 배치가 더 빽빽하게 느껴질 수 있다.
  - 작성자 이름 규칙도 실명/닉네임 이슈와 엮여 있다.
- 권장 방향:
  - 모바일 UI 개편은 가능하지만, 서버도 `author_display_name` 중심으로 응답을 정리하는 편이 좋다.
  - 필요 시 preview image 또는 layout summary 같은 표시용 필드를 더 내려주는 것도 검토할 수 있다.
- 분류: `모바일 우선, 필요 시 서버 응답 보강`
- 진행 현황:
  - `2026-03-31` 기준 1차 반영 완료.
  - 성장 인기글과 검색 결과의 excerpt 에 HTML comment / tag 가 노출되던 문제를 서버 excerpt helper 공통화로 정리했다.
  - 모바일도 preview helper 를 공통 사용하도록 바꿔서 예전 데이터나 회귀 응답이 들어와도 raw markup 이 그대로 보이지 않게 방어했다.
  - 웹에서는 `/search` 진입/이동 시 focused element 를 blur 하도록 넣어 `aria-hidden` 경고 가능성을 낮췄다.
  - 남은 일은 카드 시각 표현 자체의 개편 여부를 결정하는 것이다.

---

## 4. 진행 현황

`2026-03-31` 기준 이번 메모에서 실제로 반영된 작업은 아래와 같다.

### 4.1 완료된 1차 작업

- 실명 노출 방지
  - 공개/타인 정보 surface 를 `display_name = nickname || 익명` 기준으로 정리했다.
  - `/api/me` 는 real `name`, `email` 을 유지하고, 공개 profile/search/post/growth/followings 는 공개 최소화 규칙으로 맞췄다.
- 검색/성장 인기글 preview 정리
  - 서버: excerpt 생성 로직을 공통 helper 로 모아 HTML comment, tag, entity, 공백을 정리한 plain text preview 로 고정했다.
  - 모바일: search/growth/feed/bookmarks/author/related/me 목록이 같은 preview helper 를 쓰도록 통일했다.
- 회귀 테스트 보강
  - search API rich HTML fixture 검증을 추가했다.
  - growth top-posts API 에 plain text excerpt 검증을 추가했다.

### 4.2 아직 남은 확인

- 웹에서 `/search` 관련 `aria-hidden` 경고가 실제 브라우저 수동 QA 에서 사라졌는지 확인
- 공개 이름/preview 규칙이 남아 있는 다른 surface 에서도 추가로 새지 않는지 점검

### 4.3 현재 체감 진척도

- 공개 이름 규칙 정리: `완료(1차)`
- 검색/성장 preview 깨짐 수정: `완료(1차)`
- 문자 허용 정책: `미착수`
- 공유 플로우 개편: `미착수`
- 제목 깨짐 수정: `미착수`
- 레벨 실시간 동기화: `미착수`
- 갤럭시 UI 최적화: `미착수`
- 행간/자간 discoverability 개선: `미착수`

---

## 5. 우선순위 제안

안드로이드 피드백 중 남은 작업 기준 우선순위는 아래가 적절하다.

선행 완료:

- 실명 노출 방지 1차
- 검색/성장 인기글 preview 정리 1차

1. 문자 허용 정책 정리
2. 공유 플로우 정리
3. 제목 깨짐 수정
4. 레벨 실시간 동기화
5. 갤럭시 UI 최적화
6. 성장 인기글 표시 개편
7. 행간/자간 discoverability 개선

정리 기준:

- `개인정보/공개 데이터 계약` 이 걸린 이슈를 최우선으로 본다.
- 이미 1차 반영이 끝난 항목은 다음 배치에서 QA/잔여 edge 점검 위주로 본다.
- 그 다음은 `공유/상세 렌더` 처럼 외부 노출 체감이 큰 문제를 본다.
- UI polish 성격 항목은 그 다음으로 둔다.

---

## 6. 실행 묶음 제안

### 묶음 A. 서버 계약 우선 정리

- 문자 허용 정책 확정
- growth/me 응답 정합성 검토
- share payload 기준 정리

실명/preview 관련 1차 정리가 끝났으므로, 이제 이 묶음은 “정책/응답 계약의 남은 결정” 중심으로 본다.

### 묶음 B. 모바일 사용자 체감 개선

- 갤럭시 spacing/fontScale 대응
- 공유 버튼/토스트 UX 정리
- 행간/자간 옵션 발견 가능성 개선
- 성장 인기글 카드 표현 개선

이 묶음은 서버 계약이 준비되면 바로 붙일 수 있다.

### 묶음 C. 렌더 정합성 보강

- 제목 auto-fit / clip padding
- 서버 이미지와 모바일 fallback 줄바꿈 정렬
- 긴 제목/작은 화면 회귀 테스트 추가

이 묶음은 서버와 모바일을 한 번에 봐야 한다.

---

## 7. 남은 결정사항

이번 메모는 구현 문서가 아니라 리뷰 문서이므로, 아래는 아직 결정이 필요하다.

- “이모지 금지”를 어느 입력 필드까지 적용할지
- 공개 프로필에서도 본인 화면만 real name 을 허용할지
- 공유 기본 동작을 `텍스트 공유` 에 둘지 `이미지+URL 공유` 에 둘지
- 성장 인기글을 현재 리스트형으로 유지할지 카드형으로 바꿀지
- Android 최적화 기준 디바이스를 무엇으로 잡을지
  - 예: `360dp 폭`, `Galaxy S 기본 폰트`, `fontScale 1.15`

---

## 8. 오늘 결론

이번 안드로이드 피드백은 “안드로이드만 이상하다”기보다,
모바일 UI, 서버 공개 응답, 서버 렌더 이미지, 모바일 캐시가 부분적으로 어긋난 결과라고 보는 게 맞다.

현재까지는 `공개 이름 규칙 정리` 와 `검색/성장 preview 정리` 의 1차 작업을 끝냈다.

따라서 다음 작업은 화면만 손보는 식으로 흩어지기보다,

1. 문자 허용 정책 같은 선결정 사항 확정
2. 공유/제목/성장 동기화 같은 정합성 이슈 수정
3. 마지막으로 Android UX 최적화

순으로 묶어서 처리하는 편이 안정적이다.
