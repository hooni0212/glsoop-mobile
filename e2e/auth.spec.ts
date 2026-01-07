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

test.describe("auth flows", () => {
  test("signup without token redirects to login with notice", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("auth-go-signup").click();

    await typeInto(page, "이름", "데모 사용자");
    await typeInto(page, "이메일", demoUser.email);
    await typeInto(page, "비밀번호", demoUser.password);
    await page.getByTestId("auth-submit-signup").click();

    await expect(page.getByTestId("auth-submit-login")).toBeVisible();
    await expect(
      page.getByText("회원가입이 완료됐어요. 이메일 인증 후 로그인해 주세요.")
    ).toBeVisible();
    await expect(page.getByPlaceholder("이메일")).toHaveValue(demoUser.email);
  });

  test("login failure shows inline message", async ({ page }) => {
    await page.goto("/login");

    await typeInto(page, "이메일", "wrong@glsoop.com");
    await typeInto(page, "비밀번호", "wrong");
    await page.getByTestId("auth-submit-login").click();

    await expect(page.getByText("로그인이 필요해요")).toBeVisible();
  });

  test("login success reaches tabs then logs out", async ({ page }) => {
    await page.goto("/login");

    await typeInto(page, "이메일", demoUser.email);
    await typeInto(page, "비밀번호", demoUser.password);
    await page.getByTestId("auth-submit-login").click();

    await expect(page.getByTestId("home-brand")).toBeVisible();

    await page.goto("/me");
    await expect(page.getByText("내 정보", { exact: true })).toBeVisible();

    await page.getByText("로그아웃").click();
    await expect(page.getByText("글숲")).toBeVisible();
  });
});
