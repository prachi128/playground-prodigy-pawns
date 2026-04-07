import { test, expect, request } from "@playwright/test";
import { createCoachInvite, expectRoute, uniqueSuffix } from "./helpers";

test.describe("coach panel", () => {
  test("coach can sign up from an admin invite and load core coach pages", async ({ page }) => {
    const coachEmail = `${uniqueSuffix("coach")}@example.com`;
    const coachUsername = uniqueSuffix("coachuser");
    const coachPassword = "password123";

    const apiContext = await request.newContext();
    const invite = await createCoachInvite(apiContext, coachEmail);

    await page.goto(`/coach-signup/${invite.token}`);
    await expect(page.getByRole("heading", { name: /coach invite signup/i })).toBeVisible();
    await page.getByPlaceholder("Your full name").fill("Coach Test");
    await page.getByPlaceholder("coach_username").fill(coachUsername);
    await page.locator('input[type="password"]').fill(coachPassword);
    await page.getByRole("button", { name: /sign up as coach/i }).click();

    await expectRoute(page, "/coach");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible({ timeout: 30000 });

    await page.goto("/coach/puzzles");
    await expect(page.getByText("Loading puzzles…")).toBeHidden({ timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Puzzles" })).toBeVisible({ timeout: 15000 });

    await page.goto("/coach/students");
    await expect(page.getByRole("heading", { name: "Student management" })).toBeVisible({ timeout: 15000 });

    await apiContext.dispose();
  });
});
