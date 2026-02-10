import { expect, test, type Page } from "@playwright/test";

const AUTH_TOKEN_KEY = "glsoop:auth:token:v1";

const SEARCH_FIXTURE_POSTS = [
  {
    id: 101,
    title: "새벽 산책",
    excerpt: "도시가 잠든 시간, 달빛 아래를 걸었습니다.",
    author_id: 11,
    author_name: "루나",
    category: "essay",
    created_at: "2026-02-10T00:00:00.000Z",
    like_count: 4,
    bookmark_count: 1,
  },
  {
    id: 102,
    title: "밤의 메모",
    excerpt: "짧은 구절을 적으며 오늘의 감정을 정리합니다.",
    author_id: 12,
    author_name: "하람",
    category: "short",
    created_at: "2026-02-09T00:00:00.000Z",
    like_count: 8,
    bookmark_count: 2,
  },
  {
    id: 103,
    title: "Poem for Dawn",
    excerpt: "A quiet line for the early morning breeze.",
    author_id: 13,
    author_name: "Mira",
    category: "poem",
    created_at: "2026-02-08T00:00:00.000Z",
    like_count: 1,
    bookmark_count: 0,
  },
];

const SEARCH_FIXTURE_AUTHORS = [
  {
    id: 11,
    name: "루나",
    nickname: "luna",
    post_count: 12,
    follower_count: 320,
    latest_post_at: "2026-02-10T00:00:00.000Z",
  },
  {
    id: 12,
    name: "하람",
    nickname: "haram",
    post_count: 9,
    follower_count: 180,
    latest_post_at: "2026-02-09T00:00:00.000Z",
  },
  {
    id: 13,
    name: "Mira",
    nickname: "mira",
    post_count: 8,
    follower_count: 210,
    latest_post_at: "2026-02-08T00:00:00.000Z",
  },
];

function includesKeyword(value: string, query: string) {
  return value.toLowerCase().includes(query);
}

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

test.describe("검색 화면", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, id: 1, name: "tester", nickname: "tester" }),
      });
    });

    await page.route("**/api/search**", async (route) => {
      const url = new URL(route.request().url());
      const query = (url.searchParams.get("q") || "").trim().toLowerCase();
      const type = (url.searchParams.get("type") || "all").trim();
      const limit = Math.max(1, Number(url.searchParams.get("limit") || "20"));
      const offset = Math.max(0, Number(url.searchParams.get("offset") || "0"));

      const filteredPosts = SEARCH_FIXTURE_POSTS.filter((post) => {
        if (!query) return true;
        return (
          includesKeyword(post.title, query) ||
          includesKeyword(post.excerpt, query) ||
          includesKeyword(post.author_name, query)
        );
      });

      const filteredAuthors = SEARCH_FIXTURE_AUTHORS.filter((author) => {
        if (!query) return true;
        return (
          includesKeyword(author.name, query) ||
          includesKeyword(author.nickname, query)
        );
      });

      const pagedPosts = filteredPosts.slice(offset, offset + limit);
      const pagedAuthors = filteredAuthors.slice(offset, offset + limit);

      const responsePosts = type === "authors" ? [] : pagedPosts;
      const responseAuthors = type === "posts" ? [] : pagedAuthors;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          query,
          type,
          posts: responsePosts,
          authors: responseAuthors,
          meta: {
            posts_count: filteredPosts.length,
            authors_count: filteredAuthors.length,
            limit,
            offset,
          },
        }),
      });
    });

    await setAuthToken(page, "mock-token-for-search");
  });

  test("제목/본문/작가 키워드로 결과를 필터링한다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "검색" }).click();

    await expect(page.getByTestId("search-screen")).toBeVisible();
    await expect(page.getByTestId("search-input")).toBeVisible();
    await expect(page.getByText("검색어를 입력해보세요")).toBeVisible();

    await page.getByTestId("search-input").fill("새벽");
    await expect(page.getByText(/검색 결과 1개/)).toBeVisible();
    await expect(page.getByTestId("search-post-card-101")).toBeVisible();
    await expect(page.locator('[data-testid^="search-post-card-"]')).toHaveCount(1);

    await page.getByTestId("search-tab-authors").click();
    await expect(page.getByText(/검색 결과 0개/)).toBeVisible();
    await expect(page.getByText("검색 결과가 없어요")).toBeVisible();

    await page.getByTestId("search-input").fill("mira");
    await expect(page.getByText(/검색 결과 1개/)).toBeVisible();
    await expect(page.getByTestId("search-author-card-13")).toBeVisible();

    await page.getByTestId("search-tab-posts").click();
    await expect(page.getByText(/검색 결과 1개/)).toBeVisible();
    await expect(page.getByTestId("search-post-card-103")).toBeVisible();
  });

  test("결과가 없을 때 empty 상태를 보여주고 입력 초기화가 동작한다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "검색" }).click();

    await page.getByTestId("search-input").fill("없는검색어");
    await expect(page.getByText("검색 결과가 없어요")).toBeVisible();
    await expect(page.getByText("다른 키워드로 다시 찾아보세요.")).toBeVisible();

    await page.getByTestId("search-clear-btn").click();
    await expect(page.getByText("검색어를 입력해보세요")).toBeVisible();
    await expect(page.getByText("글과 작가를 분리해서 찾아볼 수 있어요.")).toBeVisible();
  });
});
