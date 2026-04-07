import { test, expect } from "@playwright/test";
import { expectRoute, uniqueSuffix } from "./helpers";

test.describe("parent panel", () => {
  test("parent can sign up and load dashboard, children, classes, and payments", async ({ page }) => {
    const parentEmail = `${uniqueSuffix("parent")}@example.com`;
    const parentUsername = uniqueSuffix("parentuser");
    const parentPassword = "password123";

    await page.goto("/signup");
    await page.getByRole("button", { name: "I'm a Parent" }).click();
    await page.getByLabel("Full Name *").fill("Parent Test");
    await page.getByLabel("Username *").fill(parentUsername);
    await page.getByLabel("Email *").fill(parentEmail);
    await page.getByLabel(/Password \* \(min 6 characters\)/i).fill(parentPassword);
    await page.getByPlaceholder("child@email.com").fill("alice@prodigypawns.com");
    await page.getByRole("button", { name: /sign up as parent/i }).click();

    await expectRoute(page, "/parent");
    await expect(page.getByText(/welcome,/i)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("Your Children")).toBeVisible();

    await page.goto("/parent/children");
    await expect(page.getByRole("heading", { name: "Your Children" })).toBeVisible();
    await expect(page.getByText("Alice Wonder")).toBeVisible();

    await page.goto("/parent/classes");
    await expect(page.getByRole("heading", { name: "Class Schedule" })).toBeVisible();

    await page.goto("/parent/payments");
    await expect(page.getByRole("heading", { name: "Payments" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Payment History" })).toBeVisible();
  });
});
