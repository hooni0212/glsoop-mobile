import { expect, test, type Page } from "@playwright/test";

const AUTH_TOKEN_KEY = "glsoop_auth_token_v1";
const PUBLIC_UGC_NOTICE_STORAGE_KEY = "glsoop.public_ugc_notice_ack";
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

test.describe("오늘과 읽기 흐름", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/runtime-config", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, legal: { versions: {} } }),
      });
    });
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
    await page.route("**/api/users/1/posts?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          posts: [
            {
              id: 301,
              title: "여름 저녁의 기록",
              content: "창가에 오래 남아 있던 빛을 적었다.",
              category: "short",
              user_id: 1,
              nickname: "tester",
              created_at: "2026-08-02T00:00:00.000Z",
            },
          ],
          has_more: false,
        }),
      });
    });
    await page.route("**/api/writing-events/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          event: {
            active: true,
            key: "daily-writing",
            title: "글숲 한달 글쓰기 프로젝트",
            total_days: 30,
            current_day: 3,
            completed_days: 2,
            local_date_key: "2026-08-02",
            prompt_label: "오늘의 글감",
          },
          today_prompt: {
            key: "day-03",
            day: 3,
            title: "오늘을 붙잡는 문장",
            body: "오래 남기고 싶은 장면을 적어봐요.",
            default_category: "short",
            suggested_hashtags: ["오늘문장"],
          },
          prompts: [],
          progress_steps: [],
        }),
      });
    });
    await page.route("**/api/notifications?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, notifications: [], unread_count: 0, has_more: false }),
      });
    });

    await setAuthToken(page, "mock-token-for-home");
  });

  test("오늘의 글감과 핵심 탭이 렌더링된다", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("today-writing-prompt")).toBeVisible();
    await expect(page.getByText("오늘을 붙잡는 문장")).toBeVisible();
    await expect(page.getByRole("tab", { name: "오늘" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "읽기" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "문집" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "나" })).toBeVisible();
    await expect(page.getByTestId("fab-write")).toBeVisible();
  });

  test("오늘의 글감에서 5분 쓰기를 시작한다", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("today-start-writing").click();
    await expect(page).toHaveURL(/\/write/);
  });

  test("키보드로 핵심 행동을 탐색하면 포커스가 또렷하게 보인다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("today-writing-prompt")).toBeVisible();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "알림 열기" })).toBeFocused();

    await page.keyboard.press("Tab");
    const writeButton = page.getByTestId("today-start-writing");
    await expect(writeButton).toBeFocused();
    await expect
      .poll(() => writeButton.evaluate((element) => getComputedStyle(element).outlineWidth))
      .toBe("2px");
  });

  test("제목 없이 본문부터 쓰고 미리보기로 이동할 수 있다", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("fab-write").click();
    await page.getByTestId("write-body-input").fill("오늘 마음에 남은 한 문장입니다.");
    await page.getByTestId("write-submit-btn").click();

    await expect(page.getByText("제목 미리보기")).toBeVisible();
    await expect(page.getByRole("button", { name: "글 제출" })).toBeEnabled();
  });

  test("문집에서 내가 쓴 글과 이어 쓰기 입구를 확인한다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "문집" }).click();

    await expect(page.getByText("나의 글이 머무는 곳")).toBeVisible();
    await expect(page.getByText("최근에 쓴 글")).toBeVisible();
    await expect(page.getByText("여름 저녁의 기록")).toBeVisible();
    await expect(page.getByText("임시저장")).toBeVisible();
    await expect(page.getByText("모아둔 문장")).toBeVisible();
  });

  test("읽기에서 검색 버튼을 누르면 검색 화면으로 이동한다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "읽기" }).click();
    await page.getByRole("button", { name: "검색" }).click();
    await expect(page.getByTestId("search-screen")).toBeVisible();
    await expect(page.getByTestId("search-input")).toBeVisible();
  });

  test("읽기의 알림 버튼은 알림함으로 이동한다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "읽기" }).click();
    await page.getByTestId("home-notifications-btn").click();
    await expect(page.getByTestId("notifications-screen")).toBeVisible();
  });

  test("읽지 않은 알림이 있으면 읽기 알림 버튼에 점 배지를 표시한다", async ({ page }) => {
    await page.unroute("**/api/notifications?**");
    await page.route("**/api/notifications?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          notifications: [
            {
              id: "n-1",
              type: "post_comment",
              title: "새 댓글",
              body: "루나님이 댓글을 남겼어요.",
              created_at: "2026-04-23T00:00:00.000Z",
              read_at: null,
              target_path: "/posts/201",
              post_id: 201,
              comment_id: 1,
              user_id: 9,
              actor_count: 1,
            },
          ],
          unread_count: 1,
          has_more: false,
        }),
      });
    });

    await page.goto("/");
    await page.getByRole("tab", { name: "읽기" }).click();
    await expect(page.getByTestId("home-notifications-unread-dot")).toBeVisible();
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
    await page.getByRole("tab", { name: "읽기" }).click();

    await expect(
      page.getByRole("button", { name: "게시글 열기: 홈 액션 테스트 글" })
    ).toBeVisible();

    await page.getByTestId("feed-like-btn-201").click();
    await expect.poll(() => likeToggleCalls).toBe(1);
    await expect(page).toHaveURL(/\/explore$/);

    await page.getByTestId("feed-bookmark-btn-201").click();
    await expect.poll(() => bookmarkAddCalls).toBe(1);
    await expect(page).toHaveURL(/\/explore$/);
    await expect(page.getByText("'기본' 폴더에 저장했어요.")).toBeVisible();
  });
});
