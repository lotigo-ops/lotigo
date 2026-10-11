export type ListingAnalysis = {
  objet_detecte: string;
  marque: string;
  modele: string;
  categorie_leboncoin_probable: string;
  titre: string;
  description_acheteur: string;
  notes_internes: string;
  description?: string;
  etat_probable: string;
  prix_min: number;
  prix_max: number;
  prix_recommande: number;
  niveau_confiance: string;
  points_a_verifier: string[];
};

export type AnalyzeImageRequest = {
  imageDataUrl: string;
  fileName: string;
  mimeType: string;
};

export type HistoryItem = AnalyzeImageRequest & {
  id: string;
  createdAt: string;
  model: string;
  analysis: ListingAnalysis;
  demoMode?: boolean;
};

export type AnalyzeImageResponse = {
  item: HistoryItem;
  demoMode: boolean;
  demoReason?: "no_key" | "selected" | "quota";
};

export type AppConfig = {
  hasApiKey: boolean;
  model: string;
  version: string;
  onboardingComplete: boolean;
  demoMode: boolean;
  handoverLocation: string;
  keySource: "saved" | "env" | "none";
  storageAvailable: boolean;
};

export type SettingsRequest = {
  apiKey?: string;
  clearApiKey?: boolean;
  model: string;
  demoMode: boolean;
  handoverLocation: string;
};

export type HelpTopic = "keys" | "billing" | "usage" | "privacy";

export type ExportRequest = { fileName: string; content: string | Uint8Array };
