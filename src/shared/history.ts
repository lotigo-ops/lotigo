import type { HistoryItem } from "./types";

export function isDemoHistoryItem(item: HistoryItem): boolean {
  if (item.demoMode || item.model === "demonstration") return true;
  const notes = `${item.analysis.notes_internes || ""}\n${item.analysis.description || ""}`;
  return /mode d[eé]mo (g[eé]n[eé]r[eé]|activ[eé])|r[eé]sultat (de )?d[eé]monstration/i.test(notes);
}
