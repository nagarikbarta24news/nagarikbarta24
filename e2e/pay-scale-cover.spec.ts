import { test, expect, type Page } from "@playwright/test";

/**
 * Confirms pay-scale ("পে-স্কেল") coverage always renders the taka-notes
 * image (news-pay-scale.jpg) across home, category stream, and article page.
 */

const PAY_SCALE_ALT = /পে-স্কেল/;
const PAY_SCALE_IMG = /news-pay-scale\.jpg/;

async function payScaleImageSources(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("img"))
      .filter((el) => (el.getAttribute("alt") ?? "").includes("পে-স্কেল"))
      .map((el) => el.getAttribute("src") ?? ""),
  );
}

test("home page pay-scale cards use the taka-notes image", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const srcs = await payScaleImageSources(page);
  expect(srcs.length).toBeGreaterThan(0);
  for (const src of srcs) expect(src).toMatch(PAY_SCALE_IMG);
});

test("category stream pay-scale cards use the taka-notes image", async ({ page }) => {
  await page.goto("/economy", { waitUntil: "networkidle" });
  const srcs = await payScaleImageSources(page);
  expect(srcs.length).toBeGreaterThan(0);
  for (const src of srcs) expect(src).toMatch(PAY_SCALE_IMG);
});

test("article page hero for a pay-scale story uses the taka-notes image", async ({ page }) => {
  await page.goto("/economy", { waitUntil: "networkidle" });

  // Find a pay-scale article link (/{category}/{slug}).
  const slugLinks = await page.evaluate(() =>
    Array.from(document.querySelectorAll("a"))
      .filter(
        (a) =>
          (a.getAttribute("href") ?? "").split("/").filter(Boolean).length === 2 &&
          (a.textContent ?? "").includes("পে-স্কেল"),
      )
      .map((a) => a.getAttribute("href") ?? ""),
  );
  expect(slugLinks.length).toBeGreaterThan(0);

  await page.goto(slugLinks[0], { waitUntil: "networkidle" });
  const hero = page.locator("img").filter({ has: undefined }).first();
  await expect(hero).toBeVisible();

  const srcs = await payScaleImageSources(page);
  expect(srcs.length).toBeGreaterThan(0);
  for (const src of srcs) expect(src).toMatch(PAY_SCALE_IMG);

  // Sanity: the hero image alt references the pay-scale headline.
  const heroAlt = await page.locator(`img[alt*="পে-স্কেল"]`).first().getAttribute("alt");
  expect(heroAlt).toMatch(PAY_SCALE_ALT);
});
