import { expect, Page, APIRequestContext } from "@playwright/test";

export const BACKEND_URL =
  process.env.PLAYWRIGHT_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const accounts = {
  admin: { email: "admin@prodigypawns.com", password: "admin123" },
  alice: { email: "alice@prodigypawns.com", password: "password123" },
  bob: { email: "bob@prodigypawns.com", password: "password123" },
};

export function uniqueSuffix(prefix: string): string {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${stamp}`;
}

export async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /log in/i }).click();
}

export async function dismissStudentWelcomeModal(page: Page) {
  const letsGoButton = page.getByRole("button", { name: /let's go!/i });
  const nextButton = page.getByRole("button", { name: /^next$/i });
  const hasModal =
    (await nextButton.isVisible().catch(() => false)) ||
    (await letsGoButton.isVisible().catch(() => false));

  if (!hasModal) {
    return;
  }

  for (let step = 0; step < 3; step += 1) {
    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click();
      continue;
    }
    if (await letsGoButton.isVisible().catch(() => false)) {
      await letsGoButton.click();
      break;
    }
  }
}

export async function expectRoute(page: Page, path: string) {
  await expect(page).toHaveURL(new RegExp(`${escapeRegex(path)}(?:[/?#].*)?$`), {
    timeout: 30000,
  });
}

export async function apiLogin(request: APIRequestContext, email: string, password: string) {
  const response = await request.post(`${BACKEND_URL}/api/auth/login`, {
    form: {
      username: email,
      password,
    },
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  expect(response.ok()).toBeTruthy();
}

export async function createCoachInvite(
  request: APIRequestContext,
  email: string,
  expiresInDays = 7
): Promise<{ id: number; token: string; invite_url: string }> {
  await apiLogin(request, accounts.admin.email, accounts.admin.password);
  const response = await request.post(`${BACKEND_URL}/api/admin/coach-invites`, {
    data: {
      email,
      expires_in_days: expiresInDays,
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { id: number; token: string; invite_url: string };
}

export async function createStudentAccount(
  request: APIRequestContext,
  data: {
    email: string;
    username: string;
    full_name: string;
    password: string;
    age?: number;
    gender?: string;
    avatar_url?: string;
  }
) {
  const response = await request.post(`${BACKEND_URL}/api/auth/signup`, {
    data,
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

export async function getStudentIdByEmail(request: APIRequestContext, email: string): Promise<number> {
  await apiLogin(request, accounts.admin.email, accounts.admin.password);
  const response = await request.get(`${BACKEND_URL}/api/admin/students`);
  expect(response.ok()).toBeTruthy();
  const students = (await response.json()) as Array<{ id: number; email: string }>;
  const student = students.find((row) => row.email.toLowerCase() === email.toLowerCase());
  expect(student).toBeTruthy();
  return student!.id;
}

export async function awardXpToStudent(
  request: APIRequestContext,
  studentId: number,
  amount: number
) {
  await apiLogin(request, accounts.admin.email, accounts.admin.password);
  let remaining = amount;
  while (remaining > 0) {
    const grant = Math.min(100, remaining);
    const response = await request.post(
      `${BACKEND_URL}/api/coach/students/${studentId}/award-xp?xp_amount=${grant}`
    );
    expect(response.ok()).toBeTruthy();
    remaining -= grant;
  }
}

export async function getRewardsWallet(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<{ total_xp: number; star_balance: number; max_convertible_stars: number }> {
  await apiLogin(request, email, password);
  const response = await request.get(`${BACKEND_URL}/api/rewards/wallet`);
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as {
    total_xp: number;
    star_balance: number;
    max_convertible_stars: number;
  };
}

export async function dragPiece(page: Page, from: string, to: string) {
  const fromSquare = page.locator(`[data-square="${from}"]`);
  const toSquare = page.locator(`[data-square="${to}"]`);
  await expect(fromSquare).toBeVisible();
  await expect(toSquare).toBeVisible();

  const fromBox = await fromSquare.boundingBox();
  const toBox = await toSquare.boundingBox();
  if (!fromBox || !toBox) {
    throw new Error(`Could not determine board coordinates for ${from} -> ${to}`);
  }

  await page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2, { steps: 10 });
  await page.mouse.up();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
