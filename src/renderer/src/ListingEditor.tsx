import { Copy, Clipboard, Euro, Download } from "lucide-react";
import type { ListingAnalysis } from "../../shared/types";
import { formatPrice, getBuyerDescription } from "./exports";

type Props = {
  analysis: ListingAnalysis;
  hasResult: boolean;
  hasImage: boolean;
  demo: boolean;
  disabled: boolean;
  onChange: <K extends keyof ListingAnalysis>(key: K, value: ListingAnalysis[K]) => void;
  onCopy: (key: string, value: string) => void;
  onCopyFull: () => void;
  onExport: (format: string) => void;
};

export function ListingEditor({ analysis: a, hasResult, hasImage, demo, disabled, onChange, onCopy, onCopyFull, onExport }: Props): JSX.Element {
  function textField(key: keyof ListingAnalysis, label: string): JSX.Element {
    return <label key={key}><span>{label}</span><input value={String(a[key])} onChange={(event) => onChange(key, event.target.value)} /></label>;
  }
  return <form className="editor-panel" onSubmit={(event) => event.preventDefault()}>
    <div className="section-heading"><Clipboard size={20} /><h2>Mon annonce</h2>
      {hasResult && <button type="button" className="secondary-button" onClick={onCopyFull}><Copy size={16} />Copier l'annonce</button>}
    </div>
    {demo && hasResult && <p className="notice">Exemple fictif de demonstration</p>}
    {!hasResult && <p className="editor-placeholder">{hasImage ? "La photo est prête a etre analysee." : "Ajoutez une photo pour commencer."}</p>}
    <fieldset className="grid-fields" disabled={disabled}>
      <label className="wide"><span>Titre</span><div className="copy-field"><input aria-label="Titre" value={a.titre} onChange={(event) => onChange("titre", event.target.value)} />
        <button type="button" className="icon-button" title="Copier le titre" aria-label="Copier le titre" onClick={() => onCopy("titre", a.titre)} disabled={!a.titre}><Copy size={17} /></button></div></label>
      <label className="wide"><span>Description pour l'acheteur</span><div className="copy-field"><textarea aria-label="Description pour l'acheteur" value={getBuyerDescription(a)} rows={7} onChange={(event) => onChange("description_acheteur", event.target.value)} />
        <button type="button" className="icon-button" title="Copier la description" aria-label="Copier la description" onClick={() => onCopy("description", getBuyerDescription(a))} disabled={!getBuyerDescription(a)}><Copy size={17} /></button></div></label>
      <label><span>Prix recommandé (€)</span><div className="copy-field"><input aria-label="Prix recommandé" type="number" min="0" step="0.01" value={a.prix_recommande} onChange={(event) => onChange("prix_recommande", Math.max(0, Number(event.target.value)))} />
        <button type="button" className="icon-button" title="Copier le prix" aria-label="Copier le prix" onClick={() => onCopy("prix", formatPrice(a.prix_recommande))} disabled={!hasResult}><Euro size={17} /></button></div></label>
      {textField("etat_probable", "État probable")}
      {textField("categorie_leboncoin_probable", "Catégorie Leboncoin")}
      {textField("objet_detecte", "Objet détecté")}
    </fieldset>
    <details className="editor-details"><summary>Détails de l'objet et notes personnelles</summary>
      <fieldset className="grid-fields" disabled={disabled}>
        {textField("marque", "Marque")}{textField("modele", "Modèle")}
        <label><span>Prix minimum (€)</span><input type="number" min="0" step="0.01" value={a.prix_min} onChange={(event) => onChange("prix_min", Math.max(0, Number(event.target.value)))} /></label>
        <label><span>Prix maximum (€)</span><input type="number" min="0" step="0.01" value={a.prix_max} onChange={(event) => onChange("prix_max", Math.max(0, Number(event.target.value)))} /></label>
        {textField("niveau_confiance", "Niveau de confiance")}
        <label className="wide"><span>Notes internes</span><textarea value={a.notes_internes} rows={3} onChange={(event) => onChange("notes_internes", event.target.value)} /></label>
        <label className="wide"><span>Points à vérifier</span><textarea value={a.points_a_verifier.join("\n")} rows={3} onChange={(event) => onChange("points_a_verifier", event.target.value.split("\n"))} /></label>
      </fieldset>
    </details>
    {hasResult && <label className="single-export"><Download size={17} /><span className="sr-only">Exporter cette annonce</span>
      <select value="" onChange={(event) => onExport(event.target.value)} disabled={disabled}>
        <option value="" disabled>Exporter cette annonce</option><option value="html">HTML avec photo</option><option value="csv">CSV</option><option value="xlsx">Excel XLSX</option>
      </select></label>}
  </form>;
}
