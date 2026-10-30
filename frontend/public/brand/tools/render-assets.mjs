/**
 * Rasterise the brand SVGs into the PNG exports required by GitHub, browsers and
 * social previews. Edge/Chrome is driven through Playwright so every export is
 * reproducible from the same source files.
 *
 * Usage: node brand/tools/render-assets.mjs
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const brandDir = path.resolve(here, "..");
const outDir = path.join(brandDir, "png");

const exports = [
  { id: "avatar-1024", file: "avatar-1024.png" },
  { id: "icon-512", file: "icon-512.png" },
  { id: "icon-192", file: "icon-192.png" },
  { id: "apple-touch-icon-180", file: "apple-touch-icon-180.png" },
  { id: "favicon-32", file: "favicon-32.png" },
  { id: "favicon-16", file: "favicon-16.png" },
  { id: "mark-1024", file: "mark-1024.png" },
  { id: "lockup-horizontal-1200", file: "lockup-horizontal-1200.png" },
  { id: "lockup-horizontal-light-1200", file: "lockup-horizontal-light-1200.png" },
  { id: "social-1280x640", file: "social-1280x640.png" },
];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: process.env.DAL_RENDER_CHANNEL ?? "msedge" });

try {
  const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: 1400, height: 1000 } });
  await page.goto(pathToFileURL(path.join(here, "assets.html")).href);
  await page.waitForLoadState("networkidle");
  // Let the SVG <img> paints settle before clipping.
  await page.evaluate(() => Promise.all(Array.from(document.images).map((img) => img.decode().catch(() => {}))));

  for (const item of exports) {
    const target = page.locator(`#${item.id}`);
    await target.screenshot({
      path: path.join(outDir, item.file),
      omitBackground: item.id.startsWith("favicon") || item.id.startsWith("mark-") || item.id.startsWith("lockup"),
    });
    console.log(`rendered ${item.file}`);
  }
} finally {
  await browser.close();
}
