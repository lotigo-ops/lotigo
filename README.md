# Lotigo

Votre assistant d'annonces par lot pour Leboncoin. Application Windows gratuite
et open source, sous licence MIT : plusieurs photos, des titres, des descriptions
et des prix estimes pour chaque objet. Electron, React et TypeScript.

## Utilisateur

Projet public : [lotigo-ops/lotigo](https://github.com/lotigo-ops/lotigo).
Les versions Windows sont disponibles dans [Releases](https://github.com/lotigo-ops/lotigo/releases).
La version 0.2.0 est une version d'essai, non signee : Windows peut afficher
un avertissement d'editeur inconnu. Un test sur un second PC reste a effectuer.

Installez le fichier Windows de la release. A la premiere ouverture, choisissez
la demonstration ou suivez l'assistant de connexion OpenAI. Aucun fichier
`.env` et aucune installation Node.js ne sont necessaires avec l'installateur.

Le logiciel est gratuit. Les appels OpenAI sont factures par OpenAI sur le
compte de chaque utilisateur. La demonstration fournit des exemples fictifs.

Une annonce, analyse sequentielle par lot, historique local, edition des champs,
copie et export HTML avec images, CSV et Excel. La publication sur Leboncoin
reste manuelle. Les cles sont chiffrees sur Windows et exclues des exports.

Voir [le guide utilisateur](docs/GUIDE_UTILISATEUR.md).

## Developpement

Prerequis : Node.js 24 LTS et Windows pour produire l'installateur.

```powershell
npm.cmd install
npm.cmd run dev
```

La connexion se configure dans Reglages. Le fichier `.env` reste disponible
pour le developpement : copiez `.env.example`, puis renseignez OPENAI_API_KEY
et eventuellement OPENAI_MODEL. Une cle enregistree dans les reglages est
prioritaire. Le mode demonstration prend le pas sur toute cle configuree.
Les versions installees ignorent `.env` et les variables de cle du developpeur.

## Verifier et compiler

```powershell
npm.cmd test
npm.cmd run test:ui
node scripts/security-audit.mjs
npm.cmd run dist
```

Les tests utilisent une API simulee et des donnees isolees : aucun appel facture.
Le script test:ui ouvre des fenetres de test puis les ferme. Les captures et les
exports de test sont dans outputs/. L'installateur est genere dans
release/Lotigo-0.2.0-Setup.exe.
L'audit de securite utilise une cle fictive et un profil temporaire. Tous ses
appels sont interceptes : il ne contacte pas OpenAI, ne lit pas votre vraie cle
et ne touche pas au presse-papiers. Il verifie le chiffrement, le refus sans
stockage protege, les erreurs, le retrait de cle et les restrictions d'endpoint
et de journalisation. Executer le build avant cet audit si le code a change.

```powershell
npm.cmd run source:zip
npm.cmd run site:prepare
npm.cmd run site:github -- lotigo-ops/lotigo
```

Voir [la diffusion publique](docs/DISTRIBUTION.md),
[le plan de revision](docs/PLAN_ACTION.md), [le bilan](docs/BILAN_REVISION.md)
et [la contribution](CONTRIBUTING.md).
La page de presentation locale est website/index.html. Le projet est independant
de Leboncoin et d'OpenAI.

Le nom public est Lotigo. Le nom technique `leboncoin-photo-assistant` et
l'identifiant d'application sont conserves pour retrouver les donnees des
versions precedentes. Disponibilite du nom et des domaines non verifiee.
