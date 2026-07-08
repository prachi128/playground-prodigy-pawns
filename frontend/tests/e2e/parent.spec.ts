import { test, expect } from "@playwright/test";
import { dismissStudentWelcomeModal, expectRoute, uniqueSuffix } from "./helpers";

test.describe("parent panel", () => {
  test("parent links to child via guardian email and can add a child", async ({ page }) => {
    const parentEmail = `${uniqueSuffix("parent")}@example.com`;
    const parentUsername = uniqueSuffix("parentuser");
    const parentPassword = "password123";
    const childUsername = uniqueSuffix("student");
    const childPassword = "password123";

    // Student signs up first with parent's email as guardian
    await page.goto("/signup");
    await page.getByRole("button", { name: "I'm a Student" }).click();
    await page.getByLabel("Full Name *").fill("Linked Child");
    await page.getByLabel("Username *").fill(childUsername);
    await page.getByLabel("Parent / Guardian Email").fill(parentEmail);
    await page.getByLabel(/Password \* \(min 6 characters\)/i).fill(childPassword);
    await page.getByRole("button", { name: /^sign up$/i }).click();
    await expectRoute(page, "/dashboard");
    await dismissStudentWelcomeModal(page);

    // Parent signs up with the same email — auto-links on signup
    await page.goto("/signup");
    await page.getByRole("button", { name: "I'm a Parent" }).click();
    await page.getByLabel("Full Name *").fill("Parent Test");
    await page.getByLabel("Username *").fill(parentUsername);
    await page.getByLabel("Email *").fill(parentEmail);
    await page.getByLabel(/Password \* \(min 6 characters\)/i).fill(parentPassword);
    await page.getByRole("button", { name: /sign up as parent/i }).click();

    await expectRoute(page, "/parent");
    await expect(page.getByText(/welcome,/i)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("Linked Child")).toBeVisible();

    await page.goto("/parent/children");
    await expect(page.getByRole("heading", { name: "Your Children" })).toBeVisible();
    await expect(page.getByText("Linked Child")).toBeVisible();
    await expect(page.getByText(`@${childUsername}`)).toBeVisible();

    // Parent can create another child from the panel
    await page.getByRole("button", { name: "Add child" }).click();
    const createdUsername = uniqueSuffix("created");
    await page.getByLabel("Full name *").fill("Created Child");
    await page.getByLabel("Username *").fill(createdUsername);
    await page.getByLabel("Password *").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Created Child")).toBeVisible({ timeout: 15000 });

    await page.goto("/parent/classes");
    await expect(page.getByRole("heading", { name: "Class Schedule" })).toBeVisible();

    await page.goto("/parent/payments");
    await expect(page.getByRole("heading", { name: "Payments" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Payment History" })).toBeVisible();
  });
});
