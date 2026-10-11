import { app, safeStorage } from "electron";
import { join } from "node:path";
import type { AppConfig, SettingsRequest } from "../shared/types";
import { createQueue, readJson, writeJson } from "./storage";

type SavedSettings = {
  encryptedApiKey?: string;
  model: string;
  demoMode: boolean;
  onboardingComplete: boolean;
  handoverLocation: string;
};

const defaults: SavedSettings = {
  model: process.env.OPENAI_MODEL || "gpt-5.5",
  demoMode: false,
  onboardingComplete: false,
  handoverLocation: ""
};
let settings = { ...defaults };
const queue = createQueue();

export function encryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable() &&
    (process.platform !== "linux" || safeStorage.getSelectedStorageBackend() !== "basic_text");
}

export async function loadSettings(): Promise<void> {
  settings = { ...defaults, model: process.env.OPENAI_MODEL || defaults.model,
    ...await readJson<Partial<SavedSettings>>(join(app.getPath("userData"), "settings.json"), {}) };
}

export function getApiKey(): string {
  if (settings.encryptedApiKey) {
    try {
      return safeStorage.decryptString(Buffer.from(settings.encryptedApiKey, "base64"));
    } catch {
      throw new Error("La cle enregistree ne peut plus etre lue. Saisissez une nouvelle cle dans les reglages.");
    }
  }
  return app.isPackaged ? "" : process.env.OPENAI_API_KEY?.trim() || "";
}

export function getConfig(): AppConfig {
  let hasApiKey = false;
  try { hasApiKey = Boolean(getApiKey()); } catch { /* Settings remain accessible to replace an unreadable key. */ }
  return {
    hasApiKey,
    model: settings.model,
    version: app.getVersion(),
    demoMode: settings.demoMode || !hasApiKey,
    onboardingComplete: settings.onboardingComplete,
    handoverLocation: settings.handoverLocation,
    keySource: settings.encryptedApiKey ? "saved" : hasApiKey ? "env" : "none",
    storageAvailable: encryptionAvailable()
  };
}

export function validateConnectionInput(key: unknown, model: unknown): void {
  if (typeof model !== "string" || !/^[a-zA-Z0-9._:-]{1,100}$/.test(model)) {
    throw new Error("Indiquez un identifiant de modele OpenAI valide.");
  }
  if (key !== undefined && (typeof key !== "string" || key.length > 512 || (key !== "" && !/^sk-[A-Za-z0-9_-]+$/.test(key)))) {
    throw new Error("Collez une cle API OpenAI valide, commencant par sk-.");
  }
}

export async function saveSettings(request: SettingsRequest): Promise<AppConfig> {
  if (!request || typeof request !== "object") throw new Error("Reglages invalides.");
  const apiKey = request.apiKey?.trim();
  validateConnectionInput(apiKey, request.model);
  if (typeof request.demoMode !== "boolean" || typeof request.handoverLocation !== "string" || request.handoverLocation.length > 160) {
    throw new Error("Reglages invalides.");
  }
  return queue(async () => {
    const next = { ...settings, model: request.model, demoMode: request.demoMode,
      handoverLocation: request.handoverLocation.trim(), onboardingComplete: true };
    if (request.clearApiKey) delete next.encryptedApiKey;
    if (apiKey && !request.clearApiKey) {
      if (!encryptionAvailable()) throw new Error("Le stockage protege est indisponible. Vous pouvez utiliser la demonstration.");
      next.encryptedApiKey = safeStorage.encryptString(apiKey).toString("base64");
    }
    if (!next.demoMode && !next.encryptedApiKey && (app.isPackaged || !process.env.OPENAI_API_KEY)) {
      throw new Error("Ajoutez une cle API ou choisissez la demonstration.");
    }
    await writeJson(join(app.getPath("userData"), "settings.json"), next);
    settings = next;
    return getConfig();
  });
}
