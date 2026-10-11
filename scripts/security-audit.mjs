import { _electron } from "playwright";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

// Use only a fake key and an isolated profile; every API request is intercepted.
const directory = await mkdtemp(join(tmpdir(), "lotigo-security-audit-"));
const key = "sk-test-lotigo-audit-fictive-ne-jamais-utiliser";
const env = { ...process.env, ANNONCES_TEST_DATA_DIR: directory };
for (const name of Object.keys(env)) if (name.startsWith("OPENAI_")) delete env[name];
env.OPENAI_API_KEY = "";
env.OPENAI_BASE_URL = "";
env.OPENAI_LOG = "off";
delete env.ELECTRON_RUN_AS_NODE;
let application;
const checks = {};
try {
  application = await _electron.launch({ args: [resolve(".")], env });
  const page = await application.firstWindow();
  await page.waitForSelector(".settings-page");
  assert.equal(await application.evaluate(({ app }) => app.getPath("userData")), directory);
  await application.evaluate(() => {
    globalThis.__auditRequests = [];
    globalThis.__auditFailRequest = false;
    globalThis.fetch = async (url, options) => {
      globalThis.__auditRequests.push({
        host: new URL(url).host,
        hasAuthorization: new Headers(options.headers).has("authorization")
      });
      if (globalThis.__auditFailRequest) {
        return new Response(JSON.stringify({ error: { message: globalThis.__auditErrorFixture,
          type: "invalid_request_error", code: "invalid_api_key" } }),
        { status: 401, headers: { "content-type": "application/json" } });
      }
      if (new URL(url).pathname.endsWith("/responses")) {
        const analysis = { objet_detecte: "Objet fictif", marque: "", modele: "",
          categorie_leboncoin_probable: "", titre: "Titre fictif", description_acheteur: "Description fictive",
          notes_internes: "", etat_probable: "A verifier", prix_min: 10, prix_max: 20,
          prix_recommande: 15, niveau_confiance: "faible", points_a_verifier: [] };
        return new Response(JSON.stringify({ id: "resp_audit", object: "response", status: "completed",
          output: [{ id: "msg_audit", type: "message", role: "assistant", status: "completed",
            content: [{ type: "output_text", text: JSON.stringify(analysis), annotations: [] }] }] }),
          { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({ id: "gpt-5.5", object: "model", created: 0, owned_by: "audit" }),
        { status: 200, headers: { "content-type": "application/json" } });
    };
  });
  const config = await page.evaluate((apiKey) => window.listingApi.saveSettings({ apiKey,
    model: "gpt-5.5", demoMode: false, handoverLocation: "" }), key);
  assert.equal(config.storageAvailable, true);
  const settingsText = await readFile(join(directory, "settings.json"), "utf8");
  const settings = JSON.parse(settingsText);
  assert.ok(settings.encryptedApiKey);
  assert.equal(settingsText.includes(key), false);
  checks.noPlaintextKeyOnDisk = true;
  checks.windowsEncryptionRoundTrip = await application.evaluate(({ safeStorage }, fixture) =>
    safeStorage.decryptString(Buffer.from(fixture.ciphertext, "base64")) === fixture.key,
    { ciphertext: settings.encryptedApiKey, key });
  assert.equal(checks.windowsEncryptionRoundTrip, true);
  assert.deepEqual(Object.keys(config).sort(), ["demoMode", "handoverLocation", "hasApiKey", "keySource",
    "model", "onboardingComplete", "storageAvailable", "version"].sort());
  checks.configExposesOnlyMetadata = true;
  await page.reload();
  await page.waitForSelector(".view-tabs");
  await page.getByRole("button", { name: "Réglages", exact: true }).click();
  assert.equal(await page.getByLabel("Clé API OpenAI", { exact: true }).inputValue(), "");
  await page.getByRole("button", { name: "Afficher la cle", exact: true }).click();
  assert.equal(await page.getByLabel("Clé API OpenAI", { exact: true }).inputValue(), "");
  checks.rendererCannotRevealSavedKey = true;
  await application.evaluate(({ safeStorage }) => {
    globalThis.__auditOriginalEncryption = safeStorage.isEncryptionAvailable;
    safeStorage.isEncryptionAvailable = () => false;
  });
  const unavailable = await page.evaluate(async (apiKey) => {
    try { await window.listingApi.saveSettings({ apiKey, model: "gpt-5.5", demoMode: false, handoverLocation: "" }); return false; }
    catch { return true; }
  }, `${key}-replacement`);
  assert.equal(unavailable, true);
  assert.equal(await readFile(join(directory, "settings.json"), "utf8"), settingsText);
  checks.refusesSaveWithoutEncryption = true;
  await application.evaluate(({ safeStorage }) => {
    safeStorage.isEncryptionAvailable = globalThis.__auditOriginalEncryption;
  });
  await application.evaluate((_electron, fixture) => {
    globalThis.__auditErrorFixture = `Incorrect API key provided: ${fixture}`;
    globalThis.__auditFailRequest = true;
  }, key);
  const errorMessage = await page.evaluate(async () => {
    try { await window.listingApi.testConnection({ model: "gpt-5.5" }); return ""; }
    catch (error) { return error.message; }
  });
  assert.ok(errorMessage.includes("invalide"));
  assert.equal(errorMessage.includes(key), false);
  checks.apiErrorDoesNotEchoKey = true;
  await application.evaluate(() => {
    globalThis.__auditFailRequest = false;
    process.env.OPENAI_BASE_URL = "https://lotigo-security-test.invalid/v1";
    process.env.OPENAI_LOG = "debug";
    globalThis.__auditDebugLogs = 0;
    console.debug = () => { globalThis.__auditDebugLogs += 1; };
  });
  await page.evaluate(() => window.listingApi.testConnection({ model: "gpt-5.5" }));
  const analysisResult = await page.evaluate(async () => {
    const canvas = document.createElement("canvas"); canvas.width = 1; canvas.height = 1;
    return window.listingApi.analyzeImage({ imageDataUrl: canvas.toDataURL("image/png"),
      fileName: "audit-fictif.png", mimeType: "image/png" });
  });
  assert.equal(analysisResult.demoMode, false);
  assert.equal(analysisResult.item.analysis.titre, "Titre fictif");
  const requests = await application.evaluate(() => globalThis.__auditRequests);
  assert.equal(requests.length, 3);
  assert.ok(requests.every((request) => request.hasAuthorization));
  assert.ok(requests.every((request) => request.host === "api.openai.com"));
  checks.endpointOverrideCannotRedirectKey = true;
  assert.equal(await application.evaluate(() => globalThis.__auditDebugLogs), 0);
  checks.environmentCannotEnableDebugLogs = true;
  await application.evaluate(() => { process.env.OPENAI_BASE_URL = ""; process.env.OPENAI_LOG = "off"; });
  await page.evaluate(() => window.listingApi.saveSettings({ clearApiKey: true,
    model: "gpt-5.5", demoMode: true, handoverLocation: "" }));
  assert.equal(Object.hasOwn(JSON.parse(await readFile(join(directory, "settings.json"), "utf8")), "encryptedApiKey"), false);
  checks.keyRemovalDeletesSavedCiphertext = true;
  console.log(JSON.stringify({ isolatedFakeKeyAudit: checks, realApiCalls: 0 }, null, 2));
} finally {
  if (application) await application.close();
}
