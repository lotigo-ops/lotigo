import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { readFile, mkdir, access } from "node:fs/promises";
import assert from "node:assert/strict";

await mkdir("outputs", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errors = [];
  const network = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => { if (/^https?:/.test(request.url())) network.push(request.url()); });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true,
      value: { writeText: async (text) => { globalThis.__copied = text; } } });
  });
  await page.goto(pathToFileURL(resolve("website/index.html")).href);
  assert.equal(await page.getByRole("tab", { name: "Un lot de 3 objets", exact: true }).getAttribute("aria-selected"), "true");
  assert.equal(await page.locator(".batch-row").count(), 3);
  await page.getByRole("tab", { name: "Une annonce", exact: true }).click();
  await page.getByRole("textbox", { name: "Titre", exact: true }).fill("Mon exemple personnel");
  await page.locator("#listing-price").fill("37.5");
  await page.getByRole("button", { name: "Appareil photo", exact: true }).click();
  assert.match(await page.locator("#listing-title").inputValue(), /argentique/);
  await page.getByRole("button", { name: "Lampe de bureau", exact: true }).click();
  assert.equal(await page.locator("#listing-title").inputValue(), "Mon exemple personnel");
  assert.equal(await page.locator("#listing-price").inputValue(), "37.5");
  await page.getByRole("button", { name: "Copier l'annonce d'exemple", exact: true }).click();
  const copied = await page.evaluate(() => globalThis.__copied);
  assert.match(copied, /DÉMONSTRATION/);
  assert.match(copied, /Mon exemple personnel/);
  assert.match(copied, /37,5/);
  await page.getByRole("tab", { name: "Un lot de 3 objets", exact: true }).click();
  assert.equal(await page.locator(".batch-row").count(), 3);
  const formulaTitle = '=HYPERLINK("https://example.test")';
  await page.locator("#batch-title-lamp").fill(formulaTitle);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter cet exemple CSV", exact: true }).click();
  const download = await downloadPromise;
  const csv = await readFile(await download.path(), "utf8");
  assert.equal(download.suggestedFilename(), "annonces-exemple-demo.csv");
  assert.match(csv, /'=HYPERLINK/);
  assert.match(csv, /données fictives/);
  assert.match(csv, /37.5/);
  await page.getByRole("tab", { name: "Une annonce", exact: true }).click();
  assert.equal(await page.locator("#listing-title").inputValue(), formulaTitle);
  await page.getByRole("button", { name: "Rétablir", exact: true }).click();
  assert.equal(await page.locator("#listing-price").inputValue(), "25");
  await page.getByRole("tab", { name: "Une annonce", exact: true }).focus();
  await page.keyboard.press("ArrowLeft");
  assert.equal(await page.getByRole("tab", { name: "Un lot de 3 objets", exact: true }).getAttribute("aria-selected"), "true");
  await page.keyboard.press("End");
  assert.equal(await page.getByRole("tab", { name: "Une annonce", exact: true }).getAttribute("aria-selected"), "true");
  await page.getByRole("tab", { name: "Première ouverture", exact: true }).click();
  assert.match(await page.locator("#app-screenshot").getAttribute("src"), /premiere-ouverture/);
  await page.getByRole("button", { name: "Agrandir la capture", exact: true }).click();
  assert.equal(await page.locator("#screenshot-dialog").isVisible(), true);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#screenshot-dialog").isVisible(), false);
  await page.getByRole("tab", { name: "Espace de travail", exact: true }).click();
  await page.getByRole("button", { name: "Voir les étapes de connexion", exact: true }).click();
  assert.equal(await page.locator("#guide-dialog").isVisible(), true);
  await page.getByRole("heading", { name: "Connecter OpenAI", exact: true }).waitFor();
  await page.keyboard.press("Escape");
  await page.getByText("Est-ce vraiment gratuit ?", { exact: true }).click();
  assert.equal(await page.locator(".faq-list details").first().getAttribute("open"), "");
  await page.getByText("Est-ce vraiment gratuit ?", { exact: true }).click();
  for (const href of await page.locator('a[href^="downloads/"]').evaluateAll((links) => links.map((link) => link.getAttribute("href")))) {
    await access(resolve("website", href));
  }
  await page.waitForFunction(() => document.querySelector("#toast").hidden);
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1366, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 360, height: 780 }]) {
    await page.setViewportSize(viewport);
    for (const section of ["#demo", "#application", "#connexion", "#questions", "#telecharger"]) {
      await page.locator(section).scrollIntoViewIfNeeded();
    }
    await page.waitForFunction(() => Array.from(document.images).filter((image) => image.getBoundingClientRect().width > 0).every((image) => image.complete && image.naturalWidth > 0));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "Horizontal overflow at " + viewport.width);
    const clipped = await page.evaluate(() => [...document.querySelectorAll("input, textarea, select, button, h1, h2, h3")]
      .filter((node) => { const box = node.getBoundingClientRect(); return box.width > 0 && (box.left < -1 || box.right > innerWidth + 1); })
      .map((node) => node.id || node.textContent));
    assert.deepEqual(clipped, [], "Clipped controls at " + viewport.width);
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(600);
    await page.screenshot({ path: "outputs/site-" + viewport.width + ".png", fullPage: true });
    await page.screenshot({ path: "outputs/site-" + viewport.width + "-first.png" });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Ouvrir le menu", exact: true }).click();
  assert.equal(await page.locator("#menu-toggle").getAttribute("aria-expanded"), "true");
  await page.getByRole("navigation").getByRole("link", { name: "L'application", exact: true }).click();
  assert.equal(await page.locator("#menu-toggle").getAttribute("aria-expanded"), "false");
  await page.getByRole("button", { name: "Voir les étapes de connexion", exact: true }).click();
  assert.equal(await page.locator("#guide-dialog").isVisible(), true);
  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), "auto");
  assert.deepEqual(errors, []);
  assert.deepEqual(network, [], "Preview must not contact an API or tracking service");
  console.log("OK: editable demo, clipboard, safe CSV, tabs/keyboard, dialogs, mobile menu, 5 viewports, downloads, local-only assets and no API calls.");
} finally { await browser.close(); }

