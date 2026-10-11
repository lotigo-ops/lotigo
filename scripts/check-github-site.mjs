import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { prepareGitHubSite } from "./prepare-github-site.mjs";

const localHtml = await readFile("website/index.html", "utf8");
async function readLocalHashes() {
  try { return await readFile("website/downloads/SHA256SUMS.txt", "utf8"); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}
const localHashes = await readLocalHashes();
const { version, scripts } = JSON.parse(await readFile("package.json", "utf8"));
assert.ok(scripts.dist.endsWith("--publish never"), "Installer builds must not publish implicitly");
await assert.rejects(() => prepareGitHubSite("wrong owner/project"));
const { destination, releaseUrl } = await prepareGitHubSite("lotigo-ops/lotigo");
assert.equal(releaseUrl, `https://github.com/lotigo-ops/lotigo/releases/download/v${version}`);
const html = await readFile(join(destination, "index.html"), "utf8");
assert.ok(!html.includes('"downloads/'));
for (const name of ["lotigo-setup.exe", "lotigo-source.zip", "SHA256SUMS.txt"]) {
  assert.ok(html.includes(`href="${releaseUrl}/${name}"`));
}
assert.deepEqual((await readdir(destination)).sort(), [".nojekyll", "app.js", "assets", "index.html", "style.css"]);
for (const name of ["app.js", "style.css", "assets/workspace.png", "assets/objets-hero-v3.webp"]) {
  assert.deepEqual(await readFile(join(destination, name)), await readFile(join("website", name)));
}
assert.equal(await readFile("website/index.html", "utf8"), localHtml);
assert.equal(await readLocalHashes(), localHashes);
console.log("OK: GitHub Pages output, versioned release links, local assets and unchanged local site. No credentials or installer in the Pages output.");
