import { expect, test, type Page } from "@playwright/test";

const AUTH_TOKEN = "mock-token-for-write-ux";
const AUTH_TOKEN_KEY = "glsoop_auth_token_v1";
const DRAFTS_KEY = "glsoop:write:drafts:v1";
type CapturedPostPayload = Record<string, unknown> & {
  layout_json?: Record<string, any>;
};

function toAuthNamespace(token: string) {
  return `bearer:${token.slice(0, 16)}`;
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

async function clearDrafts(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate((key) => localStorage.removeItem(key), DRAFTS_KEY);
}

async function seedDraft(
  page: Page,
  draft: { id: string; title: string; body: string; updatedAt?: number }
) {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  const authNamespace = toAuthNamespace(AUTH_TOKEN);
  await page.evaluate(
    ({ key, draftData, nextAuthNamespace }) => {
      const now = Date.now();
      const payload = [
        {
          ...draftData,
          authNamespace: nextAuthNamespace,
          updatedAt: draftData.updatedAt ?? now,
        },
      ];
      localStorage.setItem(key, JSON.stringify(payload));
    },
    { key: DRAFTS_KEY, draftData: draft, nextAuthNamespace: authNamespace }
  );
}

async function getDrafts(page: Page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }, DRAFTS_KEY);
}

test.describe("Write 임시저장 UX", () => {
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
          body: JSON.stringify({ ok: true, post_id: "post-e2e-write-ux" }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, posts: [], hasMore: false }),
      });
    });

    await setAuthToken(page, AUTH_TOKEN);
  });

  test("S0: 임시저장 없음 → 선택 알림 없이 빈 Write 진입", async ({ page }) => {
    await clearDrafts(page);

    await page.getByTestId("fab-write").click();
    await expect(page).toHaveURL(/\/write$/);
    await expect(page.getByTestId("write-confirm-modal")).toHaveCount(0);
    await expect(page.getByTestId("write-title-input")).toHaveValue("");
    await expect(page.getByTestId("write-body-input")).toHaveValue("");
  });

  test("S1: 빈 글 나가기 - Alert 없이 홈으로", async ({ page }) => {
    await clearDrafts(page);
    await page.goto("/write");

    await page.getByTestId("write-close-btn").click();
    await expect(page.getByTestId("write-confirm-modal")).toHaveCount(0);
    await expect(page).toHaveURL(/\/(\(tabs\))?\/?$/);
  });

  test("S2: 완료 제출 → 완료 메시지 + 홈 이동, 임시저장 생성 안됨", async ({ page }) => {
    await clearDrafts(page);
    await page.goto("/write");

    await page.getByTestId("write-title-input").click();
    await page.keyboard.type("제목 A");
    await page.getByTestId("write-body-input").click();
    await page.keyboard.type("내용 A");
    const submitBtn = page.getByTestId("write-submit-btn");
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();
    await expect(page.getByText("미리보기")).toBeVisible();
    await page.getByTestId("write-category-short").click();
    await submitBtn.click();

    await expect(page.getByText("완료되었어요")).toBeVisible();
    await page.getByTestId("write-success-go-home").click();
    await expect(page).toHaveURL(/\/(\(tabs\))?\/?$/);

    await page.getByTestId("fab-write").click();
    await expect(page).toHaveURL(/\/write$/);
    await expect(page.getByTestId("write-confirm-modal")).toHaveCount(0);
    await expect(await getDrafts(page)).toHaveLength(0);
  });

  test("S2-1: 행간/자간 설정을 layout_json으로 전송한다", async ({ page }) => {
    await clearDrafts(page);

    const capture: { payload?: CapturedPostPayload } = {};
    await page.route("**/api/posts", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }

      capture.payload = route.request().postDataJSON() as CapturedPostPayload;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, post_id: "post-layout-spacing" }),
      });
    });

    await page.goto("/write");
    await page.getByTestId("write-title-input").fill("행간 자간 제목");
    await page.getByTestId("write-body-input").fill("행간 자간 본문");

    await page.getByTestId("write-layout-box-title_box").click();
    await page.getByTestId("write-layout-title-line-height-1_3").click();
    await page.getByTestId("write-layout-title-letter-spacing-0_04").click();

    await page.getByTestId("write-layout-box-text_box").click();
    await page.getByTestId("write-layout-body-line-height-1_45").click();
    await page.getByTestId("write-layout-body-letter-spacing-neg_0_02").click();

    const submitBtn = page.getByTestId("write-submit-btn");
    await submitBtn.click();
    await expect(page.getByText("미리보기")).toBeVisible();
    await page.getByTestId("write-category-short").click();
    await submitBtn.click();

    await expect(page.getByText("완료되었어요")).toBeVisible();
    expect(capture.payload).toBeTruthy();

    const layoutJson = capture.payload?.layout_json;
    expect(layoutJson?.title_box?.line_height).toBe(1.3);
    expect(layoutJson?.title_box?.letter_spacing).toBe(0.04);
    expect(layoutJson?.text_box?.line_height).toBe(1.45);
    expect(layoutJson?.text_box?.letter_spacing).toBe(-0.02);
    expect(layoutJson?.footer_box?.letter_spacing).toBeUndefined();
  });

  test("S3: 작성 중 X confirm (취소/그냥 닫기/임시 저장하기)", async ({ page }) => {
    await clearDrafts(page);

    // A) 취소
    await page.goto("/write");
    await page.getByTestId("write-title-input").click();
    await page.keyboard.type("temp title");
    await page.getByTestId("write-close-btn").click();
    const confirmModal = page.getByTestId("write-confirm-modal");
    await expect(confirmModal).toBeVisible();
    await page.getByTestId("confirm-close-cancel").click();
    await expect(confirmModal).toHaveCount(0);
    await expect(page.getByTestId("write-title-input")).toHaveValue("temp title");

    // B) 그냥 닫기 -> 홈, draft 없음
    await page.getByTestId("write-close-btn").click();
    await page.getByTestId("confirm-close-discard").click();
    await expect(page).toHaveURL(/\/(\(tabs\))?\/?$/);
    await expect(await getDrafts(page)).toHaveLength(0);

    // C) 임시 저장하기 -> 홈, draft 생성
    await page.goto("/write");
    await page.getByTestId("write-title-input").click();
    await page.keyboard.type("draft title");
    await page.getByTestId("write-body-input").click();
    await page.keyboard.type("draft body");
    await page.getByTestId("write-close-btn").click();
    await page.getByTestId("confirm-close-save").click();
    await expect(page).toHaveURL(/\/(\(tabs\))?\/?$/);
    const drafts = await getDrafts(page);
    expect(drafts.length).toBe(1);
    expect(drafts[0].title).toBe("draft title");
    expect(drafts[0].body).toBe("draft body");
  });

  test("S4: 임시저장 존재 시 FAB 진입 선택", async ({ page }) => {
    await seedDraft(page, { id: "seed-1", title: "seed title", body: "seed body" });
    await page.goto("/");

    await page.getByTestId("fab-write").click();
    const confirmModal = page.getByTestId("write-confirm-modal");
    await expect(confirmModal).toBeVisible();
    await expect(page.getByTestId("confirm-draft-new")).toBeVisible();
    await expect(page.getByTestId("confirm-draft-list")).toBeVisible();

    // A) 새로 쓰기
    await page.getByTestId("confirm-draft-new").click();
    await expect(page).toHaveURL(/\/write$/);
    await expect(page.getByTestId("write-title-input")).toHaveValue("");
    await expect(await getDrafts(page)).toHaveLength(1);

    // B) 임시저장함
    await page.goto("/");
    await page.getByTestId("fab-write").click();
    await page.getByTestId("confirm-draft-list").click();
    await expect(page).toHaveURL(/\/write-drafts$/);
  });

  test("S5: 임시저장함 → 열기/삭제", async ({ page }) => {
    await seedDraft(page, { id: "draft-a", title: "A title", body: "A body" });
    await page.goto("/write-drafts");

    await page.getByTestId("draft-open-draft-a").click();
    await expect(page).toHaveURL(/\/write(\?.*)?$/);
    await expect(page.getByTestId("write-title-input")).toHaveValue("A title");
    await expect(page.getByTestId("write-body-input")).toHaveValue("A body");

    // 삭제
    await page.goto("/write-drafts");
    await page.getByTestId("draft-delete-draft-a").click();
    await expect(page.getByTestId("draft-item-draft-a")).toHaveCount(0);

    // FAB 재진입 시 알림 없음
    await page.goto("/");
    await page.getByTestId("fab-write").click();
    await expect(page.getByTestId("write-confirm-modal")).toHaveCount(0);
  });

  test("S6: 안정성 - 중복 모달/중복 진입 방지", async ({ page }) => {
    await clearDrafts(page);

    // Confirm 중복 표시 안됨
    await page.goto("/write");
    await page.getByTestId("write-title-input").click();
    await page.keyboard.type("dup check");
    await page.getByTestId("write-close-btn").click();
    await expect(page.getByTestId("write-confirm-modal")).toHaveCount(1);
    await page.getByTestId("confirm-close-cancel").click();

    // FAB 빠르게 2번 클릭해도 write 화면 1개
    await page.goto("/");
    await page.getByTestId("fab-write").dblclick();
    await expect(page.getByTestId("write-title-input")).toHaveCount(1);
  });
});
