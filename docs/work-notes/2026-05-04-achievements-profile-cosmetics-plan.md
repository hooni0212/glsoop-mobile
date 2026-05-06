# 모바일 업적 페이지 및 프로필 꾸미기 개편 계획

작성일: 2026-05-04
브랜치: `feature/profile-cosmetics-achievements`

## 배경

현재 모바일은 업적과 프로필 꾸미기가 연결되어 보이지 않는다. 업적 화면은 진행도 목록 중심이고, 프로필 꾸미기 화면은 대표 뱃지, 쇼케이스 뱃지, 헤더 스티커만 편집한다. 설치 앱에서 프로필 꾸미기가 약하게 보이는 문제는 production API 주소와 원격 DB seed 상태도 함께 확인해야 하지만, 제품 경험 자체도 보상 획득과 장착 흐름이 부족하다.

## 목표

- 업적 화면에서 보상 배지/배경을 명확히 보여준다.
- 완료한 업적의 보상을 수령하고, 곧바로 프로필 꾸미기로 이어지게 한다.
- 프로필 꾸미기 화면에 배경 선택과 라이브 미리보기를 추가한다.
- 공개 작가 프로필에서 선택한 배경, 대표 뱃지, 쇼케이스 뱃지, 스티커가 일관되게 보이게 한다.

## 모바일 작업 범위

1. 타입/서비스 확장
   - `CosmeticItem`에 `type`, `meta`를 추가한다.
   - `CosmeticsInventory`를 `badges`, `stickers`, `backgrounds`로 확장한다.
   - `ProfileCosmeticsState`에 `profile_background_key`를 추가한다.
   - `ProfileCosmeticsExpanded`에 `profile_background`를 추가한다.
   - `updateProfileCosmetics`가 배경 선택까지 저장하도록 한다.

2. 업적 화면 개편
   - 상단에 전체 진행률, 완료 수, 수령 가능한 보상 수를 보여준다.
   - 업적 카드는 보상 preview chip을 포함한다.
   - 완료했지만 보상을 받지 않은 업적은 primary action을 노출한다.
   - 보상 수령 후 `refreshMyCosmetics(true)`를 호출하고 프로필 꾸미기 CTA를 보여준다.

3. 프로필 꾸미기 화면 개편
   - 상단에 라이브 프로필 미리보기를 추가한다.
   - 편집 섹션 순서를 `배경`, `대표 뱃지`, `쇼케이스 뱃지`, `헤더 스티커`로 정리한다.
   - 보유 배경이 없더라도 기본 배경을 보여준다.
   - 저장 실패 시 인증 오류, 서버 연결 실패, 소유하지 않은 코스메틱 오류를 구분해 toast로 보여준다.

4. 공개 프로필 반영
   - `Author` 화면의 profile card 배경을 `profile_background` 기준으로 렌더링한다.
   - feed/post detail의 author preview가 최소한 대표 뱃지와 배경 contract를 깨지 않게 normalize한다.

## UX 원칙

- 업적은 “목록”보다 “수집 진행도”가 먼저 보이게 한다.
- 보상은 잠겨 있어도 보여주되, 조건을 짧게 표시한다.
- 프로필 꾸미기는 저장 전 미리보기가 실제 공개 프로필과 최대한 같은 구조여야 한다.
- 배경은 글 작성 배경과 다른 “프로필 장식”으로 표현한다.

## 검증

- `npm run typecheck`
- `npm run lint`
- `npx playwright test e2e/growth-flow.spec.ts e2e/author-flow.spec.ts`
- 설치 앱 검증 전 `npm run release:ios:verify:prod-env` 또는 Android 대응 스크립트로 production API 주소를 확인한다.

## 1차 구현 기준

- 서버가 `backgrounds` inventory와 `profile_background` 응답을 제공하면 모바일이 이를 표시하고 저장한다.
- 업적별 보상은 서버 `ui_json.rewards.cosmetics`에서 파싱하고, 모바일은 배지/배경 preview를 렌더링한다.
- 특별 배경은 `background_writer_grove`, `background_deep_forest` 두 개를 먼저 지원한다.
