# Cloudflare Redirect Policy (Web Beta -> App Launch)

## 0) 목적
- 현재는 `웹(www)`만 공개 베타로 운영하고 `모바일(m)`은 비공개로 유지한다.
- 앱 출시 시점에는 모바일 사용자를 `www -> m`으로 유도하고, `m`은 스토어 랜딩 페이지로 운영한다.
- SEO/트래킹 손실 없이 단계 전환이 가능하도록 리다이렉트 기준을 고정한다.

---

## 1) 도메인 역할
- `www.glsoop.com`: 공개 웹 베타/운영 서비스
- `m.glsoop.com`: 
  - 베타 기간: 비공개(내부 테스트 전용)
  - 앱 출시 후: 앱 다운로드 랜딩 페이지

---

## 2) 단계별 정책

### Phase A. 웹 베타 기간 (지금)
- `www.glsoop.com`
  - 모든 디바이스(모바일/데스크톱)에서 그대로 웹 서비스 제공
  - 모바일 강제 리다이렉트 없음
- `m.glsoop.com`
  - 외부 비공개(권장: Cloudflare Zero Trust Access로 이메일/계정 allowlist)
  - 비인가 접근은 `403` 또는 로그인 요구 화면
  - 검색 노출 방지: `X-Robots-Tag: noindex, nofollow, noarchive`

### Phase B. 앱 출시 이후
- `m.glsoop.com`
  - 공개 랜딩 페이지로 전환
  - 필수 요소:
    - `App Store` 버튼
    - `Google Play` 버튼
    - `웹으로 계속` 링크(`https://www.glsoop.com`)
    - UTM 보존/측정 파라미터 로깅
- `www.glsoop.com`
  - 모바일 브라우저 + 봇 아님 + 예외 아님 조건에서 `302`로 `m` 리다이렉트
  - 데스크톱/봇은 기존 `www` 유지

---

## 3) 리다이렉트 의사결정표

| 단계 | 조건 | 동작 |
|---|---|---|
| Phase A | host=`www.glsoop.com` | 리다이렉트 없음, 웹 서비스 제공 |
| Phase A | host=`m.glsoop.com` + 인가 사용자 | 내부 테스트 페이지 제공 |
| Phase A | host=`m.glsoop.com` + 비인가 사용자 | 접근 차단(`403` 권장) |
| Phase B | host=`www.glsoop.com` + 모바일 UA + `cf.client.bot=false` | `302` -> `https://m.glsoop.com{path}?{query}` |
| Phase B | host=`www.glsoop.com` + 데스크톱 또는 봇 | 리다이렉트 없음 |
| Phase B | host=`m.glsoop.com` | 스토어 랜딩 페이지 제공 |

---

## 4) 예외/보호 규칙
- 리다이렉트 제외(권장):
  - `?no_mobile_redirect=1` 쿼리 존재 시(디버깅/CS 대응)
  - SEO 크롤러(`cf.client.bot=true`)
- 쿼리 스트링은 항상 유지:
  - 예: `www.glsoop.com/post/123?utm_source=ig` -> `m.glsoop.com/post/123?utm_source=ig`
- 상태코드:
  - 초기 전환 기간: `302`(임시)
  - 정책이 완전히 고정된 뒤에만 `301` 검토

---

## 5) Cloudflare 적용 기준

### 5-1. 베타 기간 (`m` 비공개)
- Cloudflare Zero Trust Access:
  - Application: `m.glsoop.com`
  - Policy: 지정된 이메일/아이덴티티만 Allow
- Rules > Response Header Transform:
  - 대상: `http.host eq "m.glsoop.com"`
  - 헤더 추가: `X-Robots-Tag: noindex, nofollow, noarchive`

### 5-2. 앱 출시 이후 (`www -> m`)
- Rules > Redirect Rules 또는 Worker 중 1개 선택
- 조건:
  - `host == www.glsoop.com`
  - 모바일 UA
  - `cf.client.bot == false`
  - `no_mobile_redirect` 예외가 없을 것
- 동작:
  - `302` 리다이렉트
  - 목적지: `https://m.glsoop.com + 원본 path + 원본 query`

---

## 6) 전환 체크리스트
- [ ] `m` 비공개 정책 적용 완료(Access/403 확인)
- [ ] `m` 검색 비노출 헤더 적용 확인
- [ ] `www` 모바일 리다이렉트 규칙은 비활성 상태로 사전 생성
- [ ] 앱 출시 당일: `www` 모바일 리다이렉트 규칙 활성화
- [ ] 출시 직후 24시간: 리다이렉트 로그/이탈률/스토어 클릭률 모니터링
