# Mobile Paper Surface Rollout Plan (Photo-like Refinement)

## 1. 목표 한 줄 요약
UI 카드처럼 보이지 않고, **"종이에 인쇄된 문장을 찍은 사진"**처럼 보이게 만든다.

핵심 수단:
- 배경(종이+빛)
- 여백
- 대비 완화
- UI 요소 비주얼 강조 축소

## 2. 현재 느낌이 안 나는 이유
- 빛(조명) 레이어가 없어 종이 사진의 방향성이 없다.
- 깊이(모서리/그림자/액자감)가 약해 평면 UI처럼 보인다.
- 텍스트가 너무 선명하고 커서 인쇄물보다 앱 타이포처럼 보인다.
- 메타/아이콘이 눈에 띄어 감성보다 기능 UI가 먼저 보인다.
- 카드 안 밝은 박스 레이어가 종이 한 장 느낌을 깨뜨린다.

## 3. Pinterest 감성 규칙
1. 여백을 크게: 카드 내부 padding을 과감히 키운다.
2. 텍스트 크기/줄간격 안정화: 제목/본문 모두 과장하지 않는다.
3. 대비 완화: 순검정 대신 짙은 브라운/차콜 계열로 맞춘다.
4. 빛 레이어 추가: 텍스처 + 방향성 그라디언트 + 비네팅을 쓴다.
5. UI 요소는 묻히게: 기본 상태 아이콘/카운트는 작은 회색 톤 유지.
6. 경계 톤 통일: 테두리는 얇고 흐리게, 강한 보더는 금지.
7. 카드는 정보 패널이 아니라 "한 장의 사진 액자"처럼 구성한다.
8. 상태 가시성 보장: `liked/bookmarked/pressed` 상태는 즉시 구분 가능해야 한다.

## 4. 구현 순서

### 4-0. 선행 수정(필수)
- 첫 카드 잘림/겹침 등 레이아웃 버그를 먼저 해결한다.
- 레이아웃 깨짐 상태에서 감성 튜닝은 진행하지 않는다.

### 4-1. PaperSurface를 "분위기 엔진"으로 재정의
`PaperSurface` 책임:
- 종이 base 색
- 텍스처 이미지
- 방향성 빛(그라디언트)
- 미세 비네팅
- 종이 경계(얇은 테두리 + 은은한 그림자)
- 텍스처 실패/비활성 fallback

레이어 순서:
1. base paper color
2. texture image (low opacity)
3. directional light gradient (top-left -> bottom-right)
4. subtle vignette
5. thin border + soft shadow

### 4-2. 적용 범위 제한
- 1차는 `FeedCard` 1개 컴포넌트만 집중 교체
- 테스트 데이터는 `short / medium / long` 3종으로 고정 검증
- 결과가 기준 통과 시 `PostDetail`/다른 읽기 화면으로 확장

### 4-3. 카드 내부 레이아웃 전환
- 제목: 1~2줄 중심
- 본문: 2~5줄 프리뷰
- 메타: 매우 작고 저대비
- 액션(좋아요/북마크): 우하단 소형, 기본 비강조
- 상태 활성 시만 강조색/굵기 상승

### 4-4. 튜닝 파라미터 (중요도 순)
- `padding`
- `title/body size`, `lineHeight`, `letterSpacing`
- `light gradient alpha`
- `texture opacity`
- `icon/meta emphasis`
- `border/shadow`

## 5. 파라미터 범위 (Phase 1 기준)
- `paper.padding`: 40~60 (default 48)
- `paper.textureOpacity`: 0.12~0.35 (default 0.22)
- `paper.lightAlpha`: 0.08~0.22 (default 0.14)
- `paper.vignetteAlpha`: 0.04~0.14 (default 0.08)
- `paper.titleSize`: 34~42 (default 38)
- `paper.bodySize`: 16~20 (default 18)
- `paper.bodyLineHeight`: 1.45~1.70 배 (default 1.58)
- `paper.bodyLetterSpacing`: -0.30~0.00 (default -0.10)
- `paper.borderWidth`: 1 (고정)

참고:
- 실제 모바일 가독성 하한선은 유지한다.
- 본문 최소 글자 크기 15, 주요 텍스트 대비 4.5:1 이상을 목표로 한다.
- 터치 요소 hit area는 최소 44x44를 유지한다.

## 6. 파일 단위 작업 계획

신규:
- `src/components/surfaces/PaperSurface.tsx`
- `src/theme/paper.ts`
- `assets/paper/paper-texture.png`

수정:
- `src/theme/tokens.ts`
- `src/components/FeedCard.tsx`
- `src/screens/PostDetail.tsx`
- `src/screens/PostDetail.styles.ts`

## 7. 수용 기준 (Acceptance Criteria)

비주얼:
- 카드가 UI 패널이 아니라 "사진 같은 종이 한 장"으로 인지된다.
- 빛 방향성이 보이고, 텍스처 반복이 거슬리지 않는다.
- 카드 내부 별도 밝은 박스 레이어가 눈에 띄지 않는다.

기능/상태:
- 좋아요/북마크/공유 동작 회귀가 없다.
- 기본 상태 아이콘은 비강조, 활성 상태는 즉시 구분된다.

가독성:
- 밝은/어두운 환경에서 본문이 흐리거나 번지지 않는다.
- 본문 최소 크기/대비 기준을 만족한다.

성능:
- 기준 디바이스(iPhone 13급, Galaxy S21급)에서 피드 50개 이상 스크롤 3회 시
  300ms 이상 멈춤이 없다.
- RN Performance Monitor 기준 스크롤 FPS가 대부분 50 이상 유지된다.

## 8. 검증 체크리스트

자동:
- `npm run lint`

수동:
- Home 첫 카드 잘림/겹침 없음
- `short / medium / long` 카드 모두 시각 안정성 확보
- 제목 2줄, 본문 0줄, 메타 없음, 이모지 포함 텍스트에서 깨짐 없음
- iOS/Android 대비 차이 허용 범위 내
- Feature flag ON/OFF 즉시 반영

## 9. 리스크 및 대응

리스크 1 - 텍스처 반복 패턴이 눈에 띔
- 대응: 텍스처 오프셋/강도 미세 변형 또는 gradient 중심 렌더로 전환

리스크 2 - 리스트 렌더 비용 증가
- 대응: 텍스처 1종 재사용 + 낮은 opacity 유지
- 대응: 필요 시 Home만 texture off (overlay only)

리스크 3 - 대비 저하
- 대응: `ink/overlay/light` 토큰을 즉시 조정 가능하게 유지

리스크 4 - 플랫폼 합성 차이
- 대응: 그림자 최소화, 색/오버레이 중심 설계 유지

## 10. 운영 안전장치 (Feature Flag)

Phase 1:
- 전역 플래그: `EXPO_PUBLIC_ENABLE_PAPER_TEXTURE` (default `true`)
- `false`면 전체 화면 텍스처 OFF + paper base/overlay만 사용

Phase 2+ 확장:
- 화면 단위 플래그(`HOME`, `POST_DETAIL`)는 전역 ON일 때만 평가
- 전역 OFF는 최우선 kill-switch

롤백 기준:
- 가독성/성능 기준 미달 시 즉시 전역 texture OFF 적용
- 필요 시 Home 화면만 texture OFF + overlay only로 부분 롤백
