> Canonical moved: 공통 release / app-review 문서는 `glsoop-ops/docs/release/mobile` 및 `glsoop-ops/docs/app-review/ios`를 기준으로 관리합니다.
>
> 이 파일은 기존 링크 호환을 위해 임시 유지합니다.

# 스토어 공통 메타데이터 기준

- 문서 타입: `Canonical Metadata`
- 적용 범위: `glsoop-mobile`
- 대상 독자: 모바일 개발자, 릴리스 담당자, 스토어 메타데이터 작성자
- 상태: `Draft`
- 최종 업데이트: `2026-05-02`
- Owner: `taehun`

---

## 목적

App Store Connect와 Play Console에 같은 의미의 항목이 있을 때
서로 다른 값을 넣지 않도록 `공통 기준값`을 한 문서에 고정한다.

원칙은 간단하다.

- 양쪽 스토어에 모두 있는 값은 이 문서를 기준으로 동일하게 입력한다.
- 플랫폼 전용 값만 iOS/Android 런북에서 따로 관리한다.
- 값이 바뀌면 이 문서와 각 런북, 필요 시 `app.json`과 `src/config/release.ts`를 함께 갱신한다.

---

## 잠금 값

아래 값은 두 스토어에서 동일하게 유지한다.

- 앱 이름: `글숲`
- 앱 식별자 기준값: `com.glsoop.app`
- 공개 버전: `1.0.0`
- 대표 사이트 URL: `https://www.glsoop.com`
- 이용약관 URL: `https://www.glsoop.com/html/terms.html`
- 개인정보 처리방침 URL: `https://www.glsoop.com/html/privacy.html`
- 커뮤니티 가이드라인 URL: `https://www.glsoop.com/html/community-guidelines.html`
- 개인정보 선택/마케팅 수신 철회 경로: 앱 내 `계정센터 > 보안 및 로그인 > 광고성 마케팅 알림`
- 서비스 한 줄 소개: `일상의 작은 순간들을 기록하고 나누는 공간`
- 서비스 확장 소개 초안: `매일 조금씩 읽고 쓰는 사람들을 위한 공간, 글숲에서 조용히 오래 남는 글을 만들고 있어요.`

값 출처:

- 식별자/브랜드/URL 기준: `src/config/release.ts`
- 앱 내 대표 카피 기준: `src/screens/AuthWelcome.tsx`
- 스토어용 확장 소개 초안: `tools/release/capture-ios-store-screenshots.mjs`

---

## 동기화 규칙

### 1. 스토어에 같은 의미의 필드가 있으면 같은 값으로 넣는다

- App Store `앱 이름` = Play `앱 이름`
- App Store `설명` = Play `전체 설명`
- App Store `지원 URL` = Play `웹사이트` 또는 지원용 연락처 랜딩 기준
- App Store `개인정보 처리방침 URL` = Play `개인정보처리방침 URL`
- App Store 심사 메모에 적는 지원/신고 설명 = Play `App content` 답변 기준 설명

### 2. 연락처 값은 앱 런타임 기준과 어긋나지 않게 맞춘다

지원 이메일, 문의 전화, 개인정보보호책임자 정보는
스토어 콘솔 값과 앱 런타임에서 보이는 값이 달라지면 혼란이 생긴다.

따라서 아래를 한 세트로 본다.

- `EXPO_PUBLIC_SUPPORT_URL`
- `EXPO_PUBLIC_SUPPORT_EMAIL`
- 서버 `runtime-config`의 `legal.contacts.*`
- App Store Connect 연락처/지원 정보
- Play Console 연락처/지원 정보

### 3. 아직 확정되지 않은 값은 한쪽만 먼저 쓰지 않는다

카테고리, 키워드, 마케팅 문구처럼 아직 팀이 확정하지 않은 항목은
한쪽 스토어에만 임시값을 넣지 말고, 먼저 여기서 확정한 뒤 양쪽에 같이 반영한다.

---

## 플랫폼별 매핑

### iOS 전용 값

- bundle identifier: `com.glsoop.app`
- App Store Connect app id: `6761228925`
- 현재 심사 후보 build: `1.0.0 (9)`
- App Privacy 확인: 마케팅 푸시를 위해 수집/사용하는 계정 식별자와 push token 용도를 `Developer's Advertising or Marketing` 목적에 맞게 반영한다.
- Review Notes 확인: 마케팅 푸시는 명시 동의 사용자에게만 발송하고, 앱 내 철회 경로를 제공한다는 설명을 포함한다.

### Android 전용 값

- package name: `com.glsoop.app`
- 현재 versionCode: `1`
- 기본 submit track: `internal`

---

## 변경 순서

스토어 메타데이터를 수정할 때는 아래 순서를 권장한다.

1. 이 문서에서 공통 기준값을 먼저 수정한다.
2. `src/config/release.ts`와 `app.json`에 반영할 값이 있으면 같이 수정한다.
3. `docs/release/ios-app-store-public-release.md`와 `docs/release/android-play-store-public-release.md`를 같이 갱신한다.
4. 각 스토어 콘솔에서 같은 값이 들어갔는지 최종 확인한다.
