import { request, test, expect } from "@playwright/test";
import {
  BACKEND_URL,
  accounts,
  awardXpToStudent,
  createStudentAccount,
  dismissStudentWelcomeModal,
  dragPiece,
  expectRoute,
  getRewardsWallet,
  getStudentIdByEmail,
  loginViaUi,
} from "./helpers";

const BOT_GAME_BASE = {
  id: 999001,
  white_player_id: 2,
  black_player_id: 200001,
  time_control: "unlimited",
  total_moves: 42,
  started_at: "2026-04-02T00:00:00Z",
  ended_at: "2026-04-02T00:10:00Z",
  bot_difficulty: "beginner",
  bot_depth: 1,
  pgn: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5",
  starting_fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  final_fen: "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
};

test.describe("student panel", () => {
  test("student can log in and load dashboard and puzzles", async ({ page }) => {
    await loginViaUi(page, accounts.alice.email, accounts.alice.password);
    await expectRoute(page, "/dashboard");
    await dismissStudentWelcomeModal(page);
    await expect(page.getByRole("heading", { name: "Star Shop" })).toBeVisible();

    await page.goto("/puzzles");
    await expectRoute(page, "/puzzles");
    await expect(page.getByRole("heading", { name: "Solve Puzzles" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Puzzle Racer" })).toBeVisible();
  });

  test("student can start a bot game", async ({ page }) => {
    await loginViaUi(page, accounts.alice.email, accounts.alice.password);
    await expectRoute(page, "/dashboard");
    await page.goto("/beat-the-bot");
    await expectRoute(page, "/beat-the-bot");
    await dismissStudentWelcomeModal(page);
    await expect(page.getByText(/checking existing game/i)).toBeHidden({ timeout: 30000 });

    const resignButton = page.getByRole("button", { name: "Resign" });
    if (!(await resignButton.isVisible().catch(() => false))) {
      await page.getByRole("button", { name: /start game vs/i }).click({ force: true });
    }

    await expect(resignButton).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("Moves", { exact: true })).toBeVisible();
  });

  for (const scenario of [
    {
      name: "win",
      result: "1-0",
      result_reason: "checkmate",
      winner_id: 2,
      heading: "You won!",
    },
    {
      name: "loss",
      result: "0-1",
      result_reason: "checkmate",
      winner_id: 200001,
      heading: "You lost",
    },
    {
      name: "draw",
      result: "1/2-1/2",
      result_reason: "stalemate",
      winner_id: null,
      heading: "It's a draw!",
    },
  ]) {
    test(`student sees result modal for bot game ${scenario.name}`, async ({ page }) => {
      await loginViaUi(page, accounts.alice.email, accounts.alice.password);
      await expectRoute(page, "/dashboard");
      const userId = await page.evaluate(async (backendUrl) => {
        const response = await fetch(`${backendUrl}/api/auth/me`, {
          credentials: "include",
        });
        const user = await response.json();
        return user.id as number;
      }, BACKEND_URL);

      await page.route("**/api/games?**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      });

      await page.route("**/api/games/bot", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...BOT_GAME_BASE,
            white_player_id: userId,
            result: scenario.result,
            result_reason: scenario.result_reason,
            winner_id: scenario.winner_id === 2 ? userId : scenario.winner_id,
          }),
        });
      });

      await page.goto("/beat-the-bot");
      await expectRoute(page, "/beat-the-bot");
      await dismissStudentWelcomeModal(page);
      await expect(page.getByText(/checking existing game/i)).toBeHidden({ timeout: 30000 });

      await page.getByRole("button", { name: /start game vs/i }).click();

      await expect(page.getByRole("heading", { name: scenario.heading })).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole("button", { name: "Analyze your Game" })).toBeVisible();
      await expect(page.getByRole("button", { name: "New Game" })).toBeVisible();
    });
  }

  test("two students can create and accept a PvP invite", async ({ browser }) => {
    const apiContext = await request.newContext();
    const playerOne = {
      email: `student-a-${Date.now()}@example.com`,
      username: `student_a_${Date.now()}`,
      full_name: "Student Alpha",
      password: "password123",
      age: 10,
      avatar_url: "/avatars/default.png",
    };
    const playerTwo = {
      email: `student-b-${Date.now()}@example.com`,
      username: `student_b_${Date.now()}`,
      full_name: "Student Beta",
      password: "password123",
      age: 11,
      avatar_url: "/avatars/default.png",
    };
    await createStudentAccount(apiContext, playerOne);
    await createStudentAccount(apiContext, playerTwo);
    await apiContext.dispose();

    const aliceContext = await browser.newContext();
    const bobContext = await browser.newContext();
    const alicePage = await aliceContext.newPage();
    const bobPage = await bobContext.newPage();

    await loginViaUi(alicePage, playerOne.email, playerOne.password);
    await loginViaUi(bobPage, playerTwo.email, playerTwo.password);
    await expectRoute(alicePage, "/dashboard");
    await expectRoute(bobPage, "/dashboard");

    await alicePage.goto("/chess-game");
    await bobPage.goto("/chess-game");
    await dismissStudentWelcomeModal(alicePage);
    await dismissStudentWelcomeModal(bobPage);

    await expect(alicePage.getByPlaceholder("Search by username or name...")).toBeVisible();
    await alicePage.getByRole("button", { name: "5+0" }).click();
    await alicePage.getByPlaceholder("Search by username or name...").fill(playerTwo.username);
    await expect(alicePage.getByText(playerTwo.username).first()).toBeVisible({ timeout: 15000 });
    await alicePage.getByRole("button", { name: "Invite" }).first().click();
    await expect(alicePage.getByText(/invites sent/i)).toBeVisible();

    await bobPage.bringToFront();
    await bobPage.reload();
    await expect(bobPage.getByRole("button", { name: "Accept" }).first()).toBeVisible({ timeout: 20000 });
    await bobPage.getByRole("button", { name: "Accept" }).first().click();

    await expect(
      bobPage.getByText(/your turn|opponent thinking|game over/i)
    ).toBeVisible({ timeout: 30000 });
    await expect(
      alicePage.getByText(/your turn|opponent thinking|game over/i)
    ).toBeVisible({ timeout: 30000 });

    await aliceContext.close();
    await bobContext.close();
  });

  test("student can reveal a hint and solve a seeded puzzle", async ({ page }) => {
    await loginViaUi(page, accounts.alice.email, accounts.alice.password);
    await expectRoute(page, "/dashboard");
    await dismissStudentWelcomeModal(page);

    await page.goto("/puzzles/2");
    await expect(page.getByText("Puzzle Info")).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: /need a hint/i }).click();
    await expect(page.getByText(/your xp:/i)).toBeVisible();
    await page.getByRole("button", { name: /gentle hint/i }).click();
    await expect(page.getByText(/revealed/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/💡|hint/i).first()).toBeVisible();

    await dragPiece(page, "d1", "d8");
    await expect(page.getByRole("button", { name: /next puzzle/i })).toBeVisible({ timeout: 15000 });
  });

  test("student can convert XP to stars and purchase a shop item", async ({ page }) => {
    const apiContext = await request.newContext();
    const studentId = await getStudentIdByEmail(apiContext, accounts.alice.email);
    await awardXpToStudent(apiContext, studentId, 700);
    const wallet = await getRewardsWallet(apiContext, accounts.alice.email, accounts.alice.password);
    await apiContext.dispose();

    await loginViaUi(page, accounts.alice.email, accounts.alice.password);
    await expectRoute(page, "/dashboard");
    await dismissStudentWelcomeModal(page);

    const convertButton = page.getByRole("button", { name: /convert 250 xp/i });
    const starsNeeded = Math.max(0, 5 - wallet.star_balance);
    const conversionsNeeded = Math.max(0, Math.min(wallet.max_convertible_stars, starsNeeded));

    for (let i = 0; i < conversionsNeeded; i += 1) {
      await convertButton.click();
      await expect(page.getByText(/converted 250 xp into 1 star/i).first()).toBeVisible({
        timeout: 10000,
      });
    }

    const firstAffordableBuyButton = page.locator("button:enabled").filter({ hasText: "Buy" }).first();
    await expect(firstAffordableBuyButton).toBeEnabled({ timeout: 15000 });
    await firstAffordableBuyButton.click();
    await expect(page.getByText(/cool sunglasses purchased|delivery will be coordinated/i)).toBeVisible({
      timeout: 15000,
    });
  });
});
