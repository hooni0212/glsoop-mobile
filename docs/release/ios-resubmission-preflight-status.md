# iOS 재심 제출 전 상태 점검

- 문서 타입: `Preflight Status`
- 적용 범위: `glsoop-mobile`
- 대상 독자: 릴리스 담당자, QA, 운영자
- 상태: `In Progress`
- 최종 업데이트: `2026-04-04`
- Owner: `taehun`

---

## 목적

재심 제출 직전 기준으로
무엇이 이미 확인되었고 무엇이 아직 남았는지 한 문서에서 판단하기 위한 상태판이다.

---

## 확인 완료

- `iPhone-only` 제출 전략
  - `supportsTablet: false` 설정 존재
  - `write` 화면의 iPad 전용 presentation 분기 제거 완료
  - iOS 런북에서도 iPad 스크린샷 기대치 제거 완료
- 공개/비공개 접근 정책
  - 공개: Home, Search, Post detail, Author profile
  - 로그인 필요: Growth, Bookmarks, Me, Write
- UGC safety 대응
  - 신고 기능 존재
  - 차단 시 즉시 숨김 + 운영 검토 큐 자동 접수 구현 완료
  - admin safety queue에서 `report`, `block` 레코드 확인 가능하도록 서버 반영 완료
- 지원 진입점
  - 앱 내 `계정 센터 > 도움말 및 지원` 화면 준비 완료
  - support email: `glsoop1752@gmail.com`
  - support URL: `https://www.glsoop.com/support`
- 자동 검증
  - `npm run lint` 통과
  - `npm run typecheck` 통과
  - `npm run e2e:web` 통과
  - `npm run release:ios:verify:config` 통과
- production 리뷰 계정 로그인
  - `https://glsoop.com/api/login` 기준 로그인 성공 확인
  - `https://glsoop.com/api/me` 기준 계정 조회 성공 확인

---

## 현재 블로커

### 1. support URL 실배포 미반영

- `https://www.glsoop.com/support` 현재 응답: `404`
- 앱/문서/심사 메모는 이미 해당 URL을 사용하므로
  서버 배포가 끝나기 전까지는 재심 제출 블로커로 본다

### 2. production 변형 검증 미실행

아래 검증은 실제 production 데이터에 변화를 남길 수 있으므로
이 문서 작성 시점에는 자동 실행하지 않았다.

- 실제 신고가 admin safety queue에 잡히는지
- 실제 차단 후 Home/Search/Post detail/Author profile에서 즉시 숨김 되는지

권장 방식:

- 운영자가 준비한 테스트 게시글/작성자 사용
- admin 화면을 동시에 열어두고 신고/차단 이벤트 확인
- 검증 후 필요 시 테스트 계정 정리

### 3. 새 iOS 빌드 미생성

- 새 production iOS build는 아직 생성하지 않았다
- App Store Connect 연결 및 재심 제출도 아직 남아 있다

---

## 권장 실행 순서

1. `../glsoop` 서버 변경을 배포해 `https://www.glsoop.com/support`를 `200`으로 만든다
2. production에서 테스트 게시글/작성자를 정하고 신고/차단 실검증을 한다
3. 실제 iPhone에서 `ios-app-review-recording-script.md` 기준으로 녹화를 만든다
4. `ios-app-review-notes-draft.md`를 App Store Connect Notes에 붙여 넣고 리뷰 계정 값을 채운다
5. 새 iOS build를 생성해 App Store Connect에 연결한다
6. 재심 제출 후 상태를 추적한다

---

## 제출 직전 최종 체크

- [ ] `https://www.glsoop.com/support`가 `200` 응답
- [ ] 리뷰 계정으로 앱 로그인 성공
- [ ] 신고 1회가 admin safety queue에 잡힘
- [ ] 차단 1회가 즉시 숨김 + admin queue 접수로 동작
- [ ] 물리 iPhone 녹화 파일 준비
- [ ] App Review Notes 입력 완료
- [ ] 새 iOS build 업로드 완료
- [ ] App Store Connect에서 `Submit for Review` 직전 화면까지 확인
