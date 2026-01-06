import { expect, test } from "@playwright/test";

test.describe("홈 화면", () => {
  test("기본 요소가 렌더링된다", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("글숲")).toBeVisible();
    await expect(page.getByRole("button", { name: "검색" })).toBeVisible();
    await expect(page.getByRole("button", { name: "추천" })).toBeVisible();
    await expect(page.getByText("오늘의 추천")).toBeVisible();
  });
});
