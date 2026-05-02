import { expect, test, type Page } from "@playwright/test";

const AUTH_TOKEN_KEY = "glsoop_auth_token_v1";
const PUBLIC_UGC_NOTICE_STORAGE_KEY = "glsoop.public_ugc_notice_ack";

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

const COMMENT_ROWS = [
  {
    id: 501,
    post_id: 101,
    parent_comment_id: null,
    status: "active",
    content: "첫 댓글입니다.",
    author: { id: 31, nickname: "솔", display_name: "솔" },
    reply_count: 1,
    created_at: "2026-02-10T01:00:00.000Z",
    updated_at: "2026-02-10T01:00:00.000Z",
    deleted_at: null,
  },
  {
    id: 502,
    post_id: 101,
    parent_comment_id: 501,
    status: "active",
    content: "답글입니다.",
    author: { id: 32, nickname: "별", display_name: "별" },
    reply_count: 0,
    created_at: "2026-02-10T01:10:00.000Z",
    updated_at: "2026-02-10T01:10:00.000Z",
    deleted_at: null,
  },
];

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

type SetupApiRoutesOptions = {
  recentShouldFail?: boolean;
  shareEventStatus?: number;
  shareEventRequests?: Array<Record<string, unknown>>;
};

async function setupApiRoutes(page: Page, options?: SetupApiRoutesOptions) {
  const recentShouldFail = Boolean(options?.recentShouldFail);
  const shareEventStatus = options?.shareEventStatus ?? 201;
  const shareEventRequests = options?.shareEventRequests;

  await page.route("**/api/runtime-config", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        legal: { versions: {} },
        safety: {
          report_enabled: true,
          block_enabled: true,
          moderation_sla_hours: 24,
          report_reasons: [
            { code: "spam", label: "스팸", target_types: ["post"] },
            { code: "harassment", label: "괴롭힘", target_types: ["user"] },
          ],
        },
      }),
    });
  });

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

  await page.route("**/api/posts/101/comments**", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          comment: {
            id: 503,
            post_id: 101,
            parent_comment_id: body.parent_comment_id ?? null,
            status: "active",
            content: body.content,
            author: { id: 1, nickname: "tester", display_name: "tester" },
            reply_count: 0,
            created_at: "2026-02-10T02:00:00.000Z",
            updated_at: "2026-02-10T02:00:00.000Z",
            deleted_at: null,
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        comments: COMMENT_ROWS,
        pagination: {
          limit: 50,
          offset: 0,
          total: COMMENT_ROWS.length,
          has_more: false,
        },
      }),
    });
  });

  await page.route("**/api/share-events", async (route) => {
    let payload: Record<string, unknown> = {};
    try {
      payload = route.request().postDataJSON() as Record<string, unknown>;
    } catch {
      payload = {};
    }
    shareEventRequests?.push(payload);

    if (shareEventStatus >= 400) {
      await route.fulfill({
        status: shareEventStatus,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          code: "INTERNAL_ERROR",
          message: "공유 이벤트 저장 실패",
        }),
      });
      return;
    }

    await route.fulfill({
      status: shareEventStatus,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        event: { id: 301, created_at: "2026-02-10T00:00:00.000Z" },
      }),
    });
  });
}

async function openPostDetailFromHome(page: Page) {
  await page.goto("/");
  const publicUgcNoticeGate = page.getByTestId("public-ugc-notice-gate");
  const noticeVisible = await publicUgcNoticeGate.isVisible({ timeout: 1500 }).catch(() => false);
  if (noticeVisible) {
    await page.getByTestId("public-ugc-notice-check-legal").click();
    await page.getByTestId("public-ugc-notice-check-safety").click();
    await page.getByTestId("public-ugc-notice-continue").click();
    await expect(publicUgcNoticeGate).toBeHidden();
  }
  const homePost = page.getByRole("button", { name: "게시글 열기: 북마크 모달 테스트 글" });
  await expect(homePost).toBeVisible();
  await homePost.click();
  await expect(page).toHaveURL(/\/posts\/101/);
  await expect(page.getByTestId("post-share-btn")).toBeVisible();
}

async function chooseShareMode(page: Page, mode: "full" | "title" = "full") {
  await expect(page.getByText("공유 방식 선택")).toBeVisible();
  await page.getByText(mode === "full" ? "본문까지 공유" : "제목만 공유", {
    exact: true,
  }).click();
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

  test("모바일 뷰포트에서도 하단 액션 버튼이 보이고 동작한다", async ({ page }) => {
    let likeToggleCalls = 0;

    await page.setViewportSize({ width: 390, height: 844 });
    await setupApiRoutes(page);
    await page.route("**/api/posts/101/toggle-like", async (route) => {
      likeToggleCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, liked: true, like_count: 5 }),
      });
    });

    await setAuthToken(page, "mock-token-post-detail-mobile-actions");
    await openPostDetailFromHome(page);

    await expect(page.getByTestId("post-like-btn")).toBeVisible();
    await expect(page.getByTestId("post-bookmark-btn")).toBeVisible();
    await expect(page.getByTestId("post-share-btn")).toBeVisible();

    await page.getByTestId("post-like-btn").click();
    await expect.poll(() => likeToggleCalls).toBe(1);
    await expect(page).toHaveURL(/\/posts\/101/);

    await page.getByTestId("post-bookmark-btn").click();
    await expect(page.getByText("북마크 폴더 선택")).toBeVisible();
  });

  test("댓글 목록을 표시하고 새 댓글과 답글을 등록한다", async ({ page }) => {
    const commentRequests: Array<Record<string, unknown>> = [];

    await setupApiRoutes(page);
    await page.route("**/api/posts/101/comments**", async (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON() as Record<string, unknown>;
        commentRequests.push(body);
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            comment: {
              id: body.parent_comment_id ? 504 : 503,
              post_id: 101,
              parent_comment_id: body.parent_comment_id ?? null,
              status: "active",
              content: body.content,
              author: { id: 1, nickname: "tester", display_name: "tester" },
              reply_count: 0,
              created_at: "2026-02-10T02:00:00.000Z",
              updated_at: "2026-02-10T02:00:00.000Z",
              deleted_at: null,
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          comments: COMMENT_ROWS,
          pagination: { limit: 50, offset: 0, total: COMMENT_ROWS.length, has_more: false },
        }),
      });
    });
    await setAuthToken(page, "mock-token-post-detail-comments");
    await openPostDetailFromHome(page);

    await expect(page.getByTestId("post-comments-section")).toBeVisible();
    await expect(page.getByText("댓글 2")).toBeVisible();
    await expect(page.getByTestId("post-comment-input")).toBeHidden();
    await page.getByTestId("post-comments-toggle-btn").click();
    await expect(page.getByText("첫 댓글입니다.")).toBeVisible();
    await expect(page.getByText("답글입니다.")).toBeVisible();
    await expect(page.getByTestId("post-comment-input")).toBeVisible();
    await page.getByTestId("post-comment-input").fill("새 댓글입니다.");
    await page.getByTestId("post-comment-submit-btn").click();
    await expect.poll(() => commentRequests.length).toBe(1);
    await expect(commentRequests[0]).toMatchObject({ content: "새 댓글입니다." });
    await expect(page.getByText("새 댓글입니다.")).toBeVisible();
    await expect(page.getByTestId("post-comment-input")).toBeVisible();

    await page.getByTestId("post-comment-reply-btn-501").click();
    await expect(page.getByText("솔님에게 답글")).toBeVisible();
    await page.getByTestId("post-comment-input").fill("새 답글입니다.");
    await page.getByTestId("post-comment-submit-btn").click();
    await expect.poll(() => commentRequests.length).toBe(2);
    await expect(commentRequests[1]).toMatchObject({
      content: "새 답글입니다.",
      parent_comment_id: 501,
    });
    await expect(page.getByText("새 답글입니다.")).toBeVisible();
  });

  test("공유 성공 시 성공 토스트를 표시한다", async ({ page }) => {
    const shareEventRequests: Array<Record<string, unknown>> = [];
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, "share", {
        configurable: true,
        value: async () => ({ action: "sharedAction" }),
      });
    });
    await setupApiRoutes(page, { shareEventRequests });
    await setAuthToken(page, "mock-token-post-detail-share");
    await openPostDetailFromHome(page);

    await page.getByTestId("post-share-btn").click();
    await chooseShareMode(page, "full");
    await expect(page.getByText("공유가 완료되었어요.")).toBeVisible();
    await expect.poll(() => shareEventRequests.length).toBe(1);
    await expect.poll(() => shareEventRequests[0]?.result).toBe("shared");
    await expect.poll(() => shareEventRequests[0]?.surface).toBe("post_detail");
    await expect.poll(() => shareEventRequests[0]?.channel).toBe("share_modal_full");
    await expect.poll(() => typeof shareEventRequests[0]?.request_id).toBe("string");
  });

  test("공유 취소 시 dismissed 이벤트를 기록한다", async ({ page }) => {
    const shareEventRequests: Array<Record<string, unknown>> = [];
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, "share", {
        configurable: true,
        value: async () => ({ action: "dismissedAction" }),
      });
    });
    await setupApiRoutes(page, { shareEventRequests });
    await setAuthToken(page, "mock-token-post-detail-dismissed");
    await openPostDetailFromHome(page);

    await page.getByTestId("post-share-btn").click();
    await chooseShareMode(page, "full");
    await expect.poll(() => shareEventRequests.length).toBe(1);
    await expect.poll(() => shareEventRequests[0]?.result).toBe("dismissed");
    await expect(page.getByText("공유가 완료되었어요.")).toHaveCount(0);
    await expect(page.getByText("공유에 실패했어요. 잠시 후 다시 시도해주세요.")).toHaveCount(0);
  });

  test("공유 실패 시 에러 토스트를 표시하고 failed 이벤트를 기록한다", async ({ page }) => {
    const shareEventRequests: Array<Record<string, unknown>> = [];
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, "share", {
        configurable: true,
        value: async () => {
          throw new Error("share failed");
        },
      });
    });
    await setupApiRoutes(page, { shareEventRequests });
    await setAuthToken(page, "mock-token-post-detail-failed");
    await openPostDetailFromHome(page);

    await page.getByTestId("post-share-btn").click();
    await chooseShareMode(page, "full");
    await expect(page.getByText("공유에 실패했어요. 잠시 후 다시 시도해주세요.")).toBeVisible();
    await expect.poll(() => shareEventRequests.length).toBe(1);
    await expect.poll(() => shareEventRequests[0]?.result).toBe("failed");
  });

  test("내 글 삭제는 앱 내부 확인 시트에서 삭제 요청까지 연결된다", async ({ page }) => {
    let deleteCalls = 0;

    await setupApiRoutes(page);
    await setAuthToken(page, "mock-token-post-detail-delete");

    await page.route("**/api/posts/101/edit", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          post: {
            id: 101,
            title: DETAIL_POST.title,
            content: DETAIL_POST.content,
            category: DETAIL_POST.category,
            hashtags: [],
            layout_json: null,
          },
        }),
      });
    });

    await page.route("**/api/posts/101", async (route) => {
      if (route.request().method() !== "DELETE") {
        await route.fallback();
        return;
      }

      deleteCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, message: "글이 삭제되었습니다." }),
      });
    });

    await openPostDetailFromHome(page);

    await page.getByTestId("post-safety-menu-btn").click();
    await expect(page.getByText("글 관리 메뉴를 선택해 주세요.")).toBeVisible();
    await page.getByTestId("post-manage-delete-btn").click();
    await expect(page.getByTestId("post-delete-confirm-btn")).toBeVisible();
    await page.getByTestId("post-delete-confirm-btn").click();

    await expect.poll(() => deleteCalls).toBe(1);
    await expect(page).toHaveURL(/\/$/);
  });

  test("서버 이미지 실패 시 layout_json 행간/자간으로 fallback 카드와 KST 날짜를 유지한다", async ({ page }) => {
    await setupApiRoutes(page);

    await page.route("**/api/posts/101", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          post: {
            ...DETAIL_POST,
            category: "short",
            hashtags: [],
            layout_json: {
              layout_version: 1,
              unit: "normalized",
              title_box: {
                x: 0.336,
                y: 0.256,
                w: 0.424,
                h: 0.122,
                align: "center",
                font_scale: 1,
                line_height: 1.3,
                letter_spacing: 0.04,
                hidden: false,
              },
              text_box: {
                x: 0.336,
                y: 0.364,
                w: 0.424,
                h: 0.346,
                align: "center",
                font_scale: 1,
                line_height: 1.45,
                letter_spacing: -0.02,
                hidden: false,
              },
              footer_box: {
                x: 0.78,
                y: 0.9,
                w: 0.16,
                h: 0.06,
                align: "right",
                font_scale: 1,
                line_height: 1.1,
                hidden: false,
              },
            },
          },
        }),
      });
    });

    await page.route("**/api/feed-images/post/101**", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, message: "render failed" }),
      });
    });

    await setAuthToken(page, "mock-token-post-detail-fallback");
    await openPostDetailFromHome(page);

    await expect(page.getByText("SERVER RENDER")).toHaveCount(0);
    await expect(page.getByText("이미지 렌더를 불러오지 못해 텍스트 카드로 보여줘요.")).toHaveCount(0);
    await expect(page.getByText("북마크 모달 테스트 글").last()).toBeVisible();
    await expect(page.getByText("2026년 2월 10일").first()).toBeVisible();

    const titleLetterSpacing = await page
      .getByText("북마크 모달 테스트 글")
      .last()
      .evaluate((node) => Number.parseFloat(window.getComputedStyle(node).letterSpacing || "0"));
    expect(titleLetterSpacing).toBeGreaterThan(1);

    const bodyLetterSpacing = await page
      .getByText("북마크 recent fallback과 공유 토스트를 검증하기 위한 본문입니다.")
      .last()
      .evaluate((node) => Number.parseFloat(window.getComputedStyle(node).letterSpacing || "0"));
    expect(bodyLetterSpacing).toBeLessThan(0);
  });
});
