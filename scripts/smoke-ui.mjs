import { chromium } from "playwright";

const base = process.env.SMOKE_BASE || "http://127.0.0.1:5176";

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const run = async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const findings = [];

  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await page.click(".menu-button");
  await page.waitForTimeout(200);

  const openNavCount = await page.locator(".site-nav.is-open").count();
  const popoverVisible = await page.locator("[data-site-menu]:not([hidden])").count();
  const navDisplay = await page.locator(".site-nav").evaluate((el) => getComputedStyle(el).display);

  assert(popoverVisible === 1, "expected one site menu popover");
  assert(openNavCount === 0, "legacy .site-nav.is-open should not appear");
  assert(navDisplay === "none", `legacy .site-nav should stay hidden, got ${navDisplay}`);
  findings.push("home mobile menu: single popover OK");

  await page.goto(`${base}/forum.html`, { waitUntil: "networkidle" });
  await page.click(".menu-button");
  await page.waitForTimeout(200);
  const forumOpenNav = await page.locator(".site-nav.is-open").count();
  const forumPopover = await page.locator("[data-site-menu]:not([hidden])").count();
  assert(forumOpenNav === 0 && forumPopover === 1, "forum menu should be single popover");
  findings.push("forum mobile menu: single popover OK");

  const rows = await page.locator(".forum-row").count();
  findings.push(`forum rows rendered: ${rows}`);

  const signedInToggle = await page.locator("[data-account-profile-toggle]").count();
  assert(signedInToggle === 0, "nested account profile toggle should be removed");
  findings.push("account panel: flat signed-in actions OK");

  await browser.close();
  for (const line of findings) console.log(`✓ ${line}`);
  console.log("smoke-ui passed");
};

run().catch((error) => {
  console.error("smoke-ui failed:", error.message);
  process.exit(1);
});
