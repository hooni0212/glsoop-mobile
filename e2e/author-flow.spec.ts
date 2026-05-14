import { expect, test, type Page, type Route } from "@playwright/test";

const AUTH_TOKEN_KEY = "glsoop_auth_token_v1";
const PUBLIC_UGC_NOTICE_STORAGE_KEY = "glsoop.public_ugc_notice_ack";
const COOKIE_SESSION_TOKEN = "__glsoop_cookie_session__";
const AUTHOR_ID = "42";

type AuthorRequestLog = {
  sort: string;
  offset: number;
  limit: number;
};

async function setAuthToken(page: Page, token: string) {
  const storagePayload = {
    key: AUTH_TOKEN_KEY,
    value: token,
    noticeKey: PUBLIC_UGC_NOTICE_STORAGE_KEY,
  };

  await page.addInitScript(
    ({ key, value, noticeKey }) => {
      localStorage.setItem(key, value);
      localStorage.setItem(
        noticeKey,
        JSON.stringify({
          versionKey: "public-ugc-notice.v1",
          acknowledgedAt: "2026-04-20T00:00:00.000Z",
        })
      );
    },
    storagePayload
  );
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(
    ({ key, value, noticeKey }) => {
      localStorage.setItem(key, value);
      localStorage.setItem(
        noticeKey,
        JSON.stringify({
          versionKey: "public-ugc-notice.v1",
          acknowledgedAt: "2026-04-20T00:00:00.000Z",
        })
      );
    },
    storagePayload
  );
}

function makePost(id: number, title: string, likeCount: number, createdAt: string) {
  return {
    id,
    title,
    content: `${title} 본문`,
    category: "short",
    created_at: createdAt,
    author_id: AUTHOR_ID,
    author_name: "테스트 작가",
    like_count: likeCount,
    hashtags: "테스트",
    user_liked: 0,
  };
}

const NEWEST_POSTS = Array.from({ length: 12 }, (_, index) => {
  const id = 1200 - index;
  return makePost(id, `최신 글 ${index + 1}`, 20 - index, `2026-03-${String(30 - index).padStart(2, "0")}T10:00:00.000Z`);
});

const OLDEST_POSTS = [...NEWEST_POSTS].reverse();
const LIKES_POSTS = [...NEWEST_POSTS].sort((a, b) => b.like_count - a.like_count || Number(b.id) - Number(a.id));
const AUTHOR_PROFILE_COSMETICS = {
  primaryBadge: {
    key: "badge_spring_2026",
    type: "badge",
    name: "2026 봄 배지",
    iconEmoji: "🌸",
    rarity: "rare",
    season: "spring_2026",
    meta: null,
  },
  profileBackground: {
    key: "background_writer_grove",
    type: "background",
    name: "작가의 작은 숲",
    iconEmoji: "🌳",
    rarity: "rare",
    season: "spring_2026",
    meta: null,
  },
  showcaseBadges: [
    {
      key: "badge_loved_post",
      type: "badge",
      name: "사랑받은 글 배지",
      iconEmoji: "💙",
      rarity: "rare",
      season: null,
      meta: null,
    },
  ],
  headerStickers: [
    {
      slot: "tr",
      sticker: {
        key: "sticker_leaf",
        type: "sticker",
        name: "리프 스티커",
        iconEmoji: "🍃",
        rarity: "common",
        season: null,
        meta: null,
      },
    },
  ],
};

function getPostsForSort(sort: string) {
  if (sort === "oldest") return OLDEST_POSTS;
  if (sort === "likes") return LIKES_POSTS;
  return NEWEST_POSTS;
}

function isApiRequest(route: Route, suffix: string) {
  return route.request().url().includes(suffix);
}

async function mockAuthorApis(page: Page, logs: AuthorRequestLog[]) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());

    if (isApiRequest(route, "/api/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, id: 7, nickname: "tester", name: "tester" }),
      });
      return;
    }

    if (isApiRequest(route, `/api/users/${AUTHOR_ID}/profile`)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          user: {
            id: Number(AUTHOR_ID),
            name: "테스트 작가",
            nickname: "테스트 작가",
            bio: "짧은 소개",
            about: "길게 쓰인 소개글입니다. 테스트용 작가 프로필입니다.",
            level: 7,
            post_count: 12,
            total_likes: 120,
            follower_count: 3,
            following_count: 1,
            profileCosmetics: AUTHOR_PROFILE_COSMETICS,
          },
          stats: {
            postCount: 12,
            totalLikes: 120,
          },
          viewer: {
            id: 7,
            is_logged_in: true,
            is_own_profile: false,
            is_following: false,
          },
        }),
      });
      return;
    }

    if (isApiRequest(route, `/api/users/${AUTHOR_ID}/posts`)) {
      const sort = url.searchParams.get("sort") || "newest";
      const offset = Number(url.searchParams.get("offset") || "0");
      const limit = Number(url.searchParams.get("limit") || "10");
      logs.push({ sort, offset, limit });

      const source = getPostsForSort(sort);
      const posts = source.slice(offset, offset + limit);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          posts,
          has_more: offset + limit < source.length,
        }),
      });
      return;
    }

    if (isApiRequest(route, "/api/posts/")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}

test.describe("작가 화면 흐름", () => {
  test("정렬 전환, 더보기, 재진입 시 refetch가 동작한다", async ({ page }) => {
    const logs: AuthorRequestLog[] = [];
    await mockAuthorApis(page, logs);
    await setAuthToken(page, COOKIE_SESSION_TOKEN);

    await page.goto(`/users/${AUTHOR_ID}`);
    await expect(page.getByTestId("author-screen")).toBeVisible();
    await expect(page.getByTestId("author-post-card-1200")).toBeVisible();
    await expect(page.getByText(/작가의 작은 숲/)).toBeVisible();
    await expect(page.getByLabel("대표 뱃지 2026 봄 배지")).toBeVisible();
    await expect(page.getByText("사랑받은 글 배지")).toBeVisible();

    await expect.poll(() => logs.filter((entry) => entry.sort === "newest" && entry.offset === 0).length).toBeGreaterThan(0);

    await page.getByTestId("author-sort-oldest").click();
    await expect(page.getByTestId("author-post-card-1189")).toBeVisible();
    await expect.poll(() => logs.filter((entry) => entry.sort === "oldest" && entry.offset === 0).length).toBeGreaterThan(0);

    await page.getByTestId("author-sort-likes").click();
    await expect(page.getByTestId("author-post-card-1200")).toBeVisible();
    await expect.poll(() => logs.filter((entry) => entry.sort === "likes" && entry.offset === 0).length).toBeGreaterThan(0);

    await page.getByTestId("author-sort-newest").click();
    await expect(page.getByTestId("author-post-card-1200")).toBeVisible();

    for (let attempt = 0; attempt < 6; attempt += 1) {
      await page.mouse.wheel(0, 2200);
      const hasLoadMore = logs.some((entry) => entry.sort === "newest" && entry.offset >= 10);
      if (hasLoadMore) break;
      await page.waitForTimeout(200);
    }

    await expect.poll(() => logs.some((entry) => entry.sort === "newest" && entry.offset >= 10)).toBeTruthy();
    await expect(page.getByTestId("author-post-card-1190")).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("button", { name: "검색" })).toBeVisible();
    await page.goto(`/users/${AUTHOR_ID}`);
    await expect(page.getByTestId("author-screen")).toBeVisible();
    await expect.poll(() => logs.filter((entry) => entry.sort === "newest" && entry.offset === 0).length).toBeGreaterThan(1);
  });
});
