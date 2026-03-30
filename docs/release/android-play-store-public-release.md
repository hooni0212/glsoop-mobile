# Android Play Store 공개 출시 런북

- 문서 타입: `Runbook`
- 적용 범위: `glsoop-mobile`
- 대상 독자: 모바일 개발자, 릴리스 담당자
- 상태: `Draft`
- 최종 업데이트: `2026-03-29`
- Owner: `taehun`
- 공통 기준 문서: `docs/release/store-metadata-canonical.md`

---

## Summary

현재 저장소 기준으로 Android 공개 출시를 위한 기본 식별자와 검증 스크립트는 준비됐다.
이제 남은 일은 Play Console과 EAS credentials 쪽을 연결하고,
내부 테스트부터 production rollout까지 콘솔 절차를 끝내는 것이다.

현재 기준 상태:

- package name: `com.glsoop.app`
- app version: `1.0.0`
- Android versionCode: `1`
- `eas.json`의 Android submit profile 기본 track: `internal`
- Android 공개 배포용 `.aab`는 아직 생성 전이다.

이번 런북의 범위:

- Android Play Console 최초 세팅
- internal testing 업로드
- production 공개 출시 준비
- 출시 직전 체크리스트 정리

이번 런북의 범위에 포함하지 않는 것:

- iOS App Store 공개 출시
- GitHub Actions/CI 자동화
- Android 전용 기능 추가 개발

---

## Key Changes

### 1. Play Console 앱 레코드와 package name을 먼저 고정한다

Play Console에서 앱을 만들 때 저장소 설정과 동일한 package name을 사용해야 한다.
앱 이름, 설명, 정책 URL, 연락처 정보는 `docs/release/store-metadata-canonical.md` 기준으로
iOS와 동일한 값을 사용한다.

- app name 결정
- 앱/게임 여부 결정
- 무료/유료 여부 결정
- 연락 이메일 입력
- package name `com.glsoop.app` 기준으로 앱 레코드 생성

중요한 점:

- package name은 첫 공개 이후 사실상 바꿀 수 없다고 생각하고 잡아야 한다.
- store listing은 테스트 트랙과 production 트랙이 공유되므로 초기에 기본 정보부터 맞춰 두는 편이 안전하다.

### 2. EAS credentials와 Play App Signing을 연결한다

Expo 기준 Android 제출 자동화 전제는 Play Console 쪽 service account 연결이다.

- Play Console에서 앱을 생성한다.
- Play App Signing 약관을 수락한다.
- Google Service Account key를 만든다.
- key를 로컬에 커밋하지 말고 EAS dashboard credentials에 업로드한다.
- 필요 시 `npx eas-cli credentials --platform android`로 업로드를 점검한다.

현재 저장소는 `submit.production.android.track=internal`로 고정해 두었으므로,
처음 자동 제출이 production 대신 internal testing으로 향한다.

### 3. 첫 Android build는 AAB 기준으로 internal testing까지 올린다

첫 공개 배포 전에 아래 순서가 가장 안전하다.

1. `npm run release:android:verify:config`
2. `npm run release:android:verify:prod-env`
3. `npm run release:android:verify:api`
4. `npx eas-cli build --platform android --profile production`
5. `npx eas-cli submit --platform android --profile production`

설명:

- EAS build 결과물은 Play 업로드용 `.aab`를 기준으로 본다.
- repo 기본 submit track이 `internal`이라 첫 제출을 실수로 production에 보내지 않는다.
- internal test는 빠르게 QA 확인하기 좋은 첫 단계다.

### 4. Play Console 필수 입력을 App content 중심으로 끝낸다

공개 출시 전 Play Console에서 아래를 채운다.

iOS와 의미가 겹치는 항목은 값도 같이 맞춘다.

- 앱 이름, 짧은 설명, 전체 설명
- 카테고리, 연락처 정보
- 개인정보 처리방침 URL
- 앱 아이콘, feature graphic, 폰/태블릿 스크린샷
- App content 문항
- Data safety 문항
- 국가/지역, 가격 정책

이 앱은 로그인, 사용자 생성 콘텐츠, 정책 링크, 지원 문의 흐름이 있으므로
Data safety와 App content를 대충 입력하면 리젝 위험이 크다.

### 5. 개인 개발자 계정이면 closed test 조건을 먼저 확인한다

Google Play 공식 도움말 기준으로 개인 계정이 `2023-11-13` 이후 생성된 경우,
production 공개 전 별도 testing 요구사항이 붙을 수 있다.

보수적으로는 아래 흐름을 기본값으로 잡는다.

- internal test로 기술 QA
- 필요 시 closed test 생성
- 개인 계정 요구사항에 해당하면 최소 요건 충족 후 production 진입

현재 기준으로 공식 문서에 나온 대표 조건은
`12명 이상의 테스터가 참여한 closed test를 14일 이상 유지`하는 흐름이다.
이 조건 적용 대상인지는 Play Console 계정 유형에서 직접 확인해야 한다.

### 6. production 출시는 staged rollout 기준으로 진행한다

첫 공개 출시는 한 번에 100%로 열기보다 staged rollout이 안전하다.

- internal 또는 closed test에서 최종 QA 완료
- production release 생성
- 국가/지역과 앱 콘텐츠 경고가 없는지 다시 확인
- staged rollout 비율 결정
- 이상 없으면 100% 확대

---

## Test Plan

### 로컬 사전 검증

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run release:android:verify:config`
- [ ] `npm run release:android:verify:prod-env`
- [ ] `npm run release:android:verify:api`
- [ ] Android 실기기에서 로그인, 피드, 글 상세, 작성, 북마크, 성장 스모크 QA

### Play Console 입력 확인

- [ ] 앱 레코드 생성 완료
- [ ] package name `com.glsoop.app` 확인
- [ ] App content 완료
- [ ] Data safety 완료
- [ ] 개인정보 처리방침 URL 입력
- [ ] 연락처 정보 입력
- [ ] 앱 아이콘 / feature graphic / 스크린샷 업로드
- [ ] 국가/지역 및 가격 정책 설정

### EAS / 업로드 확인

- [ ] Android service account key를 EAS credentials에 업로드
- [ ] `npx eas-cli build --platform android --profile production` 성공
- [ ] `.aab`가 internal testing 트랙에 제출됨
- [ ] internal tester 설치 및 업데이트 확인

### production 직전 확인

- [ ] 개인 계정 testing requirement 해당 여부 확인
- [ ] target API 정책 충족 여부를 build 결과에서 확인
- [ ] 크래시 없이 cold start, 로그인, 세션 복구 확인
- [ ] support/privacy/legal 링크 확인
- [ ] staged rollout 전략 확정

---

## Assumptions

- Android package name은 iOS와 맞춘 `com.glsoop.app`으로 확정한다.
- 첫 공개 출시는 internal testing을 거친 뒤 production으로 올린다.
- Play Console service account key는 repo에 커밋하지 않고 EAS credentials에만 올린다.
- target API 최종 충족 여부는 첫 Android production build 결과 기준으로 다시 확인한다.

---

## References

- Expo Submit Android: https://docs.expo.dev/submit/android/
- Google Play Create app: https://support.google.com/googleplay/android-developer/answer/9859152
- Google Play Prepare and roll out a release: https://support.google.com/googleplay/android-developer/answer/9859348
- Google Play Testing tracks: https://support.google.com/googleplay/android-developer/answer/9845334
- Google Play Target API policy: https://support.google.com/googleplay/android-developer/answer/11917020
- Google Play User Data and Data safety: https://support.google.com/googleplay/android-developer/answer/10144311
- Google Play App Signing: https://support.google.com/googleplay/android-developer/answer/9842756
