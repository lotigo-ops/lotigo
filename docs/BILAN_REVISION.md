# Bilan de revision - version 0.2.0

Date : 11 octobre 2026. Livraison locale pour essai, sans mise en ligne.

## Resultat

- Interface reorganisee en Une annonce, Analyse par lot et Historique.
- Premiere ouverture guidee : demonstration sans compte ou connexion OpenAI.
- Installateur Windows 64 bits en francais, licence MIT et raccourcis.
- Site statique local avec captures reelles, telechargements et questions frequentes.
- Sources diffusables, guide utilisateur, guide de compilation et verification Windows automatisee.

Le logiciel est gratuit ; les analyses OpenAI utilisent le compte personnel
et la facturation API de chaque utilisateur. Aucune publication Leboncoin
et aucune automatisation de navigateur ne sont ajoutees.

## Fichiers modifies ou ajoutes

| Ensemble | Fichiers | Role |
| --- | --- | --- |
| Compilation | package.json, package-lock.json, electron.vite.config.ts | Versions, scripts, entree Electron et preload CJS, installateur NSIS |
| Processus principal | src/main/index.ts, settings.ts, storage.ts | API sequentielle, reglages, cle chiffree, validation IPC, historique atomique, exports Windows |
| Contrats | src/shared/types.ts, validation.ts, history.ts | Types, controles des donnees, compatibilite des anciennes demonstrations |
| Prechargement | src/preload/index.ts | API limitee entre l'interface isolee et Electron |
| Interface | src/renderer/index.html, src/renderer/src/App.tsx, styles.css | Navigation, progression, recherche, sauvegardes, erreurs et adaptation aux petites fenetres |
| Composants | src/renderer/src/ListingEditor.tsx, SettingsPanel.tsx, ConfirmDelete.tsx | Edition, copies, assistant OpenAI, suppression confirmee |
| Exports | src/renderer/src/exports.ts | HTML autonome, CSV protege, ExcelJS, identification des exemples fictifs |
| Installation | build/icon.ico, build/installer.nsh | Icone et explications pendant l'installation |
| Tests | tests/core.test.ts, scripts/test.mjs, ui-smoke.mjs, check-package.mjs, check-packaged-launch.mjs, check-site.mjs | Tests logiques, application Electron, contenu du paquet et page de presentation |
| Distribution | scripts/package-source.mjs, prepare-site.mjs, .github/workflows/windows.yml | Archive source sans secrets, telechargements et compilation Windows en CI |
| Documentation | README.md, LICENSE, CONTRIBUTING.md, .env.example, .gitignore, docs/* | Utilisation, securite, plan, limites et diffusion |
| Site | website/index.html, style.css, assets/* | Presentation locale, aucune collecte ni service distant ajoute |

## Dependances

Ajouts : ExcelJS pour remplacer l'ancien generateur XLSX, Playwright pour
tester l'application reelle, JSZip pour produire l'archive des sources.

Mises a jour principales : Electron 44.7.0, electron-builder 26.15.3,
electron-vite 5, Vite 7 et son plugin React 5. Electron et electron-builder
sont fixes a leur version testee. Les fichiers de verrouillage sont synchronises.
Une resolution uuid 11.1.1 est appliquee a ExcelJS.

## Parcours utilisateur

1. Lancer l'installateur puis ouvrir l'application avec son raccourci.
2. Choisir Demonstration, ou creer son propre compte/projet OpenAI, configurer
   sa facturation API et saisir sa cle dans l'assistant. Les liens officiels
   sont inclus ; une souscription ChatGPT ne remplace pas la facturation API.
3. Accepter explicitement l'envoi des photos pour l'analyse en ligne.
4. Deposer une photo ou plusieurs JPG/JPEG/PNG/WebP, puis lancer l'analyse.
5. Modifier les champs, copier les informations ou choisir HTML, CSV ou XLSX.
   Un dialogue Windows permet de choisir le fichier de destination.
6. Retrouver les annonces dans Historique en cliquant sur une photo.

Le test de connexion verifie l'acces au modele, sans lancer d'analyse payante.
Il ne garantit pas qu'il reste des credits. Le mode demonstration et les
resultats generes apres un quota insuffisant sont toujours signales, y compris
dans les copies et les exports. Les prix estimes doivent etre verifies avant
publication manuelle.

## Verifications effectuees

- Deux configurations TypeScript controlees, compilation Electron reussie.
- Cinq tests logiques passes : ecritures concurrentes, validation, compatibilite,
  echappement des exports, relecture d'un XLSX de 200 annonces.
- Tests Playwright dans Electron reel : premiere ouverture, preload sandboxe,
  import multiple, analyse par lot, edition, copies, exports HTML/CSV/XLSX,
  redemarrage, restauration et suppression de l'historique.
- Test de cle fictive : chiffrement dans les reglages et absence de cle dans
  la configuration transmise a l'interface, retrait prioritaire sur une cle
  de remplacement et consentement requis apres une premiere utilisation demo.
- Simulation 429 insufficient_quota : bascule en demonstration, sans nouvelle
  requete refusee pour les images suivantes.
- Inspection du paquet : chemins d'entree corrects et exclusion de la cle de
  developpement, de .env et de l'historique local.
- Lancement de l'executable compile : preload isole fonctionnel, .env de
  developpement ignore, aucun changement des reglages ou de l'historique.
- Site controle aux formats bureau et mobile, images presentes et absence
  de debordement horizontal.
- Audit npm des dependances de fonctionnement : aucune vulnerabilite signalee.

Un agent independant a relu l'existant puis les corrections. Ses findings
sur la conservation des modifications, les doubles analyses, les suppressions,
la fermeture pendant une ecriture/export, le retrait de cle et les anciennes
demonstrations ont ete corriges et revalides. Sa derniere revue ciblee n'a
identifie aucun probleme restant sur ces points. Ce controle ne constitue
pas une certification de securite exhaustive.

## Limites et dernieres etapes publiques

- L'installateur est non signe : Windows peut afficher un avertissement.
  Choisir une identite d'editeur et une solution de signature avant diffusion large.
- Installation/desinstallation sur un second PC sans Node.js encore a faire.
  Les lancements Electron et executable compile sont testes, pas ce scenario externe.
- Aucun appel OpenAI reel n'a ete effectue, pour ne pas consommer le quota
  personnel. Faire un essai volontaire avec une cle et un budget limites.
- Huit alertes npm moderees subsistent dans les outils de compilation,
  dans la chaine electron-builder/global-agent/sprintf-js ; elles ne sont pas
  dans les dependances de fonctionnement. Suivre leur correction en amont.
  Aucun downgrade force n'est applique.
- Le site n'est pas publie et aucun depot GitHub n'est cree. Il reste a choisir
  l'hebergement, l'identite/contact public et publier une release avec les sources.
- Les reglages utilisent le chiffrement Windows ; les photos et annonces
  de l'historique restent des fichiers locaux non chiffres. Ne pas promettre
  un chiffrement complet des donnees ou une sauvegarde distante.

Voir PLAN_ACTION.md pour le plan complet et DISTRIBUTION.md pour les commandes
et la checklist de mise en ligne.
