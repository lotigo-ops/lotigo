import { createRequire } from "node:module";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const asar = require("@electron/asar");
const path = "release/win-unpacked/resources/app.asar";
const files = asar.listPackage(path).map((name) => name.replace(/\\/g, "/"));
for (const name of ["/out/main/index.js", "/out/preload/index.cjs", "/out/renderer/index.html"]) {
  assert.ok(files.includes(name), `Missing entry ${name}`);
}
assert.ok(!files.some((name) => /^\/(\.env|work|outputs|settings\.json|listing-history\.json)(\/|$)/.test(name)));
async function checkCompiledDirectory(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const name = join(directory, item.name);
    if (item.isDirectory()) await checkCompiledDirectory(name);
    else assert.ok(asar.extractFile(path, name).equals(await readFile(name)), `Packaged file must match current build: ${name}`);
  }
}
await checkCompiledDirectory("out");
const content = await readFile(path);
try {
  const dotenv = require("dotenv");
  const key = dotenv.parse(await readFile(".env")).OPENAI_API_KEY;
  if (key) assert.ok(!content.includes(Buffer.from(key)), "Developer key must not be packaged");
} catch (error) { if (error.code !== "ENOENT") throw error; }
console.log("OK: correct Electron entries, all compiled files match, no developer key or local history in package.");
