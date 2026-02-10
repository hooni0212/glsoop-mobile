# glsoop-mobile

글숲(`glsoop`) 서버와 연동되는 Expo Router 기반 모바일/웹 클라이언트입니다.

## 서비스/기능 요약

- 인증: 로그인/회원가입/세션 기반 사용자 진입
- 피드: 홈 피드 조회, 좋아요/북마크 상호작용
- 글 상세: 공유(시스템 ShareSheet), 북마크 폴더 선택, 작성자 이동
- 글쓰기: 카테고리/제목/본문 작성, 임시저장/불러오기
- 검색: 글/작가 분리 탭, 최근 검색어 저장
- 북마크: 폴더 CRUD, 글별 북마크 상태, 최근 사용 폴더 우선 노출
- 성장: 대시보드 요약, Top Posts, 퀘스트/업적 화면

## 화면/라우트 맵

| Route | Screen | 설명 |
| --- | --- | --- |
| `app/(tabs)/index.tsx` | `Home.tsx` | 메인 피드/탭 진입 |
| `app/posts/[id].tsx` | `PostDetail.tsx` | 글 상세, 공유/좋아요/북마크 |
| `app/write.tsx` | `Write.tsx` | 글 작성/발행 |
| `app/write-drafts.tsx` | `WriteDrafts.tsx` | 임시저장 목록 |
| `app/search.tsx` | `Search.tsx` | 서버 검색(글/작가 분리) |
| `app/(tabs)/bookmarks.tsx` | `Bookmarks.tsx` | 북마크 목록/폴더 관리 |
| `app/(tabs)/growth.tsx` | `Growth.tsx` | 성장 요약/Top Posts |
| `app/growth/quests.tsx` | `Quests.tsx` | 퀘스트 상세 |
| `app/growth/achievements.tsx` | `Achievements.tsx` | 업적 상세 |
| `app/users/[id].tsx` | `Author.tsx` | 작가 프로필/작가 글 |

## 서비스 레이어 정리

### `src/services/*`

- `postService.ts`: 글 생성 API
- `likeService.ts`: 좋아요 토글 API
- `bookmarkService.ts`: 북마크 폴더/아이템 CRUD 및 최근 폴더 조회
- `shareService.ts`: 공유 이벤트 로깅(`POST /api/share-events`)
- `draftStorage.ts`: 글쓰기 임시저장(AsyncStorage)
- `searchHistory.ts`: 최근 검색어 저장/삭제

### `src/features/*`

- `feed/useFeed.ts`: 피드 조회 상태 관리
- `posts/usePost.ts`: 글 상세 조회 상태 관리
- `search/useSearch.ts`: 검색 결과/페이지네이션 관리
- `growth/useGrowthData.ts`: 성장 대시보드 데이터 조합
- `users/useAuthorProfile.ts`, `users/useAuthorPosts.ts`: 작가 정보/글 목록
- `likes/likeStore.ts`, `bookmarks/bookmarkStore.ts`: 로컬 상호작용 상태

## API 연동/환경 변수

- `EXPO_PUBLIC_API_BASE_URL`
  - 운영(`m.glsoop.com`)에서는 비워두거나 `/` 권장 (same-origin + `/api` 프록시)
  - 로컬 개발에서는 `http://localhost:3000`처럼 도메인 지정
- `EXPO_PUBLIC_API_DEBUG=true`
  - 개발 환경 API 요청/응답 로그 활성화
- `EXPO_PUBLIC_GROWTH_TELEMETRY=true`
  - Growth 텔레메트리 로그 활성화(개발/운영 선택)

참고: API helper(`src/lib/api.ts`)가 `/api` prefix 중복을 자동 정리합니다.

## 시작하기

```bash
npm install
npm run start
```

플랫폼별 실행:

```bash
npm run ios
npm run android
npm run web
```

## 테스트/검증

```bash
npm run lint
npm run e2e:web
```

개별 E2E 예시:

```bash
npx playwright test e2e/post-detail.spec.ts
npx playwright test e2e/search.spec.ts
```

## 노션 동기화

```bash
npm run sync:notion:dry
npm run sync:notion
```
