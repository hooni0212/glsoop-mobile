import { expect, test, type Page, type Route } from "@playwright/test";

const AUTH_TOKEN_KEY = "glsoop_auth_token_v1";
const ONBOARDING_KEY = "glsoop.appOnboardingTour.completed.v1";
const GUIDED_HELP_KEY = "glsoop.guidedHelp.dismissed.v1";
const PUBLIC_NOTICE_KEY = "glsoop.public_ugc_notice_ack";

async function prepareUser(page: Page) {
  await page.addInitScript(
    ({ authKey, onboardingKey, guidedHelpKey, publicNoticeKey }) => {
      localStorage.setItem(authKey, "premium-discovery-test-token");
      localStorage.setItem(
        onboardingKey,
        JSON.stringify({
          version: "app-onboarding-tour.v1",
          completedAt: "2026-07-13T00:00:00.000Z",
        })
      );
      localStorage.setItem(
        guidedHelpKey,
        JSON.stringify({
          version: "guided-help.v1",
          completedAt: "2026-07-13T00:00:00.000Z",
        })
      );
      localStorage.setItem(
        publicNoticeKey,
        JSON.stringify({
          versionKey: "public-ugc-notice.v1",
          acknowledgedAt: "2026-07-13T00:00:00.000Z",
        })
      );
    },
    {
      authKey: AUTH_TOKEN_KEY,
      onboardingKey: ONBOARDING_KEY,
      guidedHelpKey: GUIDED_HELP_KEY,
      publicNoticeKey: PUBLIC_NOTICE_KEY,
    }
  );
}

function includes(route: Route, pathname: string) {
  return route.request().url().includes(pathname);
}

async function mockApis(page: Page, events: Array<Record<string, unknown>>) {
  await page.route("**/api/**", async (route) => {
    if (includes(route, "/api/ux-events")) {
      events.push((await route.request().postDataJSON()) as Record<string, unknown>);
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true }) });
      return;
    }
    if (includes(route, "/api/entitlements/me")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, entitlements: [] }) });
      return;
    }
    if (includes(route, "/api/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          id: 7,
          name: "테스트 작가",
          nickname: "테스트 작가",
          bio: "프리미엄 발견성 테스트",
          profile_photo_upload_allowed: false,
        }),
      });
      return;
    }
    if (includes(route, "/api/users/7/profile")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          user: { id: 7, name: "테스트 작가", nickname: "테스트 작가", bio: "프리미엄 발견성 테스트" },
          stats: { postCount: 0, totalLikes: 0, followerCount: 0, followingCount: 0 },
          viewer: { id: 7, is_logged_in: true, is_own_profile: true },
        }),
      });
      return;
    }
    if (includes(route, "/api/users/7/posts") || includes(route, "/api/posts")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, posts: [], has_more: false }) });
      return;
    }
    if (includes(route, "/api/runtime-config")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, legal: { versions: {} } }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
}

test.describe("iOS 프리미엄 발견성", () => {
  test.beforeEach(async ({ page }) => {
    await prepareUser(page);
  });

  test("내 정보 화면에는 프리미엄과 꾸미기 진입을 노출하지 않는다", async ({ page }) => {
    const events: Array<Record<string, unknown>> = [];
    await mockApis(page, events);

    await page.goto("/me");
    await expect(page.getByTestId("premium-discovery-me_card")).toHaveCount(0);
    await expect(page.getByTestId("author-profile-customize-btn")).toHaveCount(0);
  });

  test("홈 소개를 닫으면 14일 쿨다운 동안 다시 노출하지 않는다", async ({ page }) => {
    const events: Array<Record<string, unknown>> = [];
    await mockApis(page, events);

    await page.goto("/explore");
    const card = page.getByTestId("premium-discovery-home_discovery");
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "프리미엄 소개 닫기" }).click();
    await expect(card).toBeHidden();

    await page.reload();
    await expect(page.getByTestId("premium-discovery-home_discovery")).toHaveCount(0);
  });

  test("프로필 사진 잠금은 기능 설명 후 프리미엄 화면으로 연결한다", async ({ page }) => {
    const events: Array<Record<string, unknown>> = [];
    await mockApis(page, events);

    await page.goto("/account-center/profile");
    await page.getByText("프리미엄 보기", { exact: true }).click();
    await expect(page.getByText("내 사진으로 작가 프로필을 완성하세요")).toBeVisible();
    await page.getByRole("button", { name: "프리미엄 혜택 보기" }).click();

    await expect(page).toHaveURL(/\/premium\?source=profile_photo/);
  });
});
