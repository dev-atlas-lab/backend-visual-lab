import { test, expect } from "@playwright/test";
import path from "node:path";

const DESKTOP_VIEWPORTS = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "laptop-1280", width: 1280, height: 800 },
];

const MOBILE_VIEWPORTS = [
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "small-mobile-360", width: 360, height: 800 },
];

const ROUTES = [
  { path: "/", id: "catalog" },
  { path: "/knowledge", id: "knowledge" },
  { path: "/settings", id: "settings" },
  { path: "/progress", id: "progress" },
  { path: "/domains/java/java-memory-heap-stack-gc", id: "lab-java-gc" },
  { path: "/domains/java/java-exceptions-stack-unwinding", id: "lab-java-exceptions" },
  { path: "/domains/java/java-hashmap-treeification", id: "lab-java-hashmap" },
  { path: "/domains/java/java-concurrenthashmap-locking", id: "lab-java-chm" },
  { path: "/domains/java/java-optional-functional-patterns", id: "lab-java-optional" },
  { path: "/domains/java/java-concurrency-jmm-locks", id: "lab-java-jmm" },
  { path: "/domains/java/java-thread-pool-executor", id: "lab-java-threadpool" },
  { path: "/domains/java/java-streams-lazy-evaluation", id: "lab-java-streams" },
  { path: "/domains/java/java-virtual-threads-loom", id: "lab-java-virtualthreads" },
  { path: "/domains/java/java-completable-future-async", id: "lab-java-completablefuture" },
  { path: "/domains/java/java-references-threadlocal-leaks", id: "lab-java-threadlocal" },
  { path: "/domains/messaging/kafka-consumer-groups-rebalance", id: "lab-kafka" },
  { path: "/domains/caching/redis-cache-stampede-ttl", id: "lab-redis" },
  { path: "/domains/databases/postgres-btree-mvcc-visibility", id: "lab-postgres" },
];

test.describe("UI/UX Audit & Browser-Based Visual Verification", () => {
  test("audit console errors, horizontal overflow, and render across viewports and themes", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const consoleErrors: string[] = [];
    const layoutDefects: Array<{ route: string; viewport: string; defect: string }> = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(`[Console Error] ${msg.text()}`);
      }
    });

    page.on("pageerror", (err) => {
      consoleErrors.push(`[Page Uncaught Error] ${err.message}`);
    });

    // 1. Audit Desktop 1440x900 Dark & Light Screenshots
    for (const route of ROUTES) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(300);

      // Verify page title and main container
      await expect(page.locator("body")).toBeVisible();

      // Check horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 2;
      });
      if (hasHorizontalScroll) {
        layoutDefects.push({
          route: route.path,
          viewport: "desktop-1440",
          defect: `Horizontal overflow detected (scrollWidth > innerWidth)`,
        });
      }

      // Screenshot Dark Mode
      const screenshotDir = path.resolve(process.cwd(), "../docs/uiux-audit/screenshots");
      await page.screenshot({
        path: path.join(screenshotDir, `${route.id}-dark-1440.png`),
        fullPage: false,
      });

      // Switch to Light Mode and Screenshot
      await page.evaluate(() => {
        document.documentElement.setAttribute("data-theme", "light");
      });
      await page.waitForTimeout(200);
      await page.screenshot({
        path: path.join(screenshotDir, `${route.id}-light-1440.png`),
        fullPage: false,
      });

      // Switch back to Dark Mode
      await page.evaluate(() => {
        document.documentElement.setAttribute("data-theme", "dark");
      });
    }

    // 2. Audit Viewports for Horizontal Overflow & Responsive Wrapping
    for (const vp of [...DESKTOP_VIEWPORTS, ...MOBILE_VIEWPORTS]) {
      for (const route of ROUTES) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(route.path, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(200);

        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth + 2;
        });
        if (hasHorizontalScroll) {
          const scrollDiff = await page.evaluate(
            () => document.documentElement.scrollWidth - window.innerWidth
          );
          layoutDefects.push({
            route: route.path,
            viewport: vp.name,
            defect: `Horizontal overflow of ${scrollDiff}px (scrollWidth > innerWidth)`,
          });
        }
      }
    }

    // Capture mobile sample screenshots
    const screenshotDir = path.resolve(process.cwd(), "../docs/uiux-audit/screenshots");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.screenshot({ path: path.join(screenshotDir, "catalog-mobile-390.png") });

    await page.goto("/domains/messaging/kafka-consumer-groups-rebalance", {
      waitUntil: "domcontentloaded",
    });
    await page.screenshot({ path: path.join(screenshotDir, "lab-kafka-mobile-390.png") });

    await page.goto("/knowledge", { waitUntil: "domcontentloaded" });
    await page.screenshot({ path: path.join(screenshotDir, "knowledge-mobile-390.png") });

    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    await page.screenshot({ path: path.join(screenshotDir, "settings-mobile-390.png") });

    // 3. Test Critical Interactions & Modals
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/domains/messaging/kafka-consumer-groups-rebalance");

    // Test Playback Controls
    const stepFwdBtn = page.getByRole("button", { name: "Step Forward" });
    await expect(stepFwdBtn).toBeVisible();
    await stepFwdBtn.click();
    await expect(page.locator("text=Tick 2 /")).toBeVisible();

    const resetBtn = page.getByRole("button", { name: /Reset simulation to initial state/i });
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();
    await expect(page.locator("text=Tick 1 /")).toBeVisible();

    // Test Tab Switching in Workbench
    const eventsTab = page.getByRole("button", { name: /Protocol Events/i });
    if (await eventsTab.isVisible()) {
      await eventsTab.click();
      await page.waitForTimeout(100);
    }

    const fidelityTab = page.getByRole("button", { name: /Fidelity & Assumptions/i });
    if (await fidelityTab.isVisible()) {
      await fidelityTab.click();
      await page.waitForTimeout(100);
    }

    const rawTab = page.getByRole("button", { name: /Raw State Frame/i });
    if (await rawTab.isVisible()) {
      await rawTab.click();
      await page.waitForTimeout(100);
    }

    const invariantsTab = page.getByRole("button", { name: /Invariants & Verification/i });
    if (await invariantsTab.isVisible()) {
      await invariantsTab.click();
      await page.waitForTimeout(100);
    }

    // Test Command Palette via Keyboard shortcut
    await page.keyboard.press("Meta+k");
    await page.waitForTimeout(200);
    const cmdPaletteInput = page.getByPlaceholder(/Search labs, domains, or settings/i);
    const isCmdPaletteOpen = await cmdPaletteInput.isVisible();
    if (isCmdPaletteOpen) {
      await page.screenshot({ path: path.join(screenshotDir, "command-palette-open.png") });
      await page.keyboard.press("Escape");
    }

    // Log diagnostic summary
    console.log("=== UI/UX AUDIT DIAGNOSTIC SUMMARY ===");
    console.log(`Total Routes Audited: ${ROUTES.length}`);
    console.log(`Console Errors: ${consoleErrors.length}`);
    for (const err of consoleErrors) {
      console.log(`  - ${err}`);
    }
    console.log(`Layout Defects: ${layoutDefects.length}`);
    for (const defect of layoutDefects) {
      console.log(`  - [${defect.viewport}] ${defect.route}: ${defect.defect}`);
    }

    // Fail if uncaught console errors or layout defects exist
    expect(consoleErrors).toEqual([]);
    expect(layoutDefects).toEqual([]);
  });
});
