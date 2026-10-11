// DOM-simulated state tests complement browser layout checks; no browser is opened.
import { readFileSync } from "node:fs";
import { runInContext, createContext } from "node:vm";
import assert from "node:assert/strict";
class Node {
  constructor() { this.children=[]; this.handlers={}; this.dataset={}; this.attrs={}; this.hidden=false; this.value=""; this.classList={add(){},remove(){},toggle(){}}; }
  addEventListener(type, fn) { (this.handlers[type] ??= []).push(fn); }
  fire(type, event={}) { for(const fn of this.handlers[type] ?? []) fn({target:this,preventDefault(){},...event}); }
  click() { this.fire("click"); }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children=nodes; }
  setAttribute(k,v) { this.attrs[k]=v; }
  getAttribute(k) { return this.attrs[k] ?? null; }
  querySelector() { return this.image ??= new Node(); }
  querySelectorAll() { return this.tabs ?? []; }
  focus() { document.activeElement=this; }
  get value() { return this._value ?? ""; }
  set value(value) { this._value=String(value); }
  get valueAsNumber() { return this.value==="" ? NaN : Number(this.value); }
  checkValidity() { return Number.isFinite(this.valueAsNumber) && this.valueAsNumber>=0; }
  reportValidity() { return this.checkValidity(); }
  showModal() { this.open=true; }
  close() { this.open=false; }
  remove() {}
  select() {}
}
const html=readFileSync("website/index.html","utf8");
const nodes=Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map((m)=>[m[1],new Node()]));
nodes["demo-single"].hidden=true;
const sampleButtons=["lamp","camera","chair"].map((key)=>{const n=new Node();n.dataset.sample=key;return n;});
const copies=["title","description"].map((key)=>{const n=new Node();n.dataset.copy=key;return n;});
const demoTabs=[nodes["tab-batch"],nodes["tab-single"]];
demoTabs[0].id="tab-batch"; demoTabs[1].id="tab-single";
const screenshotTabs=["workspace","setup"].map((key)=>{const n=new Node();n.dataset.screenshot=key;return n;});
const tablists=[new Node(),new Node()];
tablists[0].tabs=demoTabs;tablists[1].tabs=screenshotTabs;
const closeButtons=[new Node(),new Node()];
closeButtons[0].closest=()=>nodes["screenshot-dialog"];closeButtons[1].closest=()=>nodes["guide-dialog"];
const lists={"[data-sample]":sampleButtons,"[data-copy]":copies,".demo-topline [role=\"tab\"]":demoTabs,"[role=\"tablist\"]":tablists,
  "[data-screenshot]":screenshotTabs,"[data-close-dialog]":closeButtons,"dialog":[nodes["screenshot-dialog"],nodes["guide-dialog"]],
  "#navigation a":[],".reveal":[]};
const document={querySelector:(selector)=>selector===".site-header" ? (nodes.header ??= new Node()) : nodes[selector.slice(1)],
  querySelectorAll:(selector)=>lists[selector] ?? [], createElement:()=>new Node(), addEventListener(){},body:new Node()};
let copied="";
const context=createContext({document,structuredClone,Intl,Number,String,Array,Object,Math,Blob,URL,console,
  navigator:{clipboard:{writeText:async(text)=>{copied=text;}}},
  setTimeout:()=>1,clearTimeout(){},window:{addEventListener(){}},IntersectionObserver:class {observe(){} unobserve(){}}});
runInContext(readFileSync("website/app.js","utf8"),context);
assert.equal(nodes["batch-rows"].children.length,3);
assert.match(html, /id="tab-batch" role="tab" aria-selected="true"/);
assert.match(html, /id="demo-single"[^>]* hidden>/);
nodes["tab-single"].click();
assert.equal(nodes["demo-single"].hidden,false);
nodes["listing-title"].value="Mon lot personnel";nodes["listing-title"].fire("input");
nodes["listing-price"].value="39.5";nodes["listing-price"].fire("input");
nodes["tab-batch"].click();
const row=nodes["batch-rows"].children[0];
assert.equal(row.children[1].children[1].value,"Mon lot personnel");
assert.equal(row.children[2].children[1].value,"39.5");
const batchTitle=row.children[1].children[1];
batchTitle.value="Titre modifié en batch";batchTitle.fire("input");
nodes["tab-single"].click();
assert.equal(nodes["listing-title"].value,"Titre modifié en batch");
nodes["copy-listing"].click();
await new Promise(setImmediate);
assert.match(copied,/DÉMONSTRATION/);
assert.match(copied,/Titre modifié en batch/);
assert.match(copied,/39,5/);
assert.ok(runInContext("csvCell('=1+1')",context).startsWith("\"'="));
assert.match(html,/<h1 id="hero-title">Lotigo/);
assert.match(html,/Préparez en batch\.<br>Publiez plus vite sur Leboncoin\./);
assert.match(html,/Une photo par livre, une annonce par photo/);
assert.match(html,/Vérifiez le titre du livre, l'auteur, l'édition, l'état et les prix proposés/);
assert.match(html,/publier chaque annonce manuellement/);
assert.ok(!html.includes("Assistant Photo Leboncoin"));
nodes["copy-project"].click();
await new Promise(setImmediate);
assert.match(copied,/^Lotigo : votre assistant d'annonces par lot pour Leboncoin/);
assert.match(copied,/Une série de livres à vendre/);
assert.match(copied,/publier plus vite, manuellement/);
assert.match(copied,/API payante/);
console.log("OK: batch-first initialization, 3 drafts, edit synchronization, copied title/price, safe CSV and book-series positioning with manual publication. Node-only verification; no browser or API access.");
