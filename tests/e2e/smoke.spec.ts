import { test, expect } from "@playwright/test";

test("home shows barkd onboarding when daemon is unreachable", async ({ page }) => {
  await page.route("**/api/health", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: false }),
    });
  });

  await page.goto("/");
  await expect(page.getByText(/Set up Ark Wallet/i)).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText(/barkd holds your bitcoin keys/i)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /started barkd/i }),
  ).toBeVisible();
});
