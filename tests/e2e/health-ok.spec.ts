import { test, expect } from "@playwright/test";

test("home advances past barkd check when health reports ok", async ({ page }) => {
  await page.route("**/api/health", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto("/");
  await expect(page.getByText(/Create signing identity|Unlock wallet/i)).toBeVisible({
    timeout: 30_000,
  });
});
