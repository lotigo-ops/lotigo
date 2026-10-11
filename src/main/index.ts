import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, shell } from "electron";
import type { IpcMainInvokeEvent } from "electron";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import OpenAI from "openai";
import type { AnalyzeImageRequest, AnalyzeImageResponse, ExportRequest, HelpTopic, HistoryItem, ListingAnalysis, SettingsRequest } from "../shared/types";
import { validateAnalysis, validateImageRequest } from "../shared/validation";
import { isDemoHistoryItem } from "../shared/history";
import { getApiKey, getConfig, loadSettings, saveSettings, validateConnectionInput } from "./settings";
import { createQueue, readJson, writeJson } from "./storage";

// Keep the original data directory when the public product name changes.
const userDataDirectory = !app.isPackaged && process.env.ANNONCES_TEST_DATA_DIR ||
  join(app.getPath("appData"), "leboncoin-photo-assistant");
mkdirSync(userDataDirectory, { recursive: true });
app.setPath("userData", userDataDirectory);
if (!app.isPackaged) dotenv.config({ path: join(app.getAppPath(), ".env") });

const historyFileName = "listing-history.json";
const historyQueue = createQueue();
let activeWrites = 0;
async function historyWrite<T>(operation: () => Promise<T>): Promise<T> {
  activeWrites += 1;
  try { return await historyQueue(operation); }
  finally { activeWrites -= 1; }
}
const analysisQueue = createQueue();
let quotaExhausted = false;
const helpUrls: Record<HelpTopic, string> = {
  keys: "https://platform.openai.com/api-keys",
  billing: "https://platform.openai.com/settings/organization/billing/overview",
  usage: "https://platform.openai.com/usage",
  privacy: "https://developers.openai.com/api/docs/guides/your-data"
};

function assertTrustedSender(event: IpcMainInvokeEvent): void {
  const url = event.senderFrame?.url;
  const allowedUrl = !app.isPackaged && process.env.ELECTRON_RENDERER_URL ||
    pathToFileURL(join(__dirname, "../renderer/index.html")).href;
  if (!url || event.senderFrame !== event.sender.mainFrame ||
    (url !== allowedUrl && url !== `${allowedUrl}/`)) throw new Error("Acces refuse.");
}

const listingSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    objet_detecte: {
      type: "string",
      description: "Nom court de l'objet principal visible sur la photo."
    },
    marque: {
      type: "string",
      description: "Marque visible ou probable. Utiliser une chaine vide si inconnue."
    },
    modele: {
      type: "string",
      description: "Modele, reference ou version visible ou probable. Utiliser une chaine vide si inconnu."
    },
    categorie_leboncoin_probable: {
      type: "string",
      description: "Categorie Leboncoin la plus probable pour l'annonce."
    },
    titre: {
      type: "string",
      description: "Titre d'annonce clair, naturel, sans exageration, en francais."
    },
    description_acheteur: {
      type: "string",
      description:
        "Description courte et naturelle a copier dans Leboncoin. Ne pas mentionner l'IA, l'analyse, la photo, le prix estime, les incertitudes ou les conseils au vendeur."
    },
    notes_internes: {
      type: "string",
      description:
        "Notes reservees au vendeur: incertitudes, points a confirmer, defauts potentiels, raison du prix recommande."
    },
    etat_probable: {
      type: "string",
      description: "Etat probable de l'objet d'apres la photo, par exemple neuf, tres bon etat, bon etat, etat correct, a verifier."
    },
    prix_min: {
      type: "number",
      description: "Estimation basse du prix en euros pour une vente entre particuliers."
    },
    prix_max: {
      type: "number",
      description: "Estimation haute du prix en euros pour une vente entre particuliers."
    },
    prix_recommande: {
      type: "number",
      description: "Prix conseille en euros pour attirer des acheteurs tout en restant coherent."
    },
    niveau_confiance: {
      type: "string",
      description: "Niveau de confiance de l'analyse: eleve, moyen ou faible."
    },
    points_a_verifier: {
      type: "array",
      description: "Points que le vendeur devrait verifier avant publication.",
      items: {
        type: "string"
      }
    }
  },
  required: [
    "objet_detecte",
    "marque",
    "modele",
    "categorie_leboncoin_probable",
    "titre",
    "description_acheteur",
    "notes_internes",
    "etat_probable",
    "prix_min",
    "prix_max",
    "prix_recommande",
    "niveau_confiance",
    "points_a_verifier"
  ]
};

function createDemoAnalysis(request: AnalyzeImageRequest): ListingAnalysis {
  const cleanedName = request.fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
  const objectName = cleanedName || "Objet d'occasion";

  return {
    objet_detecte: objectName,
    marque: "",
    modele: "",
    categorie_leboncoin_probable: "Maison / Equipement",
    titre: `${objectName} - bon etat`,
    description_acheteur:
      `${objectName} en bon etat general. Objet propre et pret a etre utilise. Ideal pour une seconde vie a petit prix.`,
    notes_internes:
      `Mode demo genere a partir du nom de fichier ${request.fileName}. Verifier la marque, le modele, les dimensions, l'etat exact et comparer le prix avec des annonces similaires.`,
    etat_probable: "Bon etat, a verifier",
    prix_min: 10,
    prix_max: 40,
    prix_recommande: 25,
    niveau_confiance: "faible",
    points_a_verifier: [
      "Verifier la marque et le modele",
      "Controler l'etat exact",
      "Comparer le prix avec des annonces similaires"
    ]
  };
}

function isInsufficientQuotaError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const apiError = error as {
    status?: number;
    code?: string | null;
    type?: string | null;
    error?: {
      code?: string | null;
      type?: string | null;
    };
  };

  const code = apiError.code ?? apiError.error?.code;
  const type = apiError.type ?? apiError.error?.type;
  return apiError.status === 429 && (code === "insufficient_quota" || type === "insufficient_quota");
}

function getOpenAIErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const apiError = error as {
      status?: number;
      code?: string | null;
      type?: string | null;
      error?: {
        code?: string | null;
        type?: string | null;
        message?: string;
      };
      message?: string;
    };

    const code = apiError.code ?? apiError.error?.code;
    const type = apiError.type ?? apiError.error?.type;

    if (apiError.status === 429 && (code === "insufficient_quota" || type === "insufficient_quota")) {
      return "Quota OpenAI insuffisant pour ce projet API. Vérifiez la facturation, les crédits ou utilisez une clé API rattachée à un projet avec du quota.";
    }

    if (apiError.status === 429) {
      return "Limite OpenAI atteinte. Patientez quelques instants, puis relancez l'analyse.";
    }

    if (apiError.status === 401) {
      return "Cle API OpenAI invalide ou non autorisee. Remplacez-la dans les reglages.";
    }

    if (apiError.status === 403) return "Ce projet OpenAI n'autorise pas cette operation. Verifiez les permissions de la cle.";
    if (apiError.status === 404) return "Ce modele est indisponible pour votre projet. Verifiez son identifiant dans les reglages.";
    if (apiError.status) return `OpenAI est indisponible (erreur ${apiError.status}). Reessayez plus tard.`;
  }

  return "Analyse impossible. Verifiez votre connexion Internet, puis reessayez.";
}

function getHistoryFilePath(): string {
  return join(app.getPath("userData"), historyFileName);
}

async function readHistory(): Promise<HistoryItem[]> {
  const history = await readJson<HistoryItem[]>(getHistoryFilePath(), []);
  if (!Array.isArray(history)) throw new Error("Historique illisible. Le fichier original a ete conserve.");
  return history.map((item) => ({ ...item, demoMode: isDemoHistoryItem(item) }));
}

async function saveHistoryItem(request: AnalyzeImageRequest, analysis: ListingAnalysis, demoMode: boolean): Promise<HistoryItem> {
  const item: HistoryItem = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    model: demoMode ? "demonstration" : getConfig().model,
    imageDataUrl: request.imageDataUrl,
    fileName: request.fileName,
    mimeType: request.mimeType,
    analysis,
    demoMode
  };

  await historyWrite(async () => {
    const history = await readHistory();
    await writeJson(getHistoryFilePath(), [item, ...history]);
  });
  return item;
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 680,
    minHeight: 540,
    show: false,
    title: "Lotigo",
    backgroundColor: "#f5f7f8",
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event) => event.preventDefault());
  mainWindow.on("close", (event) => {
    if (activeAnalyses > 0 || activeWrites > 0) {
      event.preventDefault();
      void mainWindow.webContents.executeJavaScript("window.dispatchEvent(new Event('analysis-close-blocked'))");
    }
  });

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

ipcMain.handle("app:getConfig", (event) => { assertTrustedSender(event); return getConfig(); });
ipcMain.handle("app:saveSettings", async (event, request: SettingsRequest) => {
  assertTrustedSender(event);
  if (activeAnalyses > 0) throw new Error("Attendez la fin de l'analyse avant de modifier la connexion.");
  activeWrites += 1;
  let config;
  try { config = await saveSettings(request); }
  finally { activeWrites -= 1; }
  quotaExhausted = false;
  return config;
});
ipcMain.handle("app:testConnection", async (event, input: { apiKey?: string; model: string }) => {
  assertTrustedSender(event);
  validateConnectionInput(input?.apiKey, input?.model);
  const apiKey = input.apiKey?.trim() || getApiKey();
  if (!apiKey) throw new Error("Ajoutez une cle API avant de tester la connexion.");
  try {
    const openai = new OpenAI({ apiKey, baseURL: "https://api.openai.com/v1",
      logLevel: "off", maxRetries: 0, timeout: 20000 });
    await openai.models.retrieve(input.model);
    return "Cle et acces au modele verifies. Verifiez aussi vos credits sur OpenAI avant l'analyse.";
  } catch (error) { throw new Error(getOpenAIErrorMessage(error)); }
});
ipcMain.handle("app:openHelp", async (event, topic: HelpTopic) => {
  assertTrustedSender(event);
  if (!Object.prototype.hasOwnProperty.call(helpUrls, topic)) throw new Error("Lien inconnu.");
  await shell.openExternal(helpUrls[topic]);
});
ipcMain.handle("app:saveExport", async (event, request: ExportRequest) => {
  assertTrustedSender(event);
  if (!request || !/^[a-zA-Z0-9_-]+\.(html|csv|xlsx)$/.test(request.fileName) ||
    !(typeof request.content === "string" || request.content instanceof Uint8Array) || request.content.length > 50 * 1024 * 1024) {
    throw new Error("Fichier d'export invalide ou trop volumineux.");
  }
  const format = request.fileName.split(".").pop()!;
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) throw new Error("Fenetre indisponible.");
  activeWrites += 1;
  try {
  const result = await dialog.showSaveDialog(window, {
    title: "Exporter les annonces", defaultPath: join(app.getPath("downloads"), request.fileName),
    filters: [{ name: format.toUpperCase(), extensions: [format] }]
  });
  if (result.canceled || !result.filePath) return false;
  await writeFile(result.filePath, request.content);
  return true;
  } finally { activeWrites -= 1; }
});

ipcMain.handle("history:list", async (event): Promise<HistoryItem[]> => { assertTrustedSender(event); return historyQueue(readHistory); });

ipcMain.handle("history:updateItem", async (event, id: string, analysis: ListingAnalysis): Promise<HistoryItem[]> => {
  assertTrustedSender(event);
  validateAnalysis(analysis);
  return historyWrite(async () => {
    const history = await readHistory();
    const updatedHistory = history.map((item) => (item.id === id ? { ...item, analysis } : item));
    await writeJson(getHistoryFilePath(), updatedHistory);
    return updatedHistory;
  });
});
ipcMain.handle("history:deleteItem", async (event, id: string): Promise<HistoryItem[]> => {
  assertTrustedSender(event);
  return historyWrite(async () => {
    const history = (await readHistory()).filter((item) => item.id !== id);
    await writeJson(getHistoryFilePath(), history);
    return history;
  });
});

let activeAnalyses = 0;
ipcMain.handle("listing:analyzeImage", async (event, request: AnalyzeImageRequest): Promise<AnalyzeImageResponse> => {
  assertTrustedSender(event);
  validateImageRequest(request);
  if (nativeImage.createFromDataURL(request.imageDataUrl).isEmpty()) throw new Error("Cette image ne peut pas etre lue.");
  activeAnalyses += 1;
  try { return await analysisQueue(() => analyzeImage(request)); }
  finally { activeAnalyses -= 1; }
});

async function analyzeImage(request: AnalyzeImageRequest): Promise<AnalyzeImageResponse> {
  const config = getConfig();
  const apiKey = config.demoMode ? "" : getApiKey();

  if (!apiKey || quotaExhausted) {
    const analysis = createDemoAnalysis(request);
    const item = await saveHistoryItem(request, analysis, true);
    return { item, demoMode: true, demoReason: quotaExhausted ? "quota" : config.hasApiKey ? "selected" : "no_key" };
  }

  try {
    const openai = new OpenAI({ apiKey, baseURL: "https://api.openai.com/v1",
      logLevel: "off", maxRetries: 0, timeout: 90000 });
    const response = await openai.responses.create({
      model: config.model,
      store: false,
      input: [
        {
          role: "system",
          content:
            "Tu aides un vendeur francais a preparer une annonce Leboncoin a partir d'une photo. Separe strictement le texte acheteur des notes internes. La description_acheteur doit etre directement publiable: pas de preambule, pas de mention de l'image, pas de mention d'IA, pas de prix estime, pas de conseil au vendeur, pas d'incertitude visible. Les incertitudes, points a verifier, defauts potentiels et raisons du prix vont dans notes_internes et points_a_verifier."
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Analyse cette photo d'un objet a vendre. Genere un titre court, une description_acheteur simple et honnete pour Leboncoin, des notes_internes pour le vendeur, une categorie probable, l'etat, une estimation de prix en euros, un niveau de confiance et les points a verifier. N'invente pas de marque, modele ou etat non visible. Ne propose pas de publication automatique."
            },
            {
              type: "input_image",
              image_url: request.imageDataUrl,
              detail: "auto"
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "leboncoin_listing_analysis",
          schema: listingSchema,
          strict: true
        }
      }
    });

    if (response.status === "incomplete") {
      throw new Error("La reponse OpenAI est incomplete. Essayez avec une image plus legere ou relancez l'analyse.");
    }

    const content = response.output_text;
    if (!content) {
      throw new Error("OpenAI n'a pas renvoye de contenu exploitable.");
    }

    const analysis = validateAnalysis(JSON.parse(content));
    const item = await saveHistoryItem(request, analysis, false);
    return { item, demoMode: false };
  } catch (error) {
    if (isInsufficientQuotaError(error)) {
      quotaExhausted = true;
      const analysis = createDemoAnalysis(request);
      const item = await saveHistoryItem(request, analysis, true);
      return { item, demoMode: true, demoReason: "quota" };
    }

    if (error instanceof OpenAI.APIError || error instanceof OpenAI.APIConnectionError) {
      throw new Error(getOpenAIErrorMessage(error));
    }
    if (error instanceof SyntaxError) throw new Error("OpenAI a renvoye un resultat illisible. Relancez cette image.");
    throw error;
  }
}

const hasInstanceLock = app.requestSingleInstanceLock();
if (!hasInstanceLock) app.quit();
app.on("second-instance", () => {
  const window = BrowserWindow.getAllWindows()[0];
  if (window?.isMinimized()) window.restore();
  window?.focus();
});
app.whenReady().then(async () => {
  if (!hasInstanceLock) return;
  Menu.setApplicationMenu(null);
  await loadSettings();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch(() => {
  dialog.showErrorBox("Ouverture impossible", "Les reglages locaux n'ont pas pu etre lus. Les fichiers ont ete conserves. Consultez le guide de recuperation fourni avec le projet.");
  app.quit();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
