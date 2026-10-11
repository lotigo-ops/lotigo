import JSZip from "jszip";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import dotenv from "dotenv";

const zip = await JSZip.loadAsync(await readFile("release/lotigo-source.zip"));
const names = Object.keys(zip.files);
for (const name of ["package.json", "package-lock.json", "LICENSE", "src/main/index.ts", "docs/GUIDE_UTILISATEUR.md"]) {
  assert.ok(zip.file(name), `Missing source file: ${name}`);
}
assert.ok(!names.some((name) => /(^|\/)(node_modules|release|outputs|work|downloads)(\/|$)/.test(name)));
assert.ok(!names.some((name) => /(^|\/)(settings\.json|listing-history\.json|\.env(?!\.example$)[^/]*)(\/|$)/.test(name)));
const example = dotenv.parse(await zip.file(".env.example").async("string"));
assert.equal(example.OPENAI_API_KEY, "");
let key;
try { key = dotenv.parse(await readFile(".env")).OPENAI_API_KEY; }
catch (error) { if (error.code !== "ENOENT") throw error; }
if (key) {
  for (const file of Object.values(zip.files)) {
    if (!file.dir) assert.ok(!(await file.async("nodebuffer")).includes(Buffer.from(key)), "Developer key must not be in sources");
  }
}
console.log("OK: source archive complete, empty example key, no local data, build outputs or developer key.");
