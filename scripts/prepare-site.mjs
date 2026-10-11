import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const { version } = JSON.parse(await readFile("package.json", "utf8"));
const installer = `release/Lotigo-${version}-Setup.exe`;
await mkdir("website/downloads", { recursive: true });
const outputs = [
  [installer, "website/downloads/lotigo-setup.exe"],
  ["release/lotigo-source.zip", "website/downloads/lotigo-source.zip"]
];
const hashes = [];
for (const [source, target] of outputs) {
  await copyFile(source, target);
  hashes.push(`${createHash("sha256").update(await readFile(target)).digest("hex")}  ${target.split("/").pop()}`);
}
await writeFile("website/downloads/SHA256SUMS.txt", hashes.join("\n") + "\n");
console.log("Site local prepare dans website/ avec installateur, sources et empreintes SHA-256.");
