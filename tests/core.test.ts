import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import ExcelJS from "exceljs";
import { isDemoHistoryItem } from "../src/shared/history";
import { createQueue, readJson, writeJson } from "../src/main/storage";
import { validateAnalysis, validateImageRequest } from "../src/shared/validation";
import { buildCsvExport, buildHtmlExport, buildXlsxExport, emptyAnalysis, getFullListingText, normalizeAnalysis } from "../src/renderer/src/exports";

test("concurrent history edits and a rejected operation do not lose data", async () => {
  const folder = await mkdtemp(join(tmpdir(), "annonces-test-"));
  const path = join(folder, "history.json");
  const queue = createQueue();
  try {
    await writeJson(path, []);
    await Promise.all(Array.from({ length: 25 }, (_, i) => queue(async () => {
      const rows = await readJson<number[]>(path, []);
      await writeJson(path, [...rows, i]);
    })));
    await assert.rejects(queue(async () => { throw new Error("test failure"); }));
    assert.equal((await queue(() => readJson<number[]>(path, []))).length, 25);
    assert.equal(new Set(await readJson<number[]>(path, [])).size, 25);
  } finally { await rm(folder, { recursive: true, force: true }); }
});

test("structured results and image inputs reject malformed data", () => {
  assert.equal(validateAnalysis(emptyAnalysis), emptyAnalysis);
  assert.throws(() => validateAnalysis({ ...emptyAnalysis, prix_recommande: -1 }));
  assert.throws(() => validateAnalysis({ ...emptyAnalysis, prix_min: Infinity }));
  assert.throws(() => validateAnalysis({ ...emptyAnalysis, points_a_verifier: [42] }));
  assert.throws(() => validateImageRequest({ imageDataUrl: 'data:image/svg+xml;base64,PHN2Zz4=', fileName: "x.svg" }));
});

test("legacy listings migrate and a cleared buyer description stays cleared", () => {
  assert.ok(isDemoHistoryItem({ model: "gpt-5.5", analysis: { ...emptyAnalysis, notes_internes: "Mode demo genere a partir du nom de fichier photo.jpg" } } as never));
  assert.equal(isDemoHistoryItem({ model: "gpt-5.5", analysis: emptyAnalysis } as never), false);
  const legacy = { ...emptyAnalysis, description_acheteur: undefined, description: "ancien texte" };
  assert.equal(normalizeAnalysis(legacy as never).description_acheteur, "ancien texte");
  assert.equal(normalizeAnalysis({ ...emptyAnalysis, description: "ancien texte" }).description_acheteur, "");
  const text = getFullListingText({ ...emptyAnalysis, titre: "Objet", prix_recommande: 12.5, notes_internes: "PRIVE" }, "Lyon");
  assert.match(text, /Lyon/); assert.match(text, /12,5/); assert.ok(!text.includes("PRIVE")); assert.ok(!text.includes("Bordeaux"));
  assert.ok(!getFullListingText(emptyAnalysis, "").includes("Remise"));
});

test("HTML escapes user fields and CSV neutralizes spreadsheet formulas", () => {
  const items = [{ imageDataUrl: "data:image/png;base64,AAAA", fileName: "image.png", status: "done", demoMode: true,
    analysis: { ...emptyAnalysis, titre: '=HYPERLINK("x")', description_acheteur: '<script>alert(1)</script>' } }];
  assert.match(buildCsvExport(items), /'=HYPERLINK/);
  assert.match(buildCsvExport(items), /oui - resultat fictif/);
  assert.ok(!buildHtmlExport(items).includes("<script>"));
  assert.match(buildHtmlExport(items), /Demonstration/);
});

test("Excel export opens with 200 long listings, numeric prices and text formulas", async () => {
  const items = Array.from({ length: 200 }, (_, index) => ({ imageDataUrl: "", fileName: `${index}.jpg`, status: "done",
    analysis: { ...emptyAnalysis, titre: "=1+1", description_acheteur: "description ".repeat(150), prix_recommande: 24.5 } }));
  const data = await buildXlsxExport(items);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(data) as never);
  assert.equal(workbook.worksheets[0].rowCount, 201);
  assert.equal(workbook.worksheets[0].getCell("E2").value, 24.5);
  assert.equal(workbook.worksheets[0].getCell("B2").value, "=1+1");
});
