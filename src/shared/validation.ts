import type { AnalyzeImageRequest, ListingAnalysis } from "./types";

const textFields = ["objet_detecte", "marque", "modele", "categorie_leboncoin_probable", "titre",
  "description_acheteur", "notes_internes", "etat_probable", "niveau_confiance"] as const;

export function validateAnalysis(value: unknown): ListingAnalysis {
  if (!value || typeof value !== "object") throw new Error("Resultat d'analyse invalide.");
  const data = value as Record<string, unknown>;
  for (const key of textFields) {
    if (typeof data[key] !== "string" || (data[key] as string).length > 20000) {
      throw new Error(`Champ d'analyse invalide : ${key}.`);
    }
  }
  for (const key of ["prix_min", "prix_max", "prix_recommande"]) {
    if (typeof data[key] !== "number" || !Number.isFinite(data[key]) || (data[key] as number) < 0) {
      throw new Error("Les prix doivent etre des nombres positifs ou nuls.");
    }
  }
  if (!Array.isArray(data.points_a_verifier) || data.points_a_verifier.length > 100 ||
    data.points_a_verifier.some((point) => typeof point !== "string" || point.length > 2000)) {
    throw new Error("Liste des points a verifier invalide.");
  }
  return value as ListingAnalysis;
}

export function validateImageRequest(value: unknown): AnalyzeImageRequest {
  if (!value || typeof value !== "object") throw new Error("Image invalide.");
  const data = value as AnalyzeImageRequest;
  if (typeof data.fileName !== "string" || data.fileName.length > 512 || typeof data.imageDataUrl !== "string" ||
    data.imageDataUrl.length > 12 * 1024 * 1024 ||
    !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(data.imageDataUrl)) {
    throw new Error("Ajoutez une image JPG, PNG ou WebP lisible, de moins de 8 Mo apres preparation.");
  }
  return data;
}
