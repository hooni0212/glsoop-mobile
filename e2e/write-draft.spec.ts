import { expect, test, type Page } from "@playwright/test";

const AUTH_TOKEN_KEY = "glsoop:auth:token:v1";
const DRAFTS_KEY = "glsoop:write:drafts:v1";

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

async function resetDrafts(
  page: Page,
  drafts: Array<{ id: string; title: string; body: string; updatedAt: number }> = []
) {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    { key: DRAFTS_KEY, value: drafts }
  );
}

test.describe("글쓰기 임시저장 (웹)", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, id: 1, nickname: "tester", name: "tester" }),
      });
    });
    await page.route("**/api/posts**", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, post_id: "post-e2e-write" }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, posts: [], hasMore: false }),
      });
    });

    await setAuthToken(page, "mock-token-for-write-draft");
  });

  test("S1) draft 없음 → 작성 → 자동저장 → 나가기 confirm → 저장하고 닫기 → 복구", async ({ page }) => {
    const titleText = "자동저장 제목";
    const bodyText = "자동저장 본문 내용";

    await resetDrafts(page);
    await page.goto("/write");

    await page.getByTestId("write-title-input").fill(titleText);
    await page.getByTestId("write-body-input").fill(bodyText);

    await page.getByTestId("write-close-btn").click();
    const confirmModal = page.getByTestId("write-confirm-modal");
    await expect(confirmModal).toBeVisible();
    await expect(confirmModal).toHaveCount(1);
    await page.getByTestId("confirm-close-save").click();
    await expect(page).toHaveURL(/\/(\(tabs\))?\/?$/);

    await page.goto("/write");
    await expect(page.getByTestId("write-confirm-modal")).toBeVisible();
    await page.getByTestId("confirm-draft-list").click();

    await expect(page).toHaveURL(/\/write-drafts$/);
    await expect(page.getByText(titleText)).toBeVisible();
    await page.getByRole("button", { name: "임시저장 열기" }).first().click();

    await expect(page.getByTestId("write-title-input").last()).toHaveValue(titleText);
    await expect(page.getByTestId("write-body-input").last()).toHaveValue(bodyText);
  });

  test("S2) draft 있음 → 복구/나중에/버리기 동작 검증", async ({ page }) => {
    const seed = [
      {
        id: "seed-1",
        title: "초안 제목",
        body: "초안 본문",
        updatedAt: Date.now(),
      },
    ];
    await resetDrafts(page, seed);

    await page.goto("/write");
    const modal = page.getByTestId("write-confirm-modal");
    await expect(modal).toBeVisible();
    await expect(page.getByTestId("confirm-draft-new")).toBeVisible();
    await expect(page.getByTestId("confirm-draft-list")).toBeVisible();

    await page.getByTestId("confirm-draft-new").click();
    await expect(page.getByTestId("write-confirm-modal")).toHaveCount(0);
    await expect(page.getByTestId("write-title-input")).toHaveValue("");
    await expect(page.getByTestId("write-body-input")).toHaveValue("");
    await expect(page.getByTestId("write-close-btn")).toBeVisible();

    await page.getByTestId("write-close-btn").click();
    await expect(page).toHaveURL(/\/(\(tabs\))?\/?$/);

    await page.goto("/write");
    await expect(page.getByTestId("write-confirm-modal")).toBeVisible();
    await page.getByTestId("confirm-draft-list").click();
    await expect(page).toHaveURL(/\/write-drafts$/);
    await expect(page.getByTestId("draft-item-seed-1")).toBeVisible();
  });

  test("S3) 임시저장 목록 → draft 열기/삭제", async ({ page }) => {
    const now = Date.now();
    const drafts = [
      { id: "draft-a", title: "첫번째 초안", body: "첫번째 본문", updatedAt: now },
      { id: "draft-b", title: "두번째 초안", body: "두번째 본문", updatedAt: now - 1000 },
    ];
    await resetDrafts(page, drafts);

    await page.goto("/write-drafts");
    await expect(page.getByTestId("draft-item-draft-a")).toBeVisible();
    await expect(page.getByTestId("draft-item-draft-b")).toBeVisible();

    await page.getByTestId("draft-open-draft-a").click();
    await expect(page.getByTestId("write-title-input")).toHaveValue("첫번째 초안");
    await expect(page.getByTestId("write-body-input")).toHaveValue("첫번째 본문");

    await page.getByTestId("write-close-btn").click();
    await page.getByTestId("confirm-close-discard").click();

    await page.goto("/write-drafts");
    await page.getByTestId("draft-delete-draft-b").click();
    await expect(page.getByTestId("draft-item-draft-b")).toHaveCount(0);
  });
});
