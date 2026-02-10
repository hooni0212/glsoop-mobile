import { expect, test, type Page } from "@playwright/test";

const AUTH_TOKEN_KEY = "glsoop:auth:token:v1";

const HOME_POSTS = [
  {
    id: 101,
    title: "북마크 모달 테스트 글",
    content: "상세 화면 이동과 모달 동작을 검증합니다.",
    author_id: 11,
    author_name: "루나",
    category: "essay",
    created_at: "2026-02-10T00:00:00.000Z",
    like_count: 4,
    bookmark_count: 1,
    user_liked: 0,
    user_bookmarked: 0,
  },
];

const DETAIL_POST = {
  id: 101,
  title: "북마크 모달 테스트 글",
  content: "북마크 recent fallback과 공유 토스트를 검증하기 위한 본문입니다.",
  author_id: 11,
  author_name: "루나",
  category: "essay",
  created_at: "2026-02-10T00:00:00.000Z",
  like_count: 4,
  bookmark_count: 1,
  user_liked: 0,
  user_bookmarked: 0,
};

const BOOKMARK_LISTS = [
  {
    id: 1,
    name: "기본",
    description: null,
    item_count: 3,
    contains: 0,
  },
  {
    id: 2,
    name: "읽는중",
    description: null,
    item_count: 1,
    contains: 1,
  },
];

async function setAuthToken(page: Page, token: string) {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: AUTH_TOKEN_KEY, value: token }
  );
}

async function setupApiRoutes(page: Page, options?: { recentShouldFail?: boolean }) {
  const recentShouldFail = Boolean(options?.recentShouldFail);

  await page.route("**/api/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, id: 1, name: "tester", nickname: "tester" }),
    });
  });

  await page.route("**/api/posts?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        posts: HOME_POSTS,
        hasMore: false,
      }),
    });
  });

  await page.route("**/api/posts/101", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        post: DETAIL_POST,
      }),
    });
  });

  await page.route("**/api/bookmarks/lists/recent**", async (route) => {
    if (recentShouldFail) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          code: "INTERNAL_ERROR",
          message: "최근 폴더 조회 실패",
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        lists: [BOOKMARK_LISTS[1], BOOKMARK_LISTS[0]],
      }),
    });
  });

  await page.route("**/api/posts/101/bookmarks", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        lists: BOOKMARK_LISTS,
      }),
    });
  });
}

async function openPostDetailFromHome(page: Page) {
  await page.goto("/");
  const homeTitle = page.getByText("북마크 모달 테스트 글").first();
  await expect(homeTitle).toBeVisible();
  await homeTitle.click();
  await expect(page).toHaveURL(/\/posts\/101/);
  await expect(page.getByTestId("post-share-btn")).toBeVisible();
}

test.describe("글 상세 화면", () => {
  test("recent API 실패 시 전체 목록 fallback과 안내 토스트를 표시한다", async ({ page }) => {
    await setupApiRoutes(page, { recentShouldFail: true });
    await setAuthToken(page, "mock-token-post-detail");
    await openPostDetailFromHome(page);

    await page.getByTestId("post-bookmark-btn").click();
    await expect(page.getByText("북마크 폴더 선택")).toBeVisible();
    await expect(
      page.getByText("최근 사용 폴더 정렬을 불러오지 못해 기본 목록으로 표시했어요.")
    ).toBeVisible();
    await expect(page.getByText("기본", { exact: true })).toBeVisible();
    await expect(page.getByText("읽는중", { exact: true })).toBeVisible();
  });

  test("공유 성공 시 성공 토스트를 표시한다", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, "share", {
        configurable: true,
        value: async () => ({ action: "sharedAction" }),
      });
    });
    await setupApiRoutes(page);
    await setAuthToken(page, "mock-token-post-detail-share");
    await openPostDetailFromHome(page);

    await page.getByTestId("post-share-btn").click();
    await expect(page.getByText("공유가 완료되었어요.")).toBeVisible();
  });
});
