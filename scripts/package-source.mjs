import JSZip from "jszip";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
const zip = new JSZip();
const rootFiles = ["package.json", "package-lock.json", "electron.vite.config.ts", "tsconfig.json", "tsconfig.node.json", "tsconfig.web.json", ".env.example", ".gitignore", "README.md", "LICENSE", "CONTRIBUTING.md"];
async function addDirectory(path) {
  for (const item of await readdir(path, { withFileTypes: true })) {
    if (item.isSymbolicLink() || item.name === "downloads" || item.name.startsWith(".env")) continue;
    const name = `${path}/${item.name}`;
    if (item.isDirectory()) await addDirectory(name);
    else zip.file(name, await readFile(name));
  }
}
for (const name of rootFiles) zip.file(name, await readFile(name));
for (const folder of ["src", "scripts", "tests", "docs", "build", "website", ".github"]) await addDirectory(folder);
await mkdir("release", { recursive: true });
const output = join("release", "lotigo-source.zip");
await writeFile(output, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
console.log(`Sources ouvertes : ${output}. Les cles et donnees locales sont exclues.`);
