import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
await mkdir("outputs", { recursive: true });
await build({ entryPoints: ["tests/core.test.ts"], outfile: "outputs/core.test.mjs", bundle: true, platform: "node", format: "esm", packages: "external" });
const result = spawnSync(process.execPath, ["--test", "outputs/core.test.mjs"], { stdio: "inherit" });
process.exitCode = result.status ?? 1;
