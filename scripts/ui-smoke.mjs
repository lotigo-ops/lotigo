import { _electron } from "playwright";
import assert from "node:assert/strict";
import { copyFile, mkdtemp, mkdir, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";

const dataDir = await mkdtemp(join(tmpdir(), "assistant-annonces-ui-"));
const exportDir = join(dataDir, "exports");
await mkdir(exportDir);
await mkdir("outputs", { recursive: true });
const env = { ...process.env, OPENAI_API_KEY: "", ANNONCES_TEST_DATA_DIR: dataDir };
delete env.ELECTRON_RUN_AS_NODE;
let application;
let page;
const errors = [];
async function launch() {
  application = await _electron.launch({ args: [resolve(".")], env });
  page = await application.firstWindow();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.waitForSelector(".settings-page, .view-tabs");
  // Exercise copy actions without reading or replacing the user's clipboard.
  await page.evaluate(() => {
    window.__testClipboard = "";
    Object.defineProperty(navigator, "clipboard", { configurable: true,
      value: { writeText: async (text) => { window.__testClipboard = text; } } });
  });
  await application.evaluate(({ dialog }, directory) => {
    dialog.showSaveDialog = async (_window, options) => ({ canceled: false,
      filePath: `${directory}/${options.defaultPath.split(/[\\/]/).pop()}` });
  }, exportDir);
}
try {
  await launch();
  assert.equal(await page.getByRole("heading", { name: "Lotigo", exact: true }).count(), 1);
  assert.equal(await page.getByRole("heading", { name: "Bienvenue dans Lotigo" }).count(), 1);
  assert.match(await page.title(), /^Lotigo/);
  assert.equal(await application.evaluate(({ app }) => app.getPath("userData")), dataDir);
  await page.screenshot({ path: "outputs/premiere-ouverture.png" });
  // Generate the native app icon from the existing Lucide brand mark.
  await mkdir("build", { recursive: true });
  await page.locator(".brand-mark").evaluate((element) => {
    element.style.width = "256px"; element.style.height = "256px";
    element.style.flexShrink = "0"; element.style.background = "#216858"; element.style.color = "white";
    element.querySelector("svg").setAttribute("width", "140"); element.querySelector("svg").setAttribute("height", "140");
  });
  const capture = await page.locator(".brand-mark").screenshot();
  const iconData = await application.evaluate(({ nativeImage }, base64) =>
    nativeImage.createFromBuffer(Buffer.from(base64, "base64")).resize({ width: 256, height: 256 }).toPNG().toString("base64"), capture.toString("base64"));
  const png = Buffer.from(iconData, "base64");
  await page.locator(".brand-mark").evaluate((element) => {
    element.removeAttribute("style"); element.querySelector("svg").setAttribute("width", "26"); element.querySelector("svg").setAttribute("height", "26");
  });
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
  header[6] = png.readUInt32BE(16); header[7] = png.readUInt32BE(20); header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14); header.writeUInt32LE(22, 18);
  const { writeFile } = await import("node:fs/promises");
  await writeFile("build/icon.ico", Buffer.concat([header, png]));
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page.getByRole("textbox", { name: "Lieu de remise en main propre" }).fill("Bordeaux/Pompignac");
  await page.getByRole("button", { name: "Ouvrir l'application" }).click();
  await page.waitForSelector(".view-tabs");
  await page.getByRole("button", { name: "Fermer le message", exact: true }).click();
  await page.screenshot({ path: "outputs/workspace.png", fullPage: true });
  assert.equal(await page.evaluate(() => typeof window.listingApi.analyzeImage), "function");
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 80; canvas.height = 80;
    const ctx = canvas.getContext("2d"); ctx.fillStyle = "#216858"; ctx.fillRect(0, 0, 80, 80);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.locator('input[type="file"]').setInputFiles({ name: "Lampe-demo.png", mimeType: "image/png", buffer: Buffer.from(image, "base64") });
  await page.getByRole("button", { name: "Generer un exemple", exact: true }).click();
  await page.waitForSelector(".single-export");
  const saved = await page.evaluate(() => window.listingApi.getHistory());
  assert.equal(saved.length, 1); assert.equal(saved[0].demoMode, true);
  await page.getByRole("textbox", { name: "Titre", exact: true }).fill("Titre personnel conserve");
  await page.getByRole("button", { name: /Analyse par lot/ }).click();
  assert.equal(await page.locator(".batch-card .title-field textarea").inputValue(), "Titre personnel conserve");
  const countBefore = (await page.evaluate(() => window.listingApi.getHistory())).length;
  assert.equal(await page.getByRole("button", { name: "Analyser toutes les photos" }).isDisabled(), true);
  assert.equal((await page.evaluate(() => window.listingApi.getHistory())).length, countBefore);
  await page.locator('input[type="file"]').setInputFiles([
    { name: "Chaise-demo.png", mimeType: "image/png", buffer: Buffer.from(image, "base64") },
    { name: "Table-demo.png", mimeType: "image/png", buffer: Buffer.from(image, "base64") }
  ]);
  await page.getByRole("button", { name: "Analyser toutes les photos" }).click();
  await page.getByText("Analyse terminee. Mode demo utilise pour une ou plusieurs images.", { exact: true }).waitFor();
  assert.equal((await page.evaluate(() => window.listingApi.getHistory())).length, 3);
  for (const [label, name] of [["Export HTML", "annonces-leboncoin.html"], ["Export CSV", "annonces-leboncoin.csv"], ["Export XLSX", "annonces-leboncoin.xlsx"]]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    let file;
    for (let attempt = 0; attempt < 100 && !file; attempt += 1) {
      try { file = await readFile(join(exportDir, name)); } catch { await new Promise((done) => setTimeout(done, 100)); }
    }
    assert.ok(file?.length > 0, `${name} must be written`);
    await copyFile(join(exportDir, name), join("outputs", name));
  }
  await page.screenshot({ path: "outputs/analyse-par-lot.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.setViewportSize({ width: 1180, height: 780 });
  await page.getByRole("button", { name: "Copier toutes les annonces", exact: true }).click();
  await page.waitForFunction(() => window.__testClipboard.includes("DEMONSTRATION"));
  const clipboardText = await page.evaluate(() => window.__testClipboard);
  assert.match(clipboardText, /DEMONSTRATION/);
  await page.getByRole("button", { name: /Une annonce/ }).click();
  await page.screenshot({ path: "outputs/application.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: "outputs/application-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1180, height: 780 });
  await page.getByRole("button", { name: "Réglages", exact: true }).click();
  await page.getByLabel("Utiliser la demonstration", { exact: false }).uncheck();
  await page.getByLabel("Clé API OpenAI", { exact: true }).fill("sk-test-cle-fictive-ne-jamais-utiliser");
  assert.equal(await page.getByLabel("Je comprends", { exact: false }).isChecked(), false);
  assert.equal(await page.getByRole("button", { name: "Enregistrer", exact: true }).isDisabled(), true);
  await page.getByLabel("Je comprends", { exact: false }).check();
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page.waitForSelector(".view-tabs");
  const settings = await readFile(join(dataDir, "settings.json"), "utf8");
  assert.ok(!settings.includes("sk-test-cle-fictive"));
  assert.ok(JSON.parse(settings).encryptedApiKey);
  const publicConfig = await page.evaluate(() => window.listingApi.getConfig());
  assert.equal(publicConfig.hasApiKey, true);
  assert.ok(!JSON.stringify(publicConfig).includes("sk-test"));
  await application.close();
  await launch();
  assert.equal(await page.locator(".settings-page").count(), 0);
  assert.equal((await page.evaluate(() => window.listingApi.getConfig())).hasApiKey, true);
  await page.getByRole("button", { name: /Historique/ }).click();
  assert.equal(await page.locator(".saved-listing").count(), 3);
  await page.locator(".saved-listing-open").filter({ hasText: "Titre personnel conserve" }).click();
  assert.equal(await page.getByRole("textbox", { name: "Titre", exact: true }).inputValue(), "Titre personnel conserve");
  await page.getByRole("button", { name: /Historique/ }).click();
  await page.locator(".delete-history").first().click();
  await page.getByRole("button", { name: "Supprimer", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll(".saved-listing").length === 2);
  assert.equal((await page.evaluate(() => window.listingApi.getHistory())).length, 2);
  await application.evaluate(() => {
    globalThis.__apiRequests = 0;
    globalThis.fetch = async () => {
      globalThis.__apiRequests += 1;
      return new Response(JSON.stringify({ error: { message: "test quota", type: "insufficient_quota", code: "insufficient_quota" } }),
        { status: 429, headers: { "content-type": "application/json" } });
    };
  });
  const quotaResults = await page.evaluate(async (request) => [await window.listingApi.analyzeImage(request), await window.listingApi.analyzeImage(request)],
    { imageDataUrl: `data:image/png;base64,${image}`, fileName: "Quota-demo.png", mimeType: "image/png" });
  assert.ok(quotaResults.every((result) => result.demoMode && result.demoReason === "quota"));
  assert.equal(await application.evaluate(() => globalThis.__apiRequests), 1);
  await page.getByRole("button", { name: "Réglages", exact: true }).click();
  await page.getByLabel("Clé API OpenAI", { exact: true }).fill("sk-test-remplacement-a-retirer");
  await page.getByText("Compte et options avancées", { exact: true }).click();
  await page.getByLabel("Retirer la clé enregistrée", { exact: false }).check();
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page.waitForSelector(".view-tabs");
  assert.equal((await page.evaluate(() => window.listingApi.getConfig())).hasApiKey, false);
  await page.evaluate(() => window.listingApi.saveSettings({
    apiKey: "sk-test-remplacement-a-retirer", clearApiKey: true, model: "gpt-5.5", demoMode: true, handoverLocation: ""
  }));
  assert.equal((await page.evaluate(() => window.listingApi.getConfig())).hasApiKey, false);
  assert.ok(!JSON.parse(await readFile(join(dataDir, "settings.json"), "utf8")).encryptedApiKey);
  assert.deepEqual(errors, []);
  console.log("OK: onboarding, sandboxed preload, demo, single/batch sync, exports, responsive layout, encrypted key, restart, history deletion. No API calls.");
} finally {
  if (application) await application.close().catch(() => {});
}
