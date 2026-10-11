import { cp, lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function prepareGitHubSite(repository) {
  if (!/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(repository ?? "")) {
    throw new Error("Indiquez le depot GitHub sous la forme compte/projet.");
  }
  const { version } = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const source = join(root, "website");
  const destination = join(root, "release", "github-pages");
  const releaseUrl = `https://github.com/${repository}/releases/download/v${encodeURIComponent(version)}`;
  let html = await readFile(join(source, "index.html"), "utf8");
  for (const name of ["lotigo-setup.exe", "lotigo-source.zip", "SHA256SUMS.txt"]) {
    const localLink = `"downloads/${name}"`;
    if (!html.includes(localLink)) throw new Error(`Lien de telechargement absent : ${name}`);
    html = html.replaceAll(localLink, `"${releaseUrl}/${name}"`);
  }
  await mkdir(destination, { recursive: true });
  await writeFile(join(destination, "index.html"), html);
  for (const name of ["app.js", "style.css", "assets"]) {
    await cp(join(source, name), join(destination, name), {
      recursive: true,
      filter: async (path) => !(await lstat(path)).isSymbolicLink()
    });
  }
  await writeFile(join(destination, ".nojekyll"), "");
  return { destination, releaseUrl };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await prepareGitHubSite(process.argv[2] ?? process.env.GITHUB_REPOSITORY);
  console.log(`Site GitHub Pages prepare : ${result.destination}`);
  console.log(`Telechargements : ${result.releaseUrl}`);
}
