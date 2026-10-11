import { useState } from "react";
import { ArrowLeft, Check, ExternalLink, Eye, EyeOff, Layers, KeyRound, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import type { AppConfig, HelpTopic } from "../../shared/types";

type Props = { config: AppConfig; onSaved: (config: AppConfig) => void; onClose: () => void };

export function SettingsPanel({ config, onSaved, onClose }: Props): JSX.Element {
  const onboarding = !config.onboardingComplete;
  const [step, setStep] = useState(onboarding ? 0 : 2);
  const [demo, setDemo] = useState(config.demoMode);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(config.model);
  const [location, setLocation] = useState(config.handoverLocation);
  const [visible, setVisible] = useState(false);
  const [consent, setConsent] = useState(config.onboardingComplete && !config.demoMode && config.hasApiKey);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [removeKey, setRemoveKey] = useState(false);

  async function openHelp(topic: HelpTopic): Promise<void> {
    try { await window.listingApi.openHelp(topic); }
    catch { setError("Le lien n'a pas pu etre ouvert. Reessayez."); }
  }

  async function save(): Promise<void> {
    setBusy(true); setError("");
    try {
      const next = await window.listingApi.saveSettings({
        apiKey: removeKey ? undefined : apiKey.trim() || undefined, clearApiKey: removeKey, model,
        demoMode: demo, handoverLocation: location
      });
      setApiKey("");
      onSaved(next);
    } catch (err) { setError(err instanceof Error ? err.message : "Enregistrement impossible."); }
    finally { setBusy(false); }
  }

  async function test(): Promise<void> {
    setBusy(true); setError(""); setMessage("");
    try { setMessage(await window.listingApi.testConnection({ apiKey: apiKey.trim() || undefined, model })); }
    catch (err) { setError(err instanceof Error ? err.message : "Connexion impossible."); }
    finally { setBusy(false); }
  }

  return <section className="settings-page" aria-labelledby="settings-heading">
    <div className="settings-heading">
      <span className="brand-mark"><Layers size={26} /></span>
      <div><p className="eyebrow">{onboarding ? "Première ouverture" : "Connexion et préférences"}</p>
        <h2 id="settings-heading">{onboarding ? "Bienvenue dans Lotigo" : "Réglages"}</h2></div>
    </div>
    {onboarding && <ol className="setup-steps" aria-label="Etapes de configuration">
      {["Choisir un mode", "Préparer OpenAI", "Terminer"].map((label, index) =>
        <li key={label} className={step === index ? "current" : step > index ? "complete" : ""} aria-current={step === index ? "step" : undefined}>
          <span>{step > index ? <Check size={14} /> : index + 1}</span>{label}</li>)}
    </ol>}
    {step === 0 && <>
      <p>Préparez tout un lot : titres, descriptions et prix estimés à relire.</p>
      <div className="mode-options">
        <label className={demo ? "mode-option selected" : "mode-option"}>
          <input type="radio" name="mode" checked={demo} onChange={() => setDemo(true)} />
          <Sparkles size={22} /><strong>Découvrir gratuitement</strong>
          <span>Des exemples fictifs pour essayer l'application, sans compte ni connexion.</span>
        </label>
        <label className={!demo ? "mode-option selected" : "mode-option"}>
          <input type="radio" name="mode" checked={!demo} onChange={() => setDemo(false)} />
          <KeyRound size={22} /><strong>Analyser mes objets</strong>
          <span>Votre propre clé OpenAI. Les analyses sont facturées par OpenAI selon votre utilisation.</span>
        </label>
      </div>
      <p className="muted">Vous pourrez changer de mode a tout moment dans les réglages.</p>
      <button className="primary-button compact" onClick={() => setStep(demo ? 2 : 1)}>Continuer</button>
    </>}
    {step === 1 && <>
      <h3>Préparez votre compte OpenAI</h3>
      <ol className="account-steps">
        <li><strong>Ouvrez la plateforme OpenAI</strong><p>Connectez-vous ou créez un compte, puis choisissez votre projet.</p>
          <button className="secondary-button" onClick={() => void openHelp("keys")}>Ouvrir OpenAI <ExternalLink size={15} /></button></li>
        <li><strong>Activez la facturation API</strong><p>L'application est gratuite. L'API est payante et facturée séparément de ChatGPT Plus ou Pro. Consultez vos crédits et votre budget sur OpenAI.</p>
          <button className="secondary-button" onClick={() => void openHelp("billing")}>Facturation et crédits <ExternalLink size={15} /></button></li>
        <li><strong>Créez votre clé API</strong><p>Créez une clé secrète pour ce projet. Copiez-la pour l'étape suivante et gardez-la privée.</p>
          <button className="secondary-button" onClick={() => void openHelp("keys")}>Créer ma clé <ExternalLink size={15} /></button></li>
      </ol>
      <div className="button-row"><button className="ghost-button" onClick={() => setStep(0)}><ArrowLeft size={16} />Retour</button>
        <button className="primary-button compact" onClick={() => setStep(2)}>J'ai ma clé</button></div>
    </>}
    {step === 2 && <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <label className="toggle-line"><input type="checkbox" checked={demo} onChange={(event) => { setDemo(event.target.checked); setError(""); }} />
        Utiliser la demonstration (resultats fictifs, aucun appel API)</label>
      {!demo && <div className="connection-fields">
        <label><span>Clé API OpenAI</span>
          <div className="copy-field"><input aria-label="Clé API OpenAI" type={visible ? "text" : "password"} value={apiKey} autoComplete="off" spellCheck={false}
            placeholder={config.hasApiKey && !removeKey ? "Cle deja configuree. Laisser vide pour la conserver." : "sk-..."}
            onChange={(event) => { setApiKey(event.target.value); setMessage(""); }} />
            <button type="button" className="icon-button" title={visible ? "Masquer la cle" : "Afficher la cle"} aria-label={visible ? "Masquer la cle" : "Afficher la cle"}
              onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
        </label>
        <p className="privacy-line"><ShieldCheck size={18} />La clé est chiffrée sur ce PC avec la protection de votre session Windows. Elle n'est jamais incluse dans les exports.</p>
        {!config.storageAvailable && <p className="error">Le stockage protégé est indisponible sur cet ordinateur. La demonstration reste disponible.</p>}
        <div className="button-row"><button type="button" className="secondary-button" disabled={busy || removeKey || (!apiKey && !config.hasApiKey)} onClick={() => void test()}>
          {busy ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}Tester la connexion</button>
          <button type="button" className="ghost-button" onClick={() => void openHelp("keys")}>Obtenir une cle <ExternalLink size={15} /></button></div>
        <label className="consent-line"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          Je comprends que les photos analysées sont envoyées a OpenAI et que les appels API peuvent etre facturés.</label>
      </div>}
      <label className="location-field"><span>Lieu de remise en main propre</span><input value={location} maxLength={160} placeholder="Ex. Bordeaux/Pompignac" onChange={(event) => setLocation(event.target.value)} /></label>
      <details className="settings-details"><summary>Compte et options avancées</summary>
        <label><span>Identifiant du modèle OpenAI</span><input value={model} maxLength={100} onChange={(event) => { setModel(event.target.value); setMessage(""); }} /></label>
        <div className="button-row"><button type="button" className="ghost-button" onClick={() => void openHelp("billing")}>Facturation <ExternalLink size={14} /></button>
          <button type="button" className="ghost-button" onClick={() => void openHelp("usage")}>Consommation <ExternalLink size={14} /></button>
          <button type="button" className="ghost-button" onClick={() => void openHelp("privacy")}>Données chez OpenAI <ExternalLink size={14} /></button></div>
        {config.keySource === "saved" && <label className="toggle-line"><input type="checkbox" checked={removeKey} onChange={(event) => { setRemoveKey(event.target.checked); if (event.target.checked) setDemo(true); }} />
          Retirer la clé enregistrée de ce PC</label>}
        {config.keySource === "env" && <p className="muted">Une cle du fichier .env est active pour le developpement.</p>}
      </details>
      <div className="button-row setup-footer">
        {onboarding ? <button type="button" className="ghost-button" disabled={busy} onClick={() => setStep(demo ? 0 : 1)}><ArrowLeft size={16} />Retour</button>
          : <button type="button" className="ghost-button" onClick={onClose} disabled={busy}>Annuler</button>}
        <button className="primary-button compact" type="submit" disabled={busy || (!demo && (!consent || !config.storageAvailable || (!apiKey && (!config.hasApiKey || removeKey))))}>
          {busy && <Loader2 className="spin" size={16} />}{onboarding ? "Ouvrir l'application" : "Enregistrer"}</button>
      </div>
    </form>}
    {message && <p className="success-message" role="status">{message}</p>}
    {error && <p className="error" role="alert">{error}</p>}
    <p className="settings-footnote">Version {config.version} · Gratuit et open source · Projet indépendant de Leboncoin et d'OpenAI</p>
  </section>;
}
