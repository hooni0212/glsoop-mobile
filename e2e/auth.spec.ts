import { expect, test } from "@playwright/test";

const demoUser = {
  email: "demo@glsoop.com",
  password: "demo1234",
};

test.describe("auth flows", () => {
  test("signup without token redirects to login with notice", async ({ page }) => {
    await page.goto("/");

    await page.getByText("회원가입").click();

    await page.getByPlaceholder("이름").fill("데모 사용자");
    await page.getByPlaceholder("이메일").fill(demoUser.email);
    await page.getByPlaceholder("비밀번호").fill(demoUser.password);
    await page.getByText("회원가입").click();

    await expect(page.getByText("로그인")).toBeVisible();
    await expect(
      page.getByText("회원가입이 완료됐어요. 이메일 인증 후 로그인해 주세요.")
    ).toBeVisible();
    await expect(page.getByPlaceholder("이메일")).toHaveValue(demoUser.email);
  });

  test("login failure shows inline message", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder("이메일").fill("wrong@glsoop.com");
    await page.getByPlaceholder("비밀번호").fill("wrong");
    await page.getByText("로그인").click();

    await expect(
      page.getByText("이메일 또는 비밀번호가 올바르지 않아요.")
    ).toBeVisible();
  });

  test("login success reaches tabs then logs out", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder("이메일").fill(demoUser.email);
    await page.getByPlaceholder("비밀번호").fill(demoUser.password);
    await page.getByText("로그인").click();

    await expect(page.getByText("오늘의 추천")).toBeVisible();

    await page.goto("/me");
    await expect(page.getByText("내 정보")).toBeVisible();

    await page.getByText("로그아웃").click();
    await expect(page.getByText("글숲")).toBeVisible();
  });
});
