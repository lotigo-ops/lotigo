import { contextBridge, ipcRenderer } from "electron";
import type { AnalyzeImageRequest, AnalyzeImageResponse, AppConfig, ExportRequest, HelpTopic, HistoryItem, ListingAnalysis, SettingsRequest } from "../shared/types";

const api = {
  getConfig: (): Promise<AppConfig> => ipcRenderer.invoke("app:getConfig"),
  saveSettings: (request: SettingsRequest): Promise<AppConfig> => ipcRenderer.invoke("app:saveSettings", request),
  testConnection: (input: { apiKey?: string; model: string }): Promise<string> => ipcRenderer.invoke("app:testConnection", input),
  openHelp: (topic: HelpTopic): Promise<void> => ipcRenderer.invoke("app:openHelp", topic),
  saveExport: (request: ExportRequest): Promise<boolean> => ipcRenderer.invoke("app:saveExport", request),
  analyzeImage: (request: AnalyzeImageRequest): Promise<AnalyzeImageResponse> =>
    ipcRenderer.invoke("listing:analyzeImage", request),
  getHistory: (): Promise<HistoryItem[]> => ipcRenderer.invoke("history:list"),
  deleteHistoryItem: (id: string): Promise<HistoryItem[]> => ipcRenderer.invoke("history:deleteItem", id),
  updateHistoryItem: (id: string, analysis: ListingAnalysis): Promise<HistoryItem[]> =>
    ipcRenderer.invoke("history:updateItem", id, analysis)
};

contextBridge.exposeInMainWorld("listingApi", api);

export type ListingApi = typeof api;
