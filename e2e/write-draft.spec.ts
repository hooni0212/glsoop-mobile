import { expect, test, type Page } from "@playwright/test";

const AUTH_TOKEN = "mock-token-for-write-draft";
const AUTH_TOKEN_KEY = "glsoop_auth_token_v1";
const COOKIE_SESSION_TOKEN = "__glsoop_cookie_session__";
const TEST_USER_ID = 1;
const DRAFTS_KEY = `glsoop:write:drafts:v2:user:${TEST_USER_ID}`;
const GUIDED_HELP_DISMISSED_KEY = "glsoop.guidedHelp.dismissed.v1";
type CapturedPostPayload = Record<string, any> & {
  layout_json?: Record<string, any>;
};
type DraftSeed = {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
  category?: string;
  hashtags?: string[];
  layoutJson?: unknown;
  authNamespace?: string;
};

function toAuthNamespace(token: string) {
  void token;
  return `user:${TEST_USER_ID}`;
}

async function setAuthToken(page: Page, token: string) {
  const storagePayload = {
    key: AUTH_TOKEN_KEY,
    value: token,
    guidedHelpDismissedKey: GUIDED_HELP_DISMISSED_KEY,
  };

  await page.addInitScript(
    ({ key, value, guidedHelpDismissedKey }) => {
      localStorage.setItem(key, value);
      localStorage.setItem(
        guidedHelpDismissedKey,
        JSON.stringify({
          version: "guided-help.v1",
          completedAt: "2026-07-03T00:00:00.000Z",
        })
      );
    },
    storagePayload
  );
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(
    ({ key, value, guidedHelpDismissedKey }) => {
      localStorage.setItem(key, value);
      localStorage.setItem(
        guidedHelpDismissedKey,
        JSON.stringify({
          version: "guided-help.v1",
          completedAt: "2026-07-03T00:00:00.000Z",
        })
      );
    },
    storagePayload
  );
}

async function resetDrafts(
  page: Page,
  drafts: DraftSeed[] = []
) {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    {
      key: DRAFTS_KEY,
      value: drafts.map((draft) => ({
        ...draft,
        authNamespace: draft.authNamespace ?? toAuthNamespace(AUTH_TOKEN),
      })),
    }
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

    await setAuthToken(page, AUTH_TOKEN);
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

  test("S3-1) 다른 계정의 로컬 임시저장은 현재 계정에 표시하지 않는다", async ({ page }) => {
    await resetDrafts(page);
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => {
      localStorage.setItem(
        "glsoop:write:drafts:v2:user:2",
        JSON.stringify([
          {
            id: "other-user-draft",
            title: "다른 계정 초안",
            body: "보이면 안 되는 본문",
            authNamespace: "user:2",
            updatedAt: Date.now(),
            expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
          },
        ])
      );
    });

    await page.goto("/write");
    await expect(page.getByTestId("write-confirm-modal")).toHaveCount(0);
    await expect(page.getByTestId("write-title-input")).toHaveValue("");
    await expect(page.getByTestId("write-body-input")).toHaveValue("");
  });

  test("S3-2) 쿠키 세션 임시저장도 계정 id 기준으로 표시한다", async ({ page }) => {
    await setAuthToken(page, COOKIE_SESSION_TOKEN);
    await resetDrafts(page, [
      {
        id: "cookie-session-draft",
        title: "쿠키 세션 초안",
        body: "계정 id로 분리되어야 하는 본문",
        updatedAt: Date.now(),
      },
    ]);

    await page.goto("/write");
    await expect(page.getByTestId("write-confirm-modal")).toBeVisible();
    await page.getByTestId("confirm-draft-list").click();
    await expect(page.getByTestId("draft-item-cookie-session-draft")).toBeVisible();
  });

  test("S4) draft의 paper02/해시태그/행간/자간 layout_json을 복구해서 그대로 전송한다", async ({ page }) => {
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
        body: JSON.stringify({ ok: true, post_id: "post-e2e-draft-layout" }),
      });
    });

    const now = Date.now();
    await resetDrafts(page, [
      {
        id: "draft-layout",
        title: "레이아웃 초안",
        body: "행간 자간이 저장된 본문",
        category: "essay",
        hashtags: ["paper02", "draft"],
        layoutJson: {
          layout_version: 1,
          unit: "normalized",
          canvas: {
            presetId: "paper02",
          },
          title_box: {
            x: 0.336,
            y: 0.256,
            w: 0.424,
            h: 0.122,
            align: "left",
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
            align: "left",
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
        updatedAt: now,
      },
    ]);

    await page.goto("/write?draftId=draft-layout");
    await expect(page.getByTestId("write-title-input")).toHaveValue("레이아웃 초안");
    await expect(page.getByTestId("write-body-input")).toHaveValue("행간 자간이 저장된 본문");

    const submitBtn = page.getByTestId("write-submit-btn");
    await submitBtn.click();
    await submitBtn.click();

    await expect(page.getByText("완료되었어요")).toBeVisible();
    const layoutJson = capture.payload?.layout_json;
    expect(layoutJson?.title_box?.line_height).toBe(1.3);
    expect(layoutJson?.title_box?.letter_spacing).toBe(0.04);
    expect(layoutJson?.text_box?.line_height).toBe(1.45);
    expect(layoutJson?.text_box?.letter_spacing).toBe(-0.02);
    expect(layoutJson?.canvas?.presetId).toBe("paper02");
    expect(capture.payload?.hashtags).toEqual(["paper02", "draft"]);
  });
});
