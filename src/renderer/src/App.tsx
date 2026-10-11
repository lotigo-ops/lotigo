import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Copy,
  Euro,
  FileImage,
  FileSpreadsheet,
  FileText,
  ImagePlus,
  Loader2,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  Settings,
  History,
  Layers,
  CheckCircle2,
  Search,
  Pause,
  X
} from "lucide-react";
import type { AppConfig, HistoryItem, ListingAnalysis } from "../../shared/types";
import { isDemoHistoryItem } from "../../shared/history";

import { SettingsPanel } from "./SettingsPanel";
import { ListingEditor } from "./ListingEditor";
import { ConfirmDelete } from "./ConfirmDelete";
import { emptyAnalysis, getBuyerDescription, normalizeAnalysis, formatPrice, getFullListingText,
  getExportRows, buildCsvExport, buildHtmlExport, buildXlsxExport, downloadBlob } from "./exports";

type BatchStatus = "pending" | "analyzing" | "done" | "error";

type BatchItem = {
  id: string;
  imageDataUrl: string;
  fileName: string;
  mimeType: string;
  status: BatchStatus;
  analysis: ListingAnalysis;
  error?: string;
  historyId?: string;
  demoMode?: boolean;
};

const acceptedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Lecture impossible de l'image."));
    reader.readAsDataURL(file);
  });
}

async function prepareImage(file: File): Promise<string> {
  if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name} depasse 20 Mo.`);
  const image = new Image();
  image.src = await readFileAsDataUrl(file);
  await image.decode();
  const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Preparation de l'image impossible.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.88);
}


function formatHistoryDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function isAcceptedImage(file: File): boolean {
  const extension = file.name.toLowerCase().split(".").pop();
  return acceptedMimeTypes.has(file.type) || extension === "jpg" || extension === "jpeg" || extension === "png" || extension === "webp";
}

function createBatchId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}


export function App(): JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const batchInputRef = useRef<HTMLInputElement | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [mimeType, setMimeType] = useState("");
  const [analysis, setAnalysis] = useState<ListingAnalysis>(emptyAnalysis);
  const [isDragging, setIsDragging] = useState(false);
  const [isBatchDragging, setIsBatchDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [batchMessage, setBatchMessage] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentHistoryId, setCurrentHistoryId] = useState("");
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [view, setView] = useState<"single" | "batch" | "history">("single");
  const [showSettings, setShowSettings] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [demoResult, setDemoResult] = useState(false);
  const [toast, setToast] = useState("");
  const [deleteId, setDeleteId] = useState("");
  const [exporting, setExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [savingCount, setSavingCount] = useState(0);
  const pendingEdits = useRef(new Map<string, ListingAnalysis>());
  const pendingSaves = useRef(0);
  const pendingExports = useRef(0);
  const selectedHistoryId = useRef("");
  const stopRequested = useRef(false);
  const busyRef = useRef(false);
  const selectedBatchId = useRef("");
  const isBusy = isAnalyzing || isBatchAnalyzing || isImporting || isDeleting;

  const hasResult = useMemo(() => Boolean(analysis.titre || getBuyerDescription(analysis)), [analysis]);
  const dropZoneClass = ["drop-zone", isDragging ? "is-dragging" : "", imageDataUrl ? "has-image" : ""]
    .filter(Boolean)
    .join(" ");
  const batchDropZoneClass = ["batch-drop-zone", isBatchDragging ? "is-dragging" : ""].filter(Boolean).join(" ");
  const completedCount = batchItems.filter((item) => item.status === "done" || item.status === "error").length;
  const doneCount = batchItems.filter((item) => item.status === "done").length;
  const errorCount = batchItems.filter((item) => item.status === "error").length;
  const pendingCount = batchItems.filter((item) => item.status === "pending").length;
  const exportableCount = getExportRows(batchItems).length;

  useEffect(() => {
    window.listingApi
      .getConfig()
      .then(setConfig)
      .catch(() => setError("Connexion a l'application impossible. Fermez puis relancez l'application."));

    window.listingApi
      .getHistory()
      .then((items) =>
        setHistory(
          items.map((item) => ({
            ...item,
            analysis: normalizeAnalysis(item.analysis)
          }))
        )
      )
      .catch(() => setError("L'historique n'a pas pu etre charge. Les donnees existantes sont conservees."));
    const closeBlocked = () => setToast("Une operation est en cours. Attendez la fin de la sauvegarde ou mettez le lot en pause avant de fermer.");
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (busyRef.current || pendingSaves.current > 0 || pendingExports.current > 0) {
        event.preventDefault(); event.returnValue = "";
        closeBlocked();
      }
    };
    window.addEventListener("analysis-close-blocked", closeBlocked);
    window.addEventListener("beforeunload", beforeUnload);
    return () => { window.removeEventListener("analysis-close-blocked", closeBlocked); window.removeEventListener("beforeunload", beforeUnload); };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function handleFiles(files: FileList | File[]): Promise<void> {
    if (busyRef.current) return;
    const acceptedFiles = Array.from(files).filter(isAcceptedImage);
    if (acceptedFiles.length === 0) {
      setError("Ajoutez des images JPG, JPEG, PNG ou WebP.");
      return;
    }

    busyRef.current = true;
    setIsImporting(true);
    try {
    const nextItems: BatchItem[] = [];
    const rejected: string[] = Array.from(files).filter((file) => !isAcceptedImage(file)).map((file) => file.name);
    for (const file of acceptedFiles) {
      try { nextItems.push({
        id: createBatchId(),
        imageDataUrl: await prepareImage(file),
        fileName: file.name,
        mimeType: "image/jpeg",
        status: "pending" as BatchStatus,
        analysis: { ...emptyAnalysis }
      }); } catch { rejected.push(file.name); }
    }
    if (!nextItems.length) { setError("Ces images n'ont pas pu etre lues. Verifiez leur format et leur taille (20 Mo maximum)."); return; }

    const first = nextItems[0];
    setImageDataUrl(first.imageDataUrl);
    setFileName(first.fileName);
    setMimeType(first.mimeType);
    setCurrentHistoryId("");
    selectedHistoryId.current = "";
    selectedBatchId.current = first.id;
    setAnalysis({ ...emptyAnalysis });
    setDemoResult(false);
    if (nextItems.length > 1) setView("batch");
    setBatchItems((current) => [...current, ...nextItems]);
    setBatchMessage("");
    setError(rejected.length ? `${rejected.length} fichier(s) ignore(s) : format non accepte, image illisible ou taille superieure a 20 Mo.` : "");
    } finally { busyRef.current = false; setIsImporting(false); }
  }

  async function analyzeImage(): Promise<void> {
    if (busyRef.current) return;
    if (!imageDataUrl) {
      setError("Ajoutez d'abord une photo de l'objet.");
      return;
    }

    busyRef.current = true;
    setIsAnalyzing(true);
    setBatchItems((items) => items.map((item) => item.id === selectedBatchId.current ? { ...item, status: "analyzing" } : item));
    setError("");

    try {
      const result = await window.listingApi.analyzeImage({
        imageDataUrl,
        fileName,
        mimeType
      });
      const normalized = normalizeAnalysis(result.item.analysis);
      setAnalysis(normalized);
      setCurrentHistoryId(result.item.id);
      selectedHistoryId.current = result.item.id;
      setDemoResult(result.demoMode);
      setBatchItems((items) => items.map((item) => item.id === selectedBatchId.current ? {
        ...item, status: "done", analysis: normalized, historyId: result.item.id, demoMode: result.demoMode
      } : item));
      setHistory((current) => [{ ...result.item, analysis: normalized }, ...current.filter((item) => item.id !== result.item.id)]);
      if (result.demoMode) {
        setToast(result.demoReason === "quota" ? "Credits OpenAI insuffisants : resultat fictif de demonstration." : "Démonstration terminee : ce resultat est fictif.");
      } else {
        setToast("Annonce preparee et sauvegardee.");
      }
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Analyse impossible pour le moment.");
      setBatchItems((items) => items.map((item) => item.id === selectedBatchId.current ? {
        ...item, status: "error", error: currentError instanceof Error ? currentError.message : "Analyse impossible."
      } : item));
    } finally {
      setIsAnalyzing(false);
      busyRef.current = false;
    }
  }

  async function analyzeSingleBatchItem(item: BatchItem): Promise<{ failed: boolean; demo: boolean }> {
    setBatchItems((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id ? { ...currentItem, status: "analyzing", error: undefined } : currentItem
      )
    );

    try {
      const result = await window.listingApi.analyzeImage({
        imageDataUrl: item.imageDataUrl,
        fileName: item.fileName,
        mimeType: item.mimeType
      });
      const normalized = normalizeAnalysis(result.item.analysis);
      setHistory((current) => [{ ...result.item, analysis: normalized }, ...current.filter((historyItem) => historyItem.id !== result.item.id)]);
      setBatchItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? {
                ...currentItem,
                status: "done",
                analysis: normalized,
                historyId: result.item.id,
                demoMode: result.demoMode
              }
            : currentItem
        )
      );
      if (item.id === selectedBatchId.current) {
        setAnalysis(normalized); setCurrentHistoryId(result.item.id); selectedHistoryId.current = result.item.id; setDemoResult(result.demoMode);
      }
      return { failed: false, demo: result.demoMode };
    } catch (currentError) {
      setBatchItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? {
                ...currentItem,
                status: "error",
                error: currentError instanceof Error ? currentError.message : "Erreur d'analyse"
              }
            : currentItem
        )
      );
      return { failed: true, demo: false };
    }
  }

  async function analyzeBatch(): Promise<void> {
    if (busyRef.current) return;
    const queue = batchItems.filter((item) => item.status === "pending" || item.status === "error");
    if (queue.length === 0) {
      setBatchMessage("Aucune photo en attente.");
      return;
    }

    setIsBatchAnalyzing(true);
    busyRef.current = true;
    stopRequested.current = false;
    setBatchMessage("");

    let failures = 0;
    let usedDemo = false;

    for (const item of queue) {
      if (stopRequested.current) break;
      const result = await analyzeSingleBatchItem(item);
      failures += result.failed ? 1 : 0;
      usedDemo = usedDemo || result.demo;
    }

    setIsBatchAnalyzing(false);
    busyRef.current = false;
    if (stopRequested.current) { setBatchMessage("Lot en pause. Les annonces deja préparées sont sauvegardees."); return; }
    if (failures > 0) {
      setBatchMessage(`Analyse terminee avec ${failures} image(s) en erreur.`);
    } else if (usedDemo) {
      setBatchMessage("Analyse terminee. Mode demo utilise pour une ou plusieurs images.");
    } else {
      setBatchMessage("Analyse terminee pour toutes les photos.");
    }
  }

  async function retryBatchItem(id: string): Promise<void> {
    const item = batchItems.find((current) => current.id === id);
    if (!item || busyRef.current) {
      return;
    }
    setIsBatchAnalyzing(true);
    busyRef.current = true;
    const result = await analyzeSingleBatchItem(item);
    setIsBatchAnalyzing(false);
    busyRef.current = false;
    setBatchMessage(result.failed ? "La relance de cette photo a echoue." : "Photo analysee avec succes.");
  }

  function updateField<K extends keyof ListingAnalysis>(key: K, value: ListingAnalysis[K]): void {
    const updatedAnalysis: ListingAnalysis = {
      ...analysis,
      [key]: value
    };
    setAnalysis(updatedAnalysis);
    setBatchItems((items) => items.map((item) => item.id === selectedBatchId.current ? { ...item, analysis: updatedAnalysis } : item));

    if (currentHistoryId) {
      persistHistoryUpdate(currentHistoryId, updatedAnalysis);
    }
  }

  function updateBatchField<K extends keyof ListingAnalysis>(id: string, key: K, value: ListingAnalysis[K]): void {
    const item = batchItems.find((entry) => entry.id === id);
    if (!item || item.status === "analyzing") return;
    const updatedAnalysis = { ...item.analysis, [key]: value };
    setBatchItems((current) => current.map((entry) => entry.id === id ? { ...entry, analysis: updatedAnalysis } : entry));
    if (id === selectedBatchId.current) setAnalysis(updatedAnalysis);
    if (item.historyId) {
      persistHistoryUpdate(item.historyId, updatedAnalysis);
    }
  }

  function persistHistoryUpdate(id: string, updated: ListingAnalysis): void {
    pendingEdits.current.set(id, updated);
    setHistory((items) => items.map((item) => item.id === id ? { ...item, analysis: updated } : item));
    pendingSaves.current += 1;
    setSavingCount(pendingSaves.current);
    void window.listingApi.updateHistoryItem(id, updated).then((items) => {
      if (pendingEdits.current.get(id) === updated) pendingEdits.current.delete(id);
      setHistory(items.map((item) => ({ ...item, analysis: pendingEdits.current.get(item.id) || normalizeAnalysis(item.analysis) })));
    }).catch(() => setError("Une modification n'a pas pu etre sauvegardee. Gardez l'application ouverte et reessayez."))
      .finally(() => { pendingSaves.current -= 1; setSavingCount(pendingSaves.current); });
  }


  async function copyValue(key: string, value: string): Promise<void> {
    const copiedDemo = key === "all-listings" ? getExportRows(batchItems).some((item) => item.demoMode)
      : batchItems.find((item) => key.startsWith(`${item.id}-`))?.demoMode ?? demoResult;
    if (copiedDemo && key !== "all-listings") value = `[DEMONSTRATION - RESULTAT FICTIF]\n${value}`;
    try {
      await navigator.clipboard.writeText(value);
      setToast(copiedDemo ? "Exemple fictif copie." : "Copie dans le presse-papiers.");
    } catch {
      setToast("Copie impossible. Reessayez.");
    }
  }

  function resetAll(): void {
    if (busyRef.current) return;
    setImageDataUrl("");
    setFileName("");
    setMimeType("");
    setAnalysis(emptyAnalysis);
    setCurrentHistoryId("");
    selectedHistoryId.current = "";
    selectedBatchId.current = "";
    setDemoResult(false);
    setError("");
  }

  function resetBatch(): void {
    if (busyRef.current) return;
    setBatchItems([]);
    setBatchMessage("");
    setExpandedItems({});
  }

  function removeBatchItem(id: string): void {
    setBatchItems((current) => current.filter((item) => item.id !== id));
    setExpandedItems((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function restoreHistoryItem(item: HistoryItem): void {
    if (busyRef.current) return;
    setImageDataUrl(item.imageDataUrl);
    setFileName(item.fileName);
    setMimeType(item.mimeType);
    setAnalysis(pendingEdits.current.get(item.id) || normalizeAnalysis(item.analysis));
    setCurrentHistoryId(item.id);
    selectedHistoryId.current = item.id;
    const existing = batchItems.find((entry) => entry.historyId === item.id);
    const id = existing?.id || createBatchId();
    selectedBatchId.current = id;
    setDemoResult(isDemoHistoryItem(item));
    if (!existing) setBatchItems((items) => [...items, { ...item, demoMode: isDemoHistoryItem(item), id, historyId: item.id, status: "done", analysis: normalizeAnalysis(item.analysis) }]);
    setView("single");
    setError("");
  }

  async function exportHtml(): Promise<void> {
    beginExport();
    try { if (await downloadBlob("annonces-leboncoin.html", "text/html;charset=utf-8", buildHtmlExport(batchItems))) setToast("Fichier HTML enregistre."); }
    catch { setError("Export HTML impossible. Verifiez le dossier choisi."); }
    finally { finishExport(); }
  }

  async function exportSingle(format: string): Promise<void> {
    beginExport();
    const item = { imageDataUrl, fileName, status: "done", analysis, demoMode: demoResult };
    try {
      let saved = false;
      if (format === "html") saved = await downloadBlob("annonce.html", "text/html;charset=utf-8", buildHtmlExport([item]));
      if (format === "csv") saved = await downloadBlob("annonce.csv", "text/csv;charset=utf-8", buildCsvExport([item]));
      if (format === "xlsx") saved = await downloadBlob("annonce.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", await buildXlsxExport([item]));
      if (saved) setToast("Annonce exportee.");
    } catch { setError("Export impossible. Reessayez."); }
    finally { finishExport(); }
  }

  async function exportCsv(): Promise<void> {
    beginExport();
    try { if (await downloadBlob("annonces-leboncoin.csv", "text/csv;charset=utf-8", buildCsvExport(batchItems))) setToast("Fichier CSV enregistre."); }
    catch { setError("Export CSV impossible. Verifiez le dossier choisi."); }
    finally { finishExport(); }
  }

  async function exportXlsx(): Promise<void> {
    beginExport();
    try { const saved = await downloadBlob(
      "annonces-leboncoin.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      await buildXlsxExport(batchItems)
    ); if (saved) setToast("Fichier Excel enregistre."); }
    catch { setError("Export Excel impossible. Reessayez ou utilisez l'export CSV."); }
    finally { finishExport(); }
  }

  function beginExport(): void { pendingExports.current += 1; setExporting(true); }
  function finishExport(): void { pendingExports.current -= 1; setExporting(pendingExports.current > 0); }

  async function exportAll(): Promise<void> {
    await exportHtml();
    await exportCsv();
    await exportXlsx();
  }

  function copyAllListings(): void {
    const text = getExportRows(batchItems)
      .map((item) => `${item.demoMode ? "[DEMONSTRATION - RESULTAT FICTIF]\n" : ""}${getFullListingText(item.analysis, config?.handoverLocation)}`)
      .join("\n\n------------------------------\n\n");
    void copyValue("all-listings", text);
  }

  function toggleExpanded(id: string): void {
    setExpandedItems((current) => ({
      ...current,
      [id]: !current[id]
    }));
  }

  async function deleteHistoryItem(): Promise<void> {
    if (busyRef.current) return;
    const id = deleteId;
    busyRef.current = true;
    setIsDeleting(true);
    try {
      const items = await window.listingApi.deleteHistoryItem(id);
      setHistory(items.map((item) => ({ ...item, analysis: normalizeAnalysis(item.analysis) })));
      setBatchItems((items) => items.filter((item) => item.historyId !== id));
      pendingEdits.current.delete(id);
      if (selectedHistoryId.current === id) {
        setImageDataUrl(""); setFileName(""); setMimeType(""); setAnalysis(emptyAnalysis);
        setCurrentHistoryId(""); selectedHistoryId.current = ""; selectedBatchId.current = ""; setDemoResult(false);
      }
      setDeleteId(""); setToast("Photo et annonce supprimees de l'historique.");
    } catch { setError("Suppression impossible. Reessayez."); setDeleteId(""); }
    finally { busyRef.current = false; setIsDeleting(false); }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Lotigo</h1>
          <p>Votre assistant d'annonces par lot pour Leboncoin.</p>
        </div>
        <div className="topbar-actions">
          <span className={config?.demoMode ? "status-pill status-demo" : "status-pill status-done"}>
            {config?.demoMode ? "Démonstration" : "OpenAI connecte"}</span>
          <button type="button" className="secondary-button" onClick={() => setShowSettings(true)} disabled={isBusy || !config}>
            <Settings size={17} />Réglages</button>
        </div>
      </header>
      {savingCount > 0 && <div className="saving-indicator" role="status"><Loader2 size={13} className="spin" />Enregistrement...</div>}
      {isImporting && <p className="batch-message" role="status"><Loader2 size={16} className="spin" />Preparation des photos...</p>}

      {config && (showSettings || !config.onboardingComplete) ? <SettingsPanel config={config}
        onSaved={(next) => { setConfig(next); setShowSettings(false); setToast("Préférences enregistrées."); }}
        onClose={() => setShowSettings(false)} /> : <>
      <nav className="view-tabs" aria-label="Espaces de travail">
        <button className={view === "single" ? "active" : ""} onClick={() => setView("single")} aria-current={view === "single" ? "page" : undefined}><FileImage size={18} />Une annonce</button>
        <button className={view === "batch" ? "active" : ""} onClick={() => setView("batch")} aria-current={view === "batch" ? "page" : undefined}><Layers size={18} />Analyse par lot{batchItems.length > 0 && <span className="tab-count">{batchItems.length}</span>}</button>
        <button className={view === "history" ? "active" : ""} onClick={() => setView("history")} aria-current={view === "history" ? "page" : undefined}><History size={18} />Historique{history.length > 0 && <span className="tab-count">{history.length}</span>}</button>
      </nav>
      {config?.demoMode && (
        <section className="notice" aria-live="polite">
          <AlertCircle size={18} aria-hidden="true" />
          <span>Démonstration : les resultats sont fictifs.</span>
          <button className="ghost-button" onClick={() => setShowSettings(true)} disabled={isBusy}>Connecter OpenAI</button>
        </section>
      )}

      {error && (
        <section className="error" aria-live="assertive">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </section>
      )}

      {view === "single" && <section className="workspace">
        <div className="photo-panel">
          <div
            className={dropZoneClass}
            aria-label="Choisir une photo" aria-disabled={isBusy}
            onClick={() => { if (!isBusy) inputRef.current?.click(); }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              void handleFiles(event.dataTransfer.files);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                inputRef.current?.click();
              }
            }}
          >
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              multiple
            disabled={isBusy}
              onChange={(event) => {
                if (event.target.files) {
                  void handleFiles(event.target.files);
                }
              }}
            />

            {imageDataUrl ? (
              <img src={imageDataUrl} alt="Objet a vendre" />
            ) : (
              <div className="drop-empty">
                <ImagePlus size={42} aria-hidden="true" />
                <strong>Glissez-deposez une ou plusieurs photos</strong>
                <span>ou cliquez pour choisir des images</span>
              </div>
            )}
          </div>

          <div className="photo-actions">
            <div className="file-meta">
              <FileImage size={17} aria-hidden="true" />
              <span>{fileName || "Aucune image selectionnee"}</span>
            </div>
            <div className="button-row">
              <button type="button" className="secondary-button" onClick={() => inputRef.current?.click()} disabled={isBusy}>
                <Upload size={17} aria-hidden="true" />
                Choisir
              </button>
              <button type="button" className="ghost-button" onClick={resetAll} disabled={isBusy || (!imageDataUrl && !hasResult)}>
                <RotateCcw size={17} aria-hidden="true" />
                Réinitialiser
              </button>
            </div>
          </div>

          <button type="button" className="primary-button" onClick={analyzeImage} disabled={!imageDataUrl || isBusy || !config}>
            {isAnalyzing ? <Loader2 className="spin" size={19} aria-hidden="true" /> : <Sparkles size={19} aria-hidden="true" />}
            {isAnalyzing ? "Analyse en cours..." : config?.demoMode ? "Generer un exemple" : "Analyser la photo"}
          </button>

          {history.length > 0 && (
            <section className="history-panel" aria-label="Historique des analyses">
              <div className="history-title">Historique</div>
              <div className="history-list">
                {history.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={item.id === currentHistoryId ? "history-item is-active" : "history-item"}
                    onClick={() => restoreHistoryItem(item)} disabled={isBusy}
                    title={item.analysis.titre || item.fileName}
                  >
                    <img src={item.imageDataUrl} alt={item.analysis.objet_detecte || "Objet analyse"} />
                    <span>{formatHistoryDate(item.createdAt)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <ListingEditor analysis={analysis} hasResult={hasResult} hasImage={Boolean(imageDataUrl)} demo={demoResult}
          disabled={isBusy} onChange={updateField} onCopy={(key, value) => void copyValue(key, value)}
          onCopyFull={() => void copyValue("complete", getFullListingText(analysis, config?.handoverLocation))}
          onExport={(format) => void exportSingle(format)} />
      </section>}

      {view === "batch" && <section className="batch-panel">
        <div className="batch-header">
          <div>
            <h2>Analyse par lot</h2>
            <p>
              {batchItems.length > 0
                ? `${completedCount} / ${batchItems.length} analysees - ${doneCount} terminees, ${pendingCount} en attente, ${errorCount} en erreur`
                : "Ajoutez plusieurs photos pour preparer un lot d'annonces."}
            </p>
          </div>
          <div className="batch-actions">
            <button type="button" className="secondary-button" onClick={() => batchInputRef.current?.click()} disabled={isBusy}>
              <Upload size={17} aria-hidden="true" />
              Ajouter
            </button>
            <button type="button" className="primary-button compact" onClick={analyzeBatch} disabled={pendingCount + errorCount === 0 || isBusy}>
              {isBatchAnalyzing ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <Sparkles size={17} aria-hidden="true" />}
              Analyser toutes les photos
            </button>
            {isBatchAnalyzing && <button type="button" className="secondary-button" onClick={() => { stopRequested.current = true; setBatchMessage("Pause demandee. L'image en cours va se terminer."); }}><Pause size={17} />Mettre en pause</button>}
            <button type="button" className="ghost-button" onClick={resetBatch} disabled={batchItems.length === 0 || isBusy}>
              <RotateCcw size={17} aria-hidden="true" />
              Réinitialiser le lot
            </button>
          </div>
        </div>

        {batchItems.length > 0 && <progress className="batch-progress" aria-label="Progression des analyses" value={completedCount} max={batchItems.length} />}
        <div
          className={batchDropZoneClass}
          aria-label="Ajouter plusieurs photos" aria-disabled={isBusy}
          onClick={() => { if (!isBusy) batchInputRef.current?.click(); }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsBatchDragging(true);
          }}
          onDragLeave={() => setIsBatchDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsBatchDragging(false);
            void handleFiles(event.dataTransfer.files);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              batchInputRef.current?.click();
            }
          }}
        >
          <input
            ref={batchInputRef}
            className="sr-only"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            multiple
            disabled={isBusy}
            onChange={(event) => {
              if (event.target.files) {
                void handleFiles(event.target.files);
              }
            }}
          />
          <ImagePlus size={28} aria-hidden="true" />
          <span>Glissez-deposez plusieurs images JPG, PNG ou WebP</span>
        </div>

        {batchMessage && (
          <div className={errorCount > 0 ? "batch-message has-errors" : "batch-message"} aria-live="polite">
            {batchMessage}
          </div>
        )}

        {batchItems.length > 0 && (
          <>
            <div className="export-actions">
              <button type="button" className="secondary-button" onClick={exportHtml} disabled={exportableCount === 0}>
                <FileText size={17} aria-hidden="true" />
                Export HTML
              </button>
              <button type="button" className="secondary-button" onClick={exportCsv} disabled={exportableCount === 0}>
                <FileText size={17} aria-hidden="true" />
                Export CSV
              </button>
              <button type="button" className="secondary-button" onClick={() => void exportXlsx()} disabled={exportableCount === 0 || exporting}>
                <FileSpreadsheet size={17} aria-hidden="true" />
                Export XLSX
              </button>
              <button type="button" className="secondary-button" onClick={exportAll} disabled={exportableCount === 0 || exporting}>
                Tout exporter
              </button>
              <button type="button" className="secondary-button" onClick={copyAllListings} disabled={exportableCount === 0}>
                <Copy size={17} aria-hidden="true" />
                Copier toutes les annonces
              </button>
            </div>

            <div className="batch-card-list">
              {batchItems.map((item) => {
                const isExpanded = Boolean(expandedItems[item.id]);
                const buyerDescription = getBuyerDescription(item.analysis);

                return (
                  <article className="batch-card" key={item.id}>
                    <fieldset className="batch-card-main" disabled={item.status === "analyzing"}>
                      <img className="batch-card-thumb" src={item.imageDataUrl} alt={item.fileName} />
                      <div className="batch-card-content">
                        <div className="batch-card-topline">
                          <span className={`status-pill status-${item.status}`}>
                            {item.status === "pending" && "en attente"}
                            {item.status === "analyzing" && "analyse en cours"}
                            {item.status === "done" && (item.demoMode ? "Démonstration · fictif" : "Terminé")}
                            {item.status === "error" && "erreur"}
                          </span>
                          <span className="batch-file-name">{item.fileName}</span>
                        </div>
                        <label className="card-field title-field">
                          <span>Titre</span>
                          <textarea
                            value={item.analysis.titre}
                            rows={2}
                            onChange={(event) => updateBatchField(item.id, "titre", event.target.value)}
                          />
                        </label>
                        <div className="batch-card-facts">
                          <label className="card-field">
                            <span>Prix recommandé</span>
                            <input
                              type="number"
                              min="0"
                              value={item.analysis.prix_recommande}
                              onChange={(event) => updateBatchField(item.id, "prix_recommande", Number(event.target.value))}
                            />
                          </label>
                          <label className="card-field">
                            <span>État</span>
                            <input
                              value={item.analysis.etat_probable}
                              onChange={(event) => updateBatchField(item.id, "etat_probable", event.target.value)}
                            />
                          </label>
                          <label className="card-field">
                            <span>Catégorie</span>
                            <input
                              value={item.analysis.categorie_leboncoin_probable}
                              onChange={(event) => updateBatchField(item.id, "categorie_leboncoin_probable", event.target.value)}
                            />
                          </label>
                        </div>
                        <label className="card-field">
                          <span>Description acheteur</span>
                          <textarea
                            className="buyer-description"
                            value={buyerDescription}
                            rows={isExpanded ? 5 : 3}
                            onChange={(event) => updateBatchField(item.id, "description_acheteur", event.target.value)}
                          />
                        </label>
                        {item.error && <div className="inline-error">{item.error}</div>}
                      </div>
                      <div className="batch-card-actions">
                        <button type="button" onClick={() => copyValue(`${item.id}-titre`, item.analysis.titre)} disabled={!item.analysis.titre}>
                          <Copy size={15} />Copier titre
                        </button>
                        <button type="button" onClick={() => copyValue(`${item.id}-description`, buyerDescription)} disabled={!buyerDescription}>
                          <Copy size={15} />Copier description
                        </button>
                        <button
                          type="button"
                          onClick={() => copyValue(`${item.id}-complete`, getFullListingText(item.analysis, config?.handoverLocation))}
                          disabled={!item.analysis.titre && !buyerDescription}
                        >
                          <Clipboard size={15} />Copier annonce
                        </button>
                        <button
                          type="button"
                          className="subtle-action"
                          onClick={() => copyValue(`${item.id}-prix`, formatPrice(item.analysis.prix_recommande))}
                          disabled={!item.analysis.prix_recommande}
                        >
                          <Euro size={15} />Copier prix
                        </button>
                        {item.status === "error" && (
                          <button type="button" className="subtle-action" onClick={() => void retryBatchItem(item.id)} disabled={isBusy}>
                            Relancer
                          </button>
                        )}
                        <button type="button" className="subtle-action" onClick={() => toggleExpanded(item.id)}>
                          {isExpanded ? <ChevronUp size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />}
                          {isExpanded ? "Réduire" : "Détails"}
                        </button>
                        <button type="button" className="danger-action" onClick={() => removeBatchItem(item.id)} disabled={isBusy}>
                          <Trash2 size={15} aria-hidden="true" />
                          Retirer du lot
                        </button>
                      </div>
                    </fieldset>

                    {isExpanded && (
                      <div className="batch-card-details">
                        <label className="card-field">
                          <span>Objet détecté</span>
                          <input
                            value={item.analysis.objet_detecte}
                            onChange={(event) => updateBatchField(item.id, "objet_detecte", event.target.value)}
                          />
                        </label>
                        <label className="card-field">
                          <span>Marque</span>
                          <input value={item.analysis.marque} onChange={(event) => updateBatchField(item.id, "marque", event.target.value)} />
                        </label>
                        <label className="card-field">
                          <span>Modèle</span>
                          <input value={item.analysis.modele} onChange={(event) => updateBatchField(item.id, "modele", event.target.value)} />
                        </label>
                        <label className="card-field">
                          <span>Prix min</span>
                          <input
                            type="number"
                            min="0"
                            value={item.analysis.prix_min}
                            onChange={(event) => updateBatchField(item.id, "prix_min", Number(event.target.value))}
                          />
                        </label>
                        <label className="card-field">
                          <span>Prix max</span>
                          <input
                            type="number"
                            min="0"
                            value={item.analysis.prix_max}
                            onChange={(event) => updateBatchField(item.id, "prix_max", Number(event.target.value))}
                          />
                        </label>
                        <label className="card-field">
                          <span>Niveau de confiance</span>
                          <input
                            value={item.analysis.niveau_confiance}
                            onChange={(event) => updateBatchField(item.id, "niveau_confiance", event.target.value)}
                          />
                        </label>
                        <label className="card-field wide-detail">
                          <span>Notes internes</span>
                          <textarea
                            value={item.analysis.notes_internes}
                            rows={4}
                            onChange={(event) => updateBatchField(item.id, "notes_internes", event.target.value)}
                          />
                        </label>
                        <label className="card-field wide-detail">
                          <span>Points à vérifier</span>
                          <textarea
                            value={item.analysis.points_a_verifier.join("\n")}
                            rows={4}
                            onChange={(event) =>
                              updateBatchField(
                                item.id,
                                "points_a_verifier",
                                event.target.value.split("\n")
                              )
                            }
                          />
                        </label>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>}
      {view === "history" && <section className="history-page">
        <div className="history-header"><h2>Mes annonces sauvegardées</h2><label className="history-search"><span className="sr-only">Rechercher dans l'historique</span><Search size={18} />
          <input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Rechercher un objet ou une annonce" /></label></div>
        {history.length === 0 && <div className="empty-history"><History size={36} /><h3>Aucune annonce pour le moment</h3></div>}
        <div className="history-grid">{history.filter((item) => `${item.fileName} ${item.analysis.titre} ${item.analysis.objet_detecte}`.toLowerCase().includes(historySearch.toLowerCase())).map((item) =>
          <article className="saved-listing" key={item.id}>
            <button className="saved-listing-open" onClick={() => restoreHistoryItem(item)} disabled={isBusy}>
              <img src={item.imageDataUrl} alt={item.analysis.objet_detecte || item.fileName} />
              <strong>{item.analysis.titre || item.fileName}</strong><span>{formatPrice(item.analysis.prix_recommande)}</span>
              <span className="muted">{formatHistoryDate(item.createdAt)}{item.demoMode && " · Démonstration"}</span>
            </button>
            <button className="icon-button delete-history" aria-label={`Supprimer ${item.analysis.titre || item.fileName}`} title="Supprimer de l'historique" onClick={() => setDeleteId(item.id)} disabled={isBusy}><Trash2 size={17} /></button>
          </article>)}</div>
        {history.length > 0 && !history.some((item) => `${item.fileName} ${item.analysis.titre} ${item.analysis.objet_detecte}`.toLowerCase().includes(historySearch.toLowerCase())) && <p className="muted">Aucune annonce ne correspond a cette recherche.</p>}
      </section>}
      </>}
      {!config && !error && <p role="status"><Loader2 size={18} className="spin" />Ouverture de l'application...</p>}
      {toast && <div className="toast" role="status"><CheckCircle2 size={18} />{toast}<button className="icon-button" onClick={() => setToast("")} aria-label="Fermer le message" title="Fermer le message"><X size={16} /></button></div>}
      {deleteId && <ConfirmDelete busy={isDeleting} onCancel={() => { if (!isDeleting) setDeleteId(""); }} onDelete={() => void deleteHistoryItem()} />}
    </main>
  );
}
