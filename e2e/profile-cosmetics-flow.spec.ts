import { expect, test, type Page, type Route } from "@playwright/test";

const AUTH_TOKEN_KEY = "glsoop_auth_token_v1";

const V1_BADGES = [
  { key: "badge_default_seedling", name: "새싹 배지", icon_emoji: "🌱", rarity: "common" },
  { key: "badge_spring_2026", name: "2026 봄 배지", icon_emoji: "🌸", rarity: "rare" },
  { key: "badge_winter_2026", name: "2026 겨울 배지", icon_emoji: "❄️", rarity: "rare" },
  { key: "badge_summer_2026", name: "2026 여름 배지", icon_emoji: "☀️", rarity: "rare" },
  { key: "badge_autumn_2026", name: "2026 가을 배지", icon_emoji: "🍂", rarity: "rare" },
  { key: "badge_first_post", name: "첫 글 배지", icon_emoji: "🌱", rarity: "common" },
  { key: "badge_posts_10", name: "열 편의 시작 배지", icon_emoji: "🌿", rarity: "common" },
  { key: "badge_posts_50", name: "단단한 나무 배지", icon_emoji: "🌳", rarity: "rare" },
  { key: "badge_first_like", name: "첫 공감 배지", icon_emoji: "✨", rarity: "common" },
  { key: "badge_loved_post", name: "사랑받은 글 배지", icon_emoji: "💙", rarity: "rare" },
  { key: "badge_streak_3", name: "리듬 찾기 배지", icon_emoji: "🔥", rarity: "common" },
  { key: "badge_streak_7", name: "꾸준한 발걸음 배지", icon_emoji: "🌠", rarity: "rare" },
  { key: "badge_streak_30", name: "숲의 주인 배지", icon_emoji: "🏆", rarity: "epic" },
].map((item) => ({ ...item, type: "badge", season: null, meta: null }));

const V1_STICKERS = [
  { key: "sticker_leaf", name: "리프 스티커", icon_emoji: "🍃", rarity: "common" },
  { key: "sticker_star", name: "스타 스티커", icon_emoji: "✨", rarity: "common" },
  { key: "sticker_moon", name: "문 스티커", icon_emoji: "🌙", rarity: "rare" },
].map((item) => ({ ...item, type: "sticker", season: null, meta: null }));

const V1_BACKGROUNDS = [
  { key: "background_default_paper", name: "기본 종이 배경", icon_emoji: "📜", rarity: "common" },
  { key: "background_writer_grove", name: "작가의 작은 숲", icon_emoji: "🌳", rarity: "rare" },
  { key: "background_deep_forest", name: "깊은 숲의 리듬", icon_emoji: "🌲", rarity: "epic" },
  { key: "background_prompt_letters", name: "보내지 못한 편지", icon_emoji: "💌", rarity: "rare" },
].map((item) => ({ ...item, type: "background", season: null, meta: null }));

type ProfileState = {
  primary_badge_key: string | null;
  profile_background_key: string | null;
  showcase_badge_keys: string[];
  header_stickers: { slot: "tl" | "tr" | "br"; key: string }[];
};

type Capture = {
  payloads: ProfileState[];
};

function isApiRequest(route: Route, suffix: string) {
  return route.request().url().includes(suffix);
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

function buildExpandedProfile(profile: ProfileState) {
  const badgeByKey = new Map(V1_BADGES.map((item) => [item.key, item]));
  const backgroundByKey = new Map(V1_BACKGROUNDS.map((item) => [item.key, item]));
  const stickerByKey = new Map(V1_STICKERS.map((item) => [item.key, item]));

  return {
    primary_badge: profile.primary_badge_key
      ? badgeByKey.get(profile.primary_badge_key) ?? null
      : null,
    profile_background: profile.profile_background_key
      ? backgroundByKey.get(profile.profile_background_key) ?? null
      : null,
    showcase_badges: profile.showcase_badge_keys
      .map((key) => badgeByKey.get(key))
      .filter(Boolean),
    header_stickers: profile.header_stickers
      .map((entry) => {
        const sticker = stickerByKey.get(entry.key);
        return sticker ? { slot: entry.slot, sticker } : null;
      })
      .filter(Boolean),
  };
}

async function mockProfileCosmeticsApis(page: Page, initialProfile: ProfileState, capture: Capture) {
  let profileState: ProfileState = {
    primary_badge_key: initialProfile.primary_badge_key,
    profile_background_key: initialProfile.profile_background_key,
    showcase_badge_keys: [...initialProfile.showcase_badge_keys],
    header_stickers: initialProfile.header_stickers.map((entry) => ({ ...entry })),
  };

  await page.route("**/api/**", async (route) => {
    if (
      isApiRequest(route, "/api/me/profile-cosmetics") &&
      route.request().method() === "PUT"
    ) {
      const payload = route.request().postDataJSON() as ProfileState;
      capture.payloads.push(payload);
      profileState = {
        primary_badge_key: payload.primary_badge_key,
        profile_background_key: payload.profile_background_key,
        showcase_badge_keys: [...payload.showcase_badge_keys],
        header_stickers: payload.header_stickers.map((entry) => ({ ...entry })),
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          message: "프로필 코스메틱이 업데이트되었습니다.",
          profile_cosmetics: buildExpandedProfile(profileState),
        }),
      });
      return;
    }

    if (isApiRequest(route, "/api/cosmetics/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          message: "내 코스메틱 정보를 불러왔습니다.",
          inventory: {
            badges: V1_BADGES,
            stickers: V1_STICKERS,
            backgrounds: V1_BACKGROUNDS,
          },
          profile: profileState,
        }),
      });
      return;
    }

    if (isApiRequest(route, "/api/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          id: 11,
          nickname: "cosmetics_qa",
          name: "코스메틱 QA",
        }),
      });
      return;
    }

    if (isApiRequest(route, "/api/posts")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, posts: [], has_more: false }),
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

async function expectFullV1CatalogRendered(page: Page) {
  for (const badge of V1_BADGES) {
    await expect(page.getByTestId(`profile-primary-${badge.key}`)).toHaveCount(1);
    await expect(page.getByTestId(`profile-showcase-${badge.key}`)).toHaveCount(1);
  }
  for (const background of V1_BACKGROUNDS) {
    await expect(page.getByTestId(`profile-background-${background.key}`)).toHaveCount(1);
  }
  for (const slot of ["tl", "tr", "br"] as const) {
    await expect(page.getByTestId(`profile-sticker-${slot}-none`)).toHaveCount(1);
    for (const sticker of V1_STICKERS) {
      await expect(page.getByTestId(`profile-sticker-${slot}-${sticker.key}`)).toHaveCount(1);
    }
  }
}

test.describe("프로필 꾸미기 코스메틱 플로우", () => {
  test("v1 전체 코스메틱을 렌더링하고 선택한 장착 상태를 저장한다", async ({ page }) => {
    const capture: Capture = { payloads: [] };
    await mockProfileCosmeticsApis(
      page,
      {
        primary_badge_key: "badge_default_seedling",
        profile_background_key: "background_default_paper",
        showcase_badge_keys: [],
        header_stickers: [],
      },
      capture
    );
    await setAuthToken(page, "mock-token-for-profile-cosmetics");

    await page.goto("/profile-customize");
    await expect(page.getByTestId("profile-customize-screen")).toBeVisible();
    await expectFullV1CatalogRendered(page);

    const expectedProfile: ProfileState = {
      primary_badge_key: "badge_loved_post",
      profile_background_key: "background_prompt_letters",
      showcase_badge_keys: [
        "badge_first_post",
        "badge_posts_10",
        "badge_posts_50",
        "badge_streak_3",
        "badge_streak_7",
        "badge_streak_30",
      ],
      header_stickers: [
        { slot: "tl", key: "sticker_leaf" },
        { slot: "tr", key: "sticker_star" },
        { slot: "br", key: "sticker_moon" },
      ],
    };

    await page.getByTestId(`profile-background-${expectedProfile.profile_background_key}`).click();
    await page.getByTestId(`profile-primary-${expectedProfile.primary_badge_key}`).click();
    for (const key of expectedProfile.showcase_badge_keys) {
      await page.getByTestId(`profile-showcase-${key}`).click();
    }
    for (const sticker of expectedProfile.header_stickers) {
      await page.getByTestId(`profile-sticker-${sticker.slot}-${sticker.key}`).click();
    }

    await expect(page.getByText("표시 배지 6/6")).toBeVisible();
    await page.getByTestId("profile-cosmetics-save-btn").click();
    await expect(page.getByText("저장했어요")).toBeVisible();
    expect(capture.payloads.at(-1)).toEqual(expectedProfile);

    await page.reload();
    await expect(page.getByTestId("profile-customize-screen")).toBeVisible();
    await expect(page.getByTestId("profile-cosmetics-preview")).toContainText("보내지 못한 편지");
    await expect(page.getByTestId("profile-cosmetics-preview")).toContainText("단단한 나무 배지");
    await expect(page.getByTestId("profile-cosmetics-preview")).toContainText("+3");
    await expect(page.getByText("표시 배지 6/6")).toBeVisible();
  });

  test("대표 뱃지 없음 저장 payload를 유지한다", async ({ page }) => {
    const capture: Capture = { payloads: [] };
    await mockProfileCosmeticsApis(
      page,
      {
        primary_badge_key: "badge_loved_post",
        profile_background_key: "background_writer_grove",
        showcase_badge_keys: ["badge_first_post"],
        header_stickers: [{ slot: "tr", key: "sticker_star" }],
      },
      capture
    );
    await setAuthToken(page, "mock-token-for-profile-cosmetics");

    await page.goto("/profile-customize");
    await expect(page.getByTestId("profile-customize-screen")).toBeVisible();
    await page.getByTestId("profile-primary-none").click();
    await page.getByTestId("profile-cosmetics-save-btn").click();
    await expect(page.getByText("저장했어요")).toBeVisible();

    expect(capture.payloads.at(-1)).toEqual({
      primary_badge_key: null,
      profile_background_key: "background_writer_grove",
      showcase_badge_keys: ["badge_first_post"],
      header_stickers: [{ slot: "tr", key: "sticker_star" }],
    });

    await page.reload();
    await expect(page.getByTestId("profile-customize-screen")).toBeVisible();
    await expect(page.getByTestId("profile-primary-none")).toHaveAttribute("aria-label", "없음 선택됨");
    await expect(page.getByTestId("profile-cosmetics-save-btn")).toHaveAttribute(
      "aria-disabled",
      "true"
    );
  });
});
