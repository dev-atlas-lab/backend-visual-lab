import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Backend Visual Lab E2E & Accessibility Verification", () => {
  test("renders Catalog page and passes axe accessibility audit", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Backend Visual Lab/i);
    await expect(page.locator("h1")).toContainText("Backend Engineering Interactive Laboratory");

    // Check all 6 domains exist in the catalog
    await expect(page.locator("text=Messaging & Event Streaming")).toBeVisible();
    await expect(page.locator("text=Caching & Redis")).toBeVisible();
    await expect(page.locator("text=Databases (PostgreSQL Internals)")).toBeVisible();

    // Axe audit in dark mode
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("runs Kafka Consumer Group simulation and interacts with playback controls", async ({ page }) => {
    await page.goto("/domains/messaging/kafka-consumer-groups-rebalance");
    await expect(page.locator("h1")).toContainText("Apache Kafka — Consumer Groups");

    // Verify initial tick 1
    await expect(page.locator("text=Tick 1 /")).toBeVisible();
    await expect(page.locator("text=Generation 1")).toBeVisible();

    // Click Step Forward
    await page.locator("button:has-text('Step')").click();
    await expect(page.locator("text=Tick 2 /")).toBeVisible();

    // Verify theme toggle
    await page.locator("button[aria-label*='theme']").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    // Axe audit in light mode
    const lightAxeScan = await new AxeBuilder({ page }).analyze();
    expect(lightAxeScan.violations).toEqual([]);
  });

  test("completes a knowledge check quiz and inspects explanations", async ({ page }) => {
    await page.goto("/domains/messaging/kafka-consumer-groups-rebalance");

    // Scroll to assessment section
    const submitBtn = page.locator("button:has-text('Nộp bài & Xem lời giải')");
    await submitBtn.scrollIntoViewIfNeeded();

    // Select choices for Q1 and Q2
    await page.locator("input[type='radio']").first().click();
    await page.locator("input[type='checkbox']").first().click();

    // Submit
    await submitBtn.click();
    await expect(page.locator("text=Độ chính xác:")).toBeVisible();
    await expect(page.locator("button:has-text('Làm lại bài kiểm tra')")).toBeVisible();
  });
});
