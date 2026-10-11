"use strict";

const samples = {
  lamp: { name: "Lampe de bureau", image: "assets/lampe-demo-v2.webp", file: "lampe-exemple.jpg",
    title: "Lampe de bureau articulée verte", price: 25, condition: "Bon état, à vérifier",
    description: "Lampe de bureau en métal vert avec bras articulé. Quelques traces d'usage sur la base. Dimensions et fonctionnement à confirmer avant la vente." },
  camera: { name: "Appareil photo", image: "assets/appareil-demo-v2.webp", file: "appareil-exemple.jpg",
    title: "Appareil photo argentique au style vintage", price: 45, condition: "État correct, à vérifier",
    description: "Appareil photo argentique au boîtier argenté et noir. Traces d'usage visibles. Modèle, objectif et fonctionnement à confirmer. Aucun accessoire n'est inclus dans cet exemple." },
  chair: { name: "Chaise rouge", image: "assets/chaise-demo-v2.webp", file: "chaise-exemple.jpg",
    title: "Chaise rouge avec pieds en métal", price: 20, condition: "Bon état, à vérifier",
    description: "Chaise rouge avec assise moulée et pieds en métal noir. Quelques marques d'usage visibles. Dimensions et stabilité à vérifier avant la vente." }
};
const drafts = structuredClone(samples);
const titleInput = document.querySelector("#listing-title");
const descriptionInput = document.querySelector("#listing-description");
const priceInput = document.querySelector("#listing-price");
const conditionInput = document.querySelector("#listing-condition");
const sampleImage = document.querySelector("#sample-image");
let activeSample = "lamp";
let toastTimer;

function notify(message) {
  const toast = document.querySelector("#toast");
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
}
async function copyText(text) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(text);
  } catch {
    const previousFocus = document.activeElement;
    const textarea = document.createElement("textarea");
    textarea.className = "clipboard-proxy";
    textarea.value = text;
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    previousFocus?.focus({ preventScroll: true });
    if (!copied) {
      notify("Copie indisponible. Vous pouvez sélectionner le texte de l'exemple.");
      return;
    }
  }
  notify("Texte copié. Les données d'exemple sont signalées comme fictives.");
}
function priceText(value) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value) + " €";
}
function persistDraft() {
  const draft = drafts[activeSample];
  draft.title = titleInput.value;
  draft.description = descriptionInput.value;
  draft.price = priceInput.valueAsNumber;
  draft.condition = conditionInput.value;
}
function renderSample(key) {
  activeSample = key;
  const draft = drafts[key];
  titleInput.value = draft.title;
  descriptionInput.value = draft.description;
  priceInput.value = Number.isFinite(draft.price) ? draft.price : "";
  conditionInput.value = draft.condition;
  sampleImage.src = draft.image;
  sampleImage.alt = draft.name + " d'illustration.";
  document.querySelectorAll("[data-sample]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.sample === key));
  });
}
document.querySelector("#demo-form").addEventListener("submit", (event) => event.preventDefault());
[titleInput, descriptionInput, priceInput, conditionInput].forEach((field) => field.addEventListener("input", persistDraft));
document.querySelectorAll("[data-sample]").forEach((button) => button.addEventListener("click", () => renderSample(button.dataset.sample)));
document.querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", () => {
  const draft = drafts[activeSample];
  void copyText("DÉMONSTRATION · données fictives\n" + draft[button.dataset.copy]);
}));
document.querySelector("#copy-listing").addEventListener("click", () => {
  if (!priceInput.checkValidity() || !Number.isFinite(drafts[activeSample].price)) {
    priceInput.reportValidity();
    priceInput.focus();
    notify("Renseignez un prix d'exemple valide.");
    return;
  }
  const draft = drafts[activeSample];
  void copyText(["DÉMONSTRATION · données fictives", "Titre : " + draft.title,
    "Prix : " + priceText(draft.price), "État : " + draft.condition, "", "Description :", draft.description].join("\n"));
});
document.querySelector("#reset-example").addEventListener("click", () => {
  drafts[activeSample] = structuredClone(samples[activeSample]);
  renderSample(activeSample);
  notify("Cet exemple a été rétabli.");
});

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function renderBatch() {
  const rows = document.querySelector("#batch-rows");
  rows.replaceChildren();
  for (const [key, draft] of Object.entries(drafts)) {
    const row = element("div", "batch-row");
    const photo = element("img");
    photo.src = draft.image; photo.alt = draft.name + " d'illustration."; photo.width = 100; photo.height = 100;
    const text = element("div");
    const label = element("label", "", "Titre de l'annonce");
    const input = element("input");
    input.id = "batch-title-" + key;
    input.value = draft.title; input.maxLength = 200;
    label.htmlFor = input.id;
    input.addEventListener("input", () => { draft.title = input.value; });
    text.append(label, input, element("p", "", draft.name + " · exemple fictif"));
    const pricing = element("div");
    const priceLabel = element("label", "", "Prix d'exemple (€)");
    const price = element("input");
    price.type = "number"; price.min = "0"; price.max = "1000000"; price.step = "0.5";
    price.id = "batch-price-" + key;
    price.value = Number.isFinite(draft.price) ? draft.price : "";
    priceLabel.htmlFor = price.id;
    price.addEventListener("input", () => { draft.price = price.valueAsNumber; });
    pricing.append(priceLabel, price);
    const state = element("span", "batch-status");
    const check = element("img"); check.src = "assets/icons/check.svg"; check.alt = "";
    state.append(check, element("span", "", "Exemple prêt"));
    row.append(photo, text, pricing, state);
    rows.append(row);
  }
}
function tabsKeyboard(container) {
  container.addEventListener("keydown", (event) => {
    const tabs = [...container.querySelectorAll('[role="tab"]')];
    const index = tabs.indexOf(document.activeElement);
    if (index < 0 || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1
      : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].focus(); tabs[next].click();
  });
}
const demoTabs = document.querySelectorAll('.demo-topline [role="tab"]');
demoTabs.forEach((tab) => tab.addEventListener("click", () => {
  const batch = tab.id === "tab-batch";
  demoTabs.forEach((item) => {
    const selected = item === tab;
    item.setAttribute("aria-selected", String(selected));
    item.tabIndex = selected ? 0 : -1;
  });
  document.querySelector("#demo-single").hidden = batch;
  document.querySelector("#demo-batch").hidden = !batch;
  if (batch) renderBatch(); else renderSample(activeSample);
}));
document.querySelectorAll('[role="tablist"]').forEach(tabsKeyboard);
renderBatch();

function csvCell(value) {
  let text = String(value ?? "");
  if (typeof value === "string" && /^\s*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
document.querySelector("#export-demo").addEventListener("click", () => {
  if (Object.values(drafts).some((draft) => !Number.isFinite(draft.price) || draft.price < 0 || draft.price > 1000000)) {
    notify("Vérifiez les prix de tous les exemples avant l'export.");
    return;
  }
  const rows = [["nom du fichier", "titre", "description", "prix", "état", "démonstration"],
    ...Object.values(drafts).map((draft) => [draft.file, draft.title, draft.description, draft.price, draft.condition, "oui - données fictives"])];
  const csv = "\uFEFF" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = "annonces-exemple-demo.csv";
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify("CSV d'exemple exporté. Vos modifications sont incluses.");
});

const screenshots = {
  workspace: { source: "assets/workspace.png", alt: "Capture réelle de l'éditeur d'annonce de l'application Windows." },
  setup: { source: "assets/premiere-ouverture.png", alt: "Capture réelle de l'assistant de première ouverture et de connexion OpenAI." }
};
const screenshotTabs = document.querySelectorAll("[data-screenshot]");
screenshotTabs.forEach((button) => {
  button.id = "screenshot-" + button.dataset.screenshot;
  button.addEventListener("click", () => {
    screenshotTabs.forEach((tab) => { tab.setAttribute("aria-selected", String(tab === button)); tab.tabIndex = tab === button ? 0 : -1; });
    const shot = screenshots[button.dataset.screenshot];
    const image = document.querySelector("#app-screenshot");
    image.src = shot.source; image.alt = shot.alt;
    document.querySelector("#screenshot-panel").setAttribute("aria-labelledby", button.id);
  });
});
document.querySelector("#screenshot-panel").setAttribute("aria-labelledby", "screenshot-workspace");
document.querySelector("#expand-screenshot").addEventListener("click", () => {
  const current = document.querySelector("#app-screenshot");
  const large = document.querySelector("#large-screenshot");
  large.src = current.src; large.alt = current.alt;
  document.querySelector("#screenshot-dialog").showModal();
});
document.querySelector("#open-guide").addEventListener("click", () => document.querySelector("#guide-dialog").showModal());
document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
document.querySelectorAll("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
}));

const header = document.querySelector(".site-header");
const menu = document.querySelector("#menu-toggle");
function closeMenu() {
  header.classList.remove("nav-open");
  menu.setAttribute("aria-expanded", "false");
  menu.setAttribute("aria-label", "Ouvrir le menu");
  menu.title = "Ouvrir le menu";
  menu.querySelector("img").src = "assets/icons/menu.svg";
}
menu.addEventListener("click", () => {
  if (menu.getAttribute("aria-expanded") === "true") { closeMenu(); return; }
  header.classList.add("nav-open");
  menu.setAttribute("aria-expanded", "true");
  menu.setAttribute("aria-label", "Fermer le menu");
  menu.title = "Fermer le menu";
  menu.querySelector("img").src = "assets/icons/close.svg";
});
document.querySelectorAll("#navigation a").forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu.getAttribute("aria-expanded") === "true") { closeMenu(); menu.focus(); }
});
window.addEventListener("scroll", () => header.classList.toggle("is-scrolled", scrollY > 8), { passive: true });
const reveal = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) { entry.target.classList.add("revealed"); reveal.unobserve(entry.target); }
  });
}, { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach((node) => reveal.observe(node));
document.querySelector("#copy-project").addEventListener("click", () => {
  void copyText("Lotigo : votre assistant d'annonces par lot pour Leboncoin. Une série de livres à vendre ? Une photo par livre, une annonce par photo : titres, descriptions et prix estimés, préparés en batch. Relisez, puis copiez pour publier plus vite, manuellement. Export HTML, CSV et Excel. Application Windows gratuite et open source. Votre clé OpenAI (API payante).");
});

