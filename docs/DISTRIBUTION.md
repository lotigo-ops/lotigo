# Compiler et distribuer

## Compilation Windows

Prerequis pour le developpeur : Windows 64 bits, Node.js 24 LTS, acces Internet
pour recuperer Electron et les outils NSIS. Aucun de ces prerequis Node.js
n'est necessaire pour la personne qui installe le fichier final.

```powershell
npm.cmd install
npm.cmd test
npm.cmd run test:ui
node scripts/security-audit.mjs
npm.cmd run dist
node scripts/check-package.mjs
node scripts/check-packaged-launch.mjs
npm.cmd run source:zip
node scripts/check-source.mjs
npm.cmd run site:prepare
node scripts/check-site.mjs
```

L'installateur est genere dans `release/Lotigo-0.2.0-Setup.exe`.
Le site local est dans `website/index.html`. Le script site:prepare place
l'installateur, les sources et leurs empreintes dans `website/downloads`.
Les telechargements sont `lotigo-setup.exe` et `lotigo-source.zip`.
Le test check-packaged-launch ouvre puis ferme l'executable compile ; il ne
lance aucune analyse et verifie que reglages et historique restent identiques.

Le script source:zip utilise une liste explicite de fichiers et dossiers.
Il exclut `.env`, les donnees personnelles, les essais, les resultats de tests,
les dependances et les compilations. `.env.example` contient une cle vide.
Le paquet Electron inclut uniquement l'application compilee et ses dependances
de fonctionnement. Aucune cle partagee ni photo personnelle ne doit etre ajoutee.

## Mise en ligne

Depot public `lotigo-ops/lotigo`, avec GitHub Pages pour le site
et GitHub Releases pour les fichiers Windows. Pour une diffusion publique :

1. Creer un depot public et y ajouter les sources MIT, sans `.env` ni donnees.
2. Publier une release `v0.2.0` avec l'installateur et les empreintes SHA-256.
3. Heberger le dossier website sur un hebergement statique qui accepte les fichiers `.exe`, ou remplacer le lien de telechargement par l'URL de la release.
4. Ajouter au site l'identite du responsable, le contact d'assistance et les informations de publication appropriees avant ouverture publique.
5. Tester installation et desinstallation sur un second PC, sans environnement de developpement, et verifier la premiere ouverture avec une cle propre a ce PC.

Le fichier `.github/workflows/windows.yml` verifie le code et produit un
installateur sur Windows. Il ne publie aucune release automatiquement.
La commande dist utilise explicitement `--publish never` pour desactiver
la publication implicite d'electron-builder en CI. Aucun GH_TOKEN n'est requis.

### Site GitHub Pages

Dans Settings > Pages du depot, choisir GitHub Actions comme source.
Le workflow `.github/workflows/pages.yml` publie le site lors d'une modification
sur main, ou depuis Run workflow. Il n'installe aucune dependance du logiciel.

```powershell
npm.cmd run site:github -- lotigo-ops/lotigo
node scripts/check-github-site.mjs
```

La preparation genere `release/github-pages` avec uniquement la page et ses
assets. Elle laisse le site local et ses telechargements inchanges. Les liens
publics ciblent la release `v0.2.0` et les assets `lotigo-setup.exe`,
`lotigo-source.zip` et `SHA256SUMS.txt` : deposer ces trois fichiers ensemble
avant de diffuser le lien. Les releases d'essai utilisent un lien de version
explicite, car elles ne sont pas selectionnees par le raccourci latest.
Le site est publie a `https://lotigo-ops.github.io/lotigo/`. Le premier
deploiement a ete verifie avec succes dans GitHub Actions le 11 octobre 2026.
Verifier chaque nouveau deploiement avant de partager son lien.

## Signature de code

La compilation actuelle est non signee. Un certificat de signature de code
ou un service de signature configure avec votre identite d'editeur peut
etre ajoute a electron-builder avant une diffusion large. La signature
ne garantit pas a elle seule l'absence d'avertissement SmartScreen.
Les identifiants de signature doivent etre dans les secrets CI ou
l'environnement du developpeur, jamais dans le depot.

## Protection de la cle API

La cle saisie dans Reglages est chiffree par Electron safeStorage avant toute
ecriture. Sur Windows, la protection est fournie par DPAPI et liee a la session
utilisateur. Le fichier settings.json ne contient que le texte chiffre en Base64,
pas une cle simplement masquee. L'enregistrement est refuse si le chiffrement
est indisponible ; aucun repli vers un stockage en clair n'est autorise.

La configuration transmise a l'interface contient uniquement des indicateurs,
jamais la cle sauvegardee. Les appels API partent du processus principal. Les
deux clients fixent https://api.openai.com/v1 et logLevel off pour ignorer les
variables OPENAI_BASE_URL et OPENAI_LOG. Les erreurs API sont remplacees par
des messages generiques sans reprendre leur contenu brut.

Le fichier .env de developpement reste un stockage en clair. Il est ignore
par la version installee et exclu des archives, mais sa copie locale doit etre
protegee. Preferer Reglages et ne conserver aucune copie de cle inutile.
Une cle deja apparue dans un journal ou partagee doit etre revoquee et remplacee,
meme si sa sauvegarde locale est chiffree.

DPAPI ne protege pas contre un logiciel malveillant dans la meme session
Windows, un administrateur ayant compromis le poste, ni la lecture de la memoire
du processus. La cle existe temporairement en clair pendant la saisie et les
appels API. Cette verification n'est pas une certification ni un test d'intrusion.

References : [Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage)
et [OpenAI, bonnes pratiques de production](https://developers.openai.com/api/docs/guides/production-best-practices).

## Sauvegardes et mises a jour

Les donnees sont dans `%APPDATA%/leboncoin-photo-assistant` : `settings.json`
(cle chiffree et preferences) et `listing-history.json` (photos preparees et
annonces). Lotigo conserve explicitement ce dossier historique, meme si le
nom commercial change. `name` et `appId` gardent aussi leur valeur initiale.
L'installateur conserve les donnees lors de la desinstallation. Ne changez
pas `name` dans package.json sans prevoir une migration de ces donnees.
Avant une diffusion publique, verifier la disponibilite du nom Lotigo et du
nom de domaine souhaite : le changement de marque ne constitue pas une verification.

En cas de fichier illisible, fermez l'application, faites une copie du dossier,
puis renommez uniquement le fichier concerne avec une extension `.backup`.
Les reglages pourront etre recrees ; gardez l'historique sauvegarde pour
recuperation. Ne supprimez pas le dossier avant d'avoir fait une copie.
