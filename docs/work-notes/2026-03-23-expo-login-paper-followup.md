# 2026-03-23 작업 노트 (Expo 로그인 + Paper 렌더 후속)

- 문서 타입: `Work Note`
- 적용 범위: `glsoop-mobile/docs/work-notes/2026-03-23-expo-login-paper-followup.md`
- 대상 독자: 모바일/서버 개발자, QA
- 상태: `Draft`
- 최종 업데이트: `2026-03-23`
- Owner: `taehun`
- 관련 문서:
  - `docs/work-notes/2026-03-20-mobile-server-gap.md`
  - `src/lib/authToken.ts`
  - `src/screens/Write.tsx`
  - `src/components/write/WriteEditor.tsx`
  - `src/components/write/WritePreviewCard.tsx`
  - `src/components/post/PostBody.tsx`
  - `src/lib/postLayout.ts`
  - `../glsoop/public/js/editor2.js`
  - `../glsoop/public/js/editor2LayoutEditor.js`

---

## 1. 배경

최근 모바일 쪽에서 서버의 `책 위에 인쇄된 느낌`을 맞추기 위해 다음 작업을 반영했다.

- `Write`에서 서버 `paper-source-01.jpg` 기반 편집
- `title_box / text_box / footer_box` 좌표 기반 `layout_json` 저장
- `PostDetail`에서 서버 렌더 이미지(`/api/feed-images/post/:id`) 우선 사용
- `web`은 쿠키 세션, `ios/android`는 Bearer + `SecureStore` 기반 인증

이후 실제 폰(Expo Go)과 현재 편집/읽기 흐름을 확인하는 과정에서, 서버 갭과는 별개로 바로 잡아야 하는 후속 이슈가 세 가지 드러났다.

1. Expo Go 로그인 오류
2. 편집기와 Post 상세의 글자 크기/시각 결과 불일치
3. 서버 에디터에 있는 폰트 선택 기능이 모바일에는 없음

이 문서는 위 세 문제를 각각 분리해서 정의하고, 해결 방향과 권장 작업 순서를 정리한다.

## 1.1 진행 상태

| 항목 | 현재 상태 | 마지막 반영일 | 근거 | 남은 이슈 |
| --- | --- | --- | --- | --- |
| Expo Go 로그인 오류 | `반영됨` | `2026-03-23` | [authToken.ts](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/src/lib/authToken.ts)의 `SecureStore` 키를 `glsoop_auth_token_v1`로 변경해 Expo Go/실기기에서 허용되는 키 형식으로 맞춤 | 실제 기기에서 로그인 재확인 필요 |
| 편집기 vs Post 렌더 불일치 | `부분 반영` | `2026-03-23` | [Write.tsx](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/src/screens/Write.tsx)에서 편집 화면 아래에 서버 `/api/feed-images/preview` 기반 라이브 프리뷰를 항상 노출하도록 변경했고, [WritePreviewCard.tsx](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/src/components/write/WritePreviewCard.tsx)가 같은 `layout_json`/폰트 메타로 최종 결과를 보여주도록 맞춤 | 로컬 편집 오버레이와 서버 렌더 사이의 미세한 줄바꿈/크기 차이는 여전히 남을 수 있음 |
| 모바일 폰트 선택 부재 | `반영됨` | `2026-03-23` | [WriteMetaSection.tsx](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/src/components/write/WriteMetaSection.tsx)에 폰트 선택 UI 추가, [postContent.ts](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/src/lib/postContent.ts)와 [postService.ts](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/src/services/postService.ts)에서 `<!--FONT:...-->` 메타 저장/복원 반영 | 실기기에서 각 폰트가 의도한 체감으로 보이는지 QA 필요 |

## 2. 문제 정의

### 2.1 Expo Go 로그인 오류

실제 폰에서 Expo Go로 로그인 화면 진입 시 아래 오류가 발생했다.

- `Invalid key provided to SecureStore. Keys must not be empty and contain only alphanumeric characters, ".", "-", and "_".`

현재 모바일 토큰 저장 키는 [authToken.ts](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/src/lib/authToken.ts)에 아래처럼 정의돼 있다.

- `const TOKEN_KEY = "glsoop:auth:token:v1";`
- 현재 반영 후 키
  - `glsoop_auth_token_v1`

문제는 `expo-secure-store`가 `:` 문자를 허용하지 않는다는 점이다. 따라서 현재 키 형식은 `ios/android` 실기기에서 실패할 가능성이 높고, 에러 메시지도 그와 정확히 일치한다.

이건 단순 UX 버그가 아니라 `AUTH-P0-02/03`의 실제 실기기 해피패스를 막는 런타임 문제다.

### 2.2 편집기와 Post 상세의 글자 크기/시각 결과 불일치

현재 `Write`와 `PostDetail`은 같은 `layout_json`을 공유하지만, 실제 렌더 파이프라인은 다르다.

- `Write`
  - [WriteEditor.tsx](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/src/components/write/WriteEditor.tsx)에서 React Native `TextInput`으로 직접 렌더
  - 폰트 크기 계산은 RN 기준 `fontSize`, `lineHeight`를 로컬 계산
- `Preview`
  - [WritePreviewCard.tsx](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/src/components/write/WritePreviewCard.tsx)에서 서버 `/api/feed-images/preview` 결과를 사용
- `PostDetail`
  - [PostBody.tsx](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/src/components/post/PostBody.tsx)에서 서버 `/api/feed-images/post/:id` 렌더 이미지를 우선 사용

즉, 사용자는 편집 화면에서는 `로컬 RN 텍스트`를 보고, 최종 읽기 화면에서는 `서버 렌더 이미지`를 본다. 이 구조에서는 아래 현상이 자연스럽게 발생한다.

- 편집 화면에서 본 크기와 실제 Post 상세 이미지의 글자 크기가 다르게 느껴짐
- 행간, 문단 밀도, 여백, 줄바꿈 타이밍이 다름
- 특히 짧은 글/긴 글에서 체감 차이가 커짐

이건 구현 오류라기보다 `편집기 = 로컬 렌더`, `읽기 = 서버 렌더`라는 이중 렌더 구조에서 오는 구조적 불일치다.

### 2.3 모바일 폰트 선택 미구현

서버 에디터는 폰트 선택 기능을 이미 가지고 있다.

- [editor2.js](/Users/gimtaehun/2026/workspace/projects/glsoop/public/js/editor2.js)
  - `fontSelectEl`
  - `FONT_MAP`
  - `font_key`
  - `<!--FONT:serif-->` 메타

반면 모바일은 현재 아래만 지원한다.

- 정렬
- 글자 크기 비율
- 줄간격
- 박스 위치/크기

즉, 현재 모바일 `layout_json`에는 `font_key` 개념이 없고, `Write` UI에도 폰트 선택기가 없다. 결과적으로 서버에서 지원하는 `serif / sans / hand` 계열 감성 선택을 모바일에서는 재현할 수 없다.

이 문제는 단순 옵션 누락이 아니라, 아래 두 층이 동시에 비어 있다는 점이 핵심이다.

1. 데이터 모델 미정
2. UI 미구현

## 3. 원인 요약

### 3.1 로그인 오류 원인

- `SecureStore` key 제약과 현재 토큰 키 문자열이 충돌
- 원인 후보는 사실상 [authToken.ts](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/src/lib/authToken.ts)의 `glsoop:auth:token:v1`

### 3.2 글자 크기 불일치 원인

- 편집은 로컬 텍스트 렌더
- 미리보기/상세는 서버 이미지 렌더
- 같은 `layout_json`이라도 실제 타입셋 엔진이 다름

### 3.3 폰트 선택 부재 원인

- 모바일 `Write` UI에 폰트 선택기 없음
- 모바일 저장 payload에 `font_key` 또는 동등 개념 없음
- 모바일 읽기/편집 렌더 모두 `font family`를 고정 사용

## 4. 해결 방향

### 4.1 로그인 오류

가장 먼저 수정해야 한다.

권장 방향:

- `SecureStore` 키를 허용 문자만 쓰는 형식으로 변경
  - 예: `glsoop_auth_token_v1`
- 변경 시 기존 저장 토큰 마이그레이션 여부를 함께 결정
  - 현재는 실기기 실패가 우선 문제이므로, 1차는 새 키로 저장하고 예전 키는 무시해도 무방
- 수정 후 검증
  - Expo Go 실제 로그인
  - 앱 재시작 후 세션 복원
  - 로그아웃/401 시 토큰 삭제

이 항목은 별도 정책 논의보다 즉시 수정이 맞다.

### 4.2 편집기와 Post 상세 렌더 일치

방향은 두 가지 중 하나다.

#### 옵션 A. 편집 화면도 서버 렌더 프리뷰 중심으로 전환

- 편집 중 종이 위 텍스트는 “입력용 오버레이”로만 두고
- 사용자가 보는 최종 결과는 항상 서버 `/api/feed-images/preview`를 기준으로 삼는다
- 즉, 편집 화면의 핵심 시각 기준을 로컬 `TextInput`이 아니라 서버 프리뷰로 옮긴다

장점:

- Post 상세와 가장 유사한 결과
- “내가 본 것과 게시 후가 다르다” 문제 감소

단점:

- 입력 중 즉시성 저하 가능
- 프리뷰 요청 debounce/cache 전략 필요

#### 옵션 B. Post 상세를 서버 이미지가 아니라 로컬 타입셋으로 맞춘다

- 현재 `PostDetail`의 서버 이미지 렌더 우선 구조를 줄이고
- `Write`와 같은 로컬 paper renderer를 정교하게 만들어 동일 엔진을 쓰게 한다

장점:

- 편집 화면과 읽기 화면 일치
- 네트워크 의존 감소

단점:

- 서버와 완전 동일한 결과 보장은 어려움
- 현재 사용자 요청인 “서버와 완전히 동일” 방향과는 거리가 있음

현재 요구사항 기준으로는 `옵션 A`가 더 적합하다.

즉, **편집기에서 보이는 최종 페이지도 서버 프리뷰를 기준으로 맞추고, 로컬 입력 레이어는 박스 편집용으로만 사용**하는 쪽이 좋다.

### 4.3 폰트 선택 기능

이건 별도 작은 기능처럼 보이지만, 실제로는 `콘텐츠 메타 + 렌더 규칙` 문제다.

권장 방향:

1. 모바일 작성 상태에 `fontKey` 추가
   - `serif`
   - `sans`
   - `hand`
2. 저장 시 서버가 이미 쓰는 방식과 정합성 확보
   - 가능하면 서버와 같은 `font_key`
   - 또는 서버 메타 방식(`<!--FONT:...-->`)과 충돌 없이 저장
3. `Write`에 폰트 선택 UI 추가
4. `Preview` 요청에도 선택한 폰트가 반영되게 서버/모바일 계약 확인
5. `PostDetail`의 서버 렌더 결과에도 같은 폰트가 보이는지 종단 확인

핵심은, 폰트 선택은 `모바일 화면 옵션`만 추가해서 끝나는 게 아니라 `서버 렌더도 같은 fontKey를 읽게` 해야 한다는 점이다.

## 5. 권장 작업 순서

### 1순위. Expo Go 로그인 오류 수정

- 범위
  - [authToken.ts](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/src/lib/authToken.ts)
- 목표
  - `SecureStore` 키 오류 제거
  - Expo Go 로그인 해피패스 복구
- 현재 반영
  - [authToken.ts](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/src/lib/authToken.ts)에서 네이티브 저장 키를 `glsoop_auth_token_v1`로 변경 완료
  - 남은 것은 실제 Expo Go 기기 로그인 재확인

### 2순위. 편집기 최종 결과 기준을 서버 프리뷰로 재정리

- 범위
  - [Write.tsx](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/src/screens/Write.tsx)
  - [WriteEditor.tsx](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/src/components/write/WriteEditor.tsx)
  - [WritePreviewCard.tsx](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/src/components/write/WritePreviewCard.tsx)
  - [feedImage.ts](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/src/lib/feedImage.ts)
- 목표
  - 편집 중/미리보기/Post 상세의 최종 종이 결과를 하나의 시각 기준으로 통일
- 현재 반영
  - [Write.tsx](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/src/screens/Write.tsx)에서 편집 모드일 때도 서버 프리뷰 카드를 함께 노출
  - [WritePreviewCard.tsx](/Users/gimtaehun/2026/workspace/projects/glsoop-mobile/src/components/write/WritePreviewCard.tsx)가 서버 프리뷰를 최종 결과 기준으로 사용

### 3순위. 폰트 선택 기능 추가

- 범위
  - `Write` 상태
  - 저장 payload
  - preview/post 렌더 계약
- 목표
  - 서버와 동일한 폰트 선택 경험 확보
- 현재 반영
  - `serif / sans / hand` 선택 UI 추가
  - 저장 시 `content`에 `<!--FONT:...-->` 메타 포함
  - 수정 진입 시 기존 글의 폰트 메타를 읽어 복원
  - 서버 프리뷰와 상세 렌더도 같은 메타를 사용

## 6. 구현 메모

### 6.1 로그인 오류 수정 메모

- 현재 키
  - `glsoop:auth:token:v1`
- 권장 새 키
  - `glsoop_auth_token_v1`

### 6.2 편집/읽기 일치 메모

- 현재는 `WriteEditor`가 직접 텍스트를 그림
- `WritePreviewCard`와 `PostDetail`은 서버 렌더 기반
- 따라서 “박스 편집 레이어”와 “최종 출력 레이어”를 분리하는 것이 맞다

### 6.3 폰트 기능 메모

- 서버는 이미 `font_key`/폰트 메타를 사용 중
- 모바일은 아직 `layout_json`만 다루고 폰트 정보는 없음
- 후속 구현 시 `layout`과 `font`를 분리해 관리하는 편이 깔끔하다

## 7. 완료 기준

### 로그인

- Expo Go 실제 기기에서 로그인 성공
- `SecureStore` key 오류 재현 안 됨
- 앱 재기동 후 로그인 상태 유지

### 편집/읽기 일치

- 같은 글에 대해 `Write preview`와 `PostDetail` 결과의 글자 크기/행간 체감 차이가 크게 줄어듦
- 짧은 글/긴 글에서 줄바꿈과 여백이 예측 가능해짐

### 폰트 선택

- 모바일에서 폰트 선택 가능
- 저장 후 다시 편집 진입 시 선택값 복원
- Post 상세/서버 렌더 결과에 같은 폰트가 반영됨

## 8. 결론

현재 가장 급한 문제는 `Expo Go 로그인 오류`다. 이건 실사용 자체를 막기 때문에 즉시 수정하는 게 맞다.

그 다음 문제는 `편집기와 Post 상세가 서로 다른 렌더 엔진을 쓰는 구조`다. 현재는 서버 프리뷰를 편집 화면 아래에 상시 노출해서 최종 결과 기준을 맞추기 시작했다.

마지막으로 `폰트 선택`은 이제 모바일에도 반영됐고, `fontKey 저장/복원/렌더 반영`까지 한 세트로 연결됐다. 남은 것은 실제 기기 기준 QA와 미세 시각 차이 조정이다.
