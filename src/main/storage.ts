import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw new Error("Impossible de lire les donnees locales. Le fichier a ete conserve pour recuperation.");
  }
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  try {
    await mkdir(dirname(path), { recursive: true });
    const temporaryPath = `${path}.${randomUUID()}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(value), { encoding: "utf8", mode: 0o600 });
    await rename(temporaryPath, path);
  } catch {
    throw new Error("Enregistrement local impossible. Verifiez l'espace disponible et les droits d'acces au dossier de l'application.");
  }
}

// Every read-modify-write operation shares one queue to preserve rapid edits.
export function createQueue(): <T>(operation: () => Promise<T>) => Promise<T> {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(operation: () => Promise<T>): Promise<T> => {
    const result = tail.then(operation);
    tail = result.catch(() => undefined);
    return result;
  };
}
