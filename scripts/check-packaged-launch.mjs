import { _electron } from "playwright";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const pkg = JSON.parse(await readFile("package.json", "utf8"));
const directory = join(process.env.APPDATA, pkg.name);
async function businessFiles() {
  return Promise.all(["settings.json", "listing-history.json"].map(async (name) => {
    try { return await readFile(join(directory, name), "utf8"); }
    catch (error) { if (error.code === "ENOENT") return null; throw error; }
  }));
}
// Only open and close the packaged app: never change preferences or run an analysis.
const before = await businessFiles();
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
let application;
try {
  application = await _electron.launch({ executablePath: resolve("release", "win-unpacked", `${pkg.build.productName}.exe`), env });
  const page = await application.firstWindow();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.waitForSelector(".settings-page, .view-tabs");
  assert.equal(await application.evaluate(({ app }) => app.isPackaged), true);
  assert.equal(await application.evaluate(({ app }) => app.getPath("userData")), directory);
  assert.equal(await page.getByRole("heading", { name: "Lotigo", exact: true }).count(), 1);
  assert.match(await page.title(), /^Lotigo/);
  const preferences = await application.evaluate(({ BrowserWindow }) => {
    const prefs = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
    return { sandbox: prefs.sandbox, contextIsolation: prefs.contextIsolation, nodeIntegration: prefs.nodeIntegration };
  });
  assert.deepEqual(preferences, { sandbox: true, contextIsolation: true, nodeIntegration: false });
  const config = await page.evaluate(() => window.listingApi.getConfig());
  assert.equal(config.version, pkg.version);
  assert.notEqual(config.keySource, "env");
  assert.equal(Object.hasOwn(config, "apiKey"), false);
  assert.deepEqual(errors, []);
} finally {
  if (application) await application.close();
}
assert.deepEqual(await businessFiles(), before, "Opening the packaged app must not modify settings or history");
console.log("OK: packaged executable launches, sandboxed preload works, development .env ignored, settings and history unchanged. No API calls.");
