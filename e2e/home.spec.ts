import { expect, test, type Page } from "@playwright/test";

const AUTH_TOKEN_KEY = "glsoop_auth_token_v1";
const HOME_INTERACTION_POST = {
  id: 201,
  title: "홈 액션 테스트 글",
  content: "홈 카드에서 공감과 북마크를 눌렀을 때 상세 이동 없이 처리되어야 합니다.",
  author_id: 9,
  author_name: "루나",
  category: "essay",
  created_at: "2026-04-10T00:00:00.000Z",
  like_count: 3,
  bookmark_count: 0,
  user_liked: 0,
  user_bookmarked: 0,
};

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

test.describe("홈 화면", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, id: 1, nickname: "tester", name: "tester" }),
      });
    });
    await page.route("**/api/posts?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, posts: [], hasMore: false }),
      });
    });

    await setAuthToken(page, "mock-token-for-home");
  });

  test("기본 요소가 렌더링된다", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("글숲")).toBeVisible();
    await expect(page.getByRole("button", { name: "검색" })).toBeVisible();
    await expect(page.getByRole("button", { name: "추천" })).toBeVisible();
    await expect(page.getByText("오늘의 추천")).toBeVisible();
  });

  test("검색 버튼을 누르면 검색 화면으로 이동한다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "검색" }).click();
    await expect(page.getByTestId("search-screen")).toBeVisible();
    await expect(page.getByTestId("search-input")).toBeVisible();
  });

  test("피드 카드의 공감과 북마크 버튼이 상세 이동 없이 동작한다", async ({ page }) => {
    let likeToggleCalls = 0;
    let bookmarkAddCalls = 0;

    await page.setViewportSize({ width: 390, height: 844 });

    await page.route("**/api/posts?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, posts: [HOME_INTERACTION_POST], hasMore: false }),
      });
    });

    await page.route("**/api/posts/201/toggle-like", async (route) => {
      likeToggleCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, liked: true, like_count: 4 }),
      });
    });

    await page.route("**/api/bookmarks/lists", async (route) => {
      if (route.request().method() !== "GET") {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          lists: [{ id: 1, name: "기본", item_count: 0, contains: 0 }],
        }),
      });
    });

    await page.route("**/api/bookmarks/lists/1/items", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }

      bookmarkAddCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, message: "saved" }),
      });
    });

    await page.goto("/");

    await expect(page.getByText("홈 액션 테스트 글")).toBeVisible();

    await page.getByTestId("feed-like-btn-201").click();
    await expect.poll(() => likeToggleCalls).toBe(1);
    await expect(page).toHaveURL(/\/$/);

    await page.getByTestId("feed-bookmark-btn-201").click();
    await expect.poll(() => bookmarkAddCalls).toBe(1);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("'기본' 폴더에 저장했어요.")).toBeVisible();
  });
});
