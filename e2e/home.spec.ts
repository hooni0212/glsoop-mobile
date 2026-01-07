import { expect, test, type Page } from "@playwright/test";

const demoUser = {
  email: "demo@glsoop.com",
  password: "demo1234",
};

async function typeInto(page: Page, placeholder: string, value: string) {
  const field = page.getByPlaceholder(placeholder);
  await field.click();
  await field.fill("");
  await page.keyboard.type(value);
  await expect(field).toHaveValue(value);
}

test.describe("홈 화면", () => {
  test("기본 요소가 렌더링된다", async ({ page }) => {
    await page.goto("/login");

    await typeInto(page, "이메일", demoUser.email);
    await typeInto(page, "비밀번호", demoUser.password);
    await page.getByTestId("auth-submit-login").click();

    await expect(page.getByTestId("home-brand")).toBeVisible();
    await expect(page.getByTestId("home-search-button")).toBeVisible();
    await expect(page.getByTestId("home-chip-추천")).toBeVisible();
    await expect(page.getByText("오늘의 추천")).toBeVisible();
  });
});
