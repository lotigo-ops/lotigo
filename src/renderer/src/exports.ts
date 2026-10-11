import type { ListingAnalysis } from "../../shared/types";

export type ExportItem = { imageDataUrl: string; fileName: string; status: string; analysis: ListingAnalysis; demoMode?: boolean };
export const emptyAnalysis: ListingAnalysis = {
  objet_detecte: "", marque: "", modele: "", categorie_leboncoin_probable: "", titre: "",
  description_acheteur: "", notes_internes: "", etat_probable: "", prix_min: 0, prix_max: 0,
  prix_recommande: 0, niveau_confiance: "", points_a_verifier: []
};
const columns = ["nom du fichier image", "titre", "description acheteur", "notes internes", "prix recommande",
  "prix min", "prix max", "etat", "categorie", "objet detecte", "marque", "modele", "niveau de confiance", "points a verifier", "demonstration"];

export function getBuyerDescription(analysis: ListingAnalysis): string {
  return analysis.description_acheteur ?? analysis.description ?? "";
}
export function normalizeAnalysis(value: ListingAnalysis): ListingAnalysis {
  return { ...emptyAnalysis, ...value, description_acheteur: value.description_acheteur ?? value.description ?? "",
    notes_internes: value.notes_internes || "", points_a_verifier: Array.isArray(value.points_a_verifier) ? value.points_a_verifier : [] };
}
export function formatPrice(value: number): string {
  return Number.isFinite(value) ? `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value)} €` : "";
}
export function getFullListingText(analysis: ListingAnalysis, location = ""): string {
  return [analysis.titre, "", `Prix : ${formatPrice(analysis.prix_recommande)}`, `Etat : ${analysis.etat_probable}`, "",
    getBuyerDescription(analysis), ...(location.trim() ? ["", `Remise en main propre possible autour de ${location.trim()}.`] : [])].join("\n");
}
export function getExportRows<T extends ExportItem>(items: T[]): T[] {
  return items.filter((item) => item.status === "done" || item.analysis.titre || getBuyerDescription(item.analysis));
}
function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function values(item: ExportItem): Array<string | number> {
  const a = item.analysis;
  return [item.fileName, a.titre, getBuyerDescription(a), a.notes_internes, a.prix_recommande, a.prix_min, a.prix_max,
    a.etat_probable, a.categorie_leboncoin_probable, a.objet_detecte, a.marque, a.modele, a.niveau_confiance,
    a.points_a_verifier.join(" ; "), item.demoMode ? "oui - resultat fictif" : "non"];
}
export function toCsvCell(value: string | number): string {
  const text = String(value ?? "");
  // Quoting alone does not prevent Excel from interpreting a cell as a formula.
  const safe = typeof value === "string" && /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
export function buildCsvExport(items: ExportItem[]): string {
  return `\uFEFF${[columns, ...getExportRows(items).map(values)].map((row) => row.map(toCsvCell).join(";")).join("\r\n")}`;
}
export function buildHtmlExport(items: ExportItem[]): string {
  const rows = getExportRows(items).map((item) => {
    const a = item.analysis;
    return `<tr><td><img src="${escapeHtml(item.imageDataUrl)}" alt="${escapeHtml(item.fileName)}" /></td>
      <td>${item.demoMode ? '<strong class="demo">Demonstration · resultat fictif</strong><br>' : ""}${escapeHtml(a.titre)}</td>
      <td class="description">${escapeHtml(getBuyerDescription(a))}</td><td>${escapeHtml(formatPrice(a.prix_recommande))}</td>
      <td>${escapeHtml(a.etat_probable)}</td><td>${escapeHtml(a.categorie_leboncoin_probable)}</td>
      <td>${escapeHtml(a.points_a_verifier.join(" ; "))}</td></tr>`;
  }).join("\n");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Annonces preparees</title><style>
    body{font:15px/1.5 system-ui,sans-serif;margin:24px;color:#20272a}h1{font-size:24px}.table-scroll{overflow:auto}
    table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:12px;text-align:left;vertical-align:top}
    th{background:#f4f7f8}img{width:100px;height:100px;object-fit:contain}.description{white-space:pre-wrap;min-width:220px}.demo{color:#884e00}
    @media print{body{margin:0;font-size:10px}img{width:64px;height:64px}.table-scroll{overflow:visible}}
    </style></head><body><h1>Annonces preparees</h1><div class="table-scroll"><table><thead><tr>
    <th>Photo</th><th>Titre</th><th>Description acheteur</th><th>Prix</th><th>Etat</th><th>Categorie</th><th>Points a verifier</th>
    </tr></thead><tbody>${rows}</tbody></table></div></body></html>`;
}
export async function buildXlsxExport(items: ExportItem[]): Promise<Uint8Array> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Annonces", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.addRow(columns);
  getExportRows(items).forEach((item) => sheet.addRow(values(item)));
  sheet.autoFilter = { from: "A1", to: "O1" };
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF246858" } };
  sheet.columns.forEach((column, index) => { column.width = index === 2 || index === 3 ? 60 : 23; });
  sheet.eachRow((row) => { row.alignment = { vertical: "top", wrapText: true }; });
  for (const index of [5, 6, 7]) sheet.getColumn(index).numFmt = '#,##0.00 "EUR"';
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
export async function downloadBlob(fileName: string, _mimeType: string, content: string | Uint8Array): Promise<boolean> {
  return window.listingApi.saveExport({ fileName, content });
}
