# Site de presentation Lotigo

Le site reste local dans website/index.html : ouverture directe dans un
navigateur, aucun serveur et aucune installation supplementaire necessaires.
Le site est aussi publie avec GitHub Pages : https://lotigo-ops.github.io/lotigo/.
C'est cette adresse publique qui peut etre partagee sur un reseau social,
pas l'adresse locale du fichier. Les installateurs sont heberges dans
les releases de https://github.com/lotigo-ops/lotigo.

## Changements

- Nouvelle composition pleine largeur avec photographies d'illustration.
- Marque Lotigo, signature "Votre assistant d'annonces par lot pour Leboncoin",
  icone Lucide Layers commune au site et a l'application.
- Apercu interactif de trois objets : titre, description, prix et etat modifiables.
- Positionnement principal : creation de titres et estimation de prix par lot,
  avec la vue batch affichee par defaut. La vue individuelle reste accessible.
- Benefice mis en avant : preparer les annonces en batch pour gagner du temps
  lors de la publication manuelle sur Leboncoin. Cas concret : une serie de
  livres, une photo par livre et une annonce par photo. La FAQ rappelle de
  verifier le titre, l'auteur, l'edition, l'etat et les estimations de prix.
  La presentation a copier reprend ce message. Aucun ajout de fonction au logiciel.
- Les modifications sont conservees entre les vues Une annonce et Un lot,
  uniquement en memoire dans le navigateur. Recharger remet les exemples a zero.
- Copies explicitement marquees demonstration, export CSV d'exemple protege
  contre les cellules interpretees comme formules.
- Captures reelles de l'application avec agrandissement et navigation au clavier.
- Guide de connexion OpenAI, FAQ depliante et menu mobile.
- Animations discretes des sections, desactivees si les mouvements reduits sont demandes.
- Liens de telechargement, cle personnelle, API payante et installateur non signe visibles.

Les exemples ne sont pas des analyses reelles : aucune photo n'est envoyee,
aucune cle n'est demandee sur le site et aucun appel API n'y est fait. Il n'y
a ni compte, ni suivi, ni stockage persistant des textes modifies.

## Fichiers

website/index.html, website/style.css et website/app.js contiennent la page.
website/assets contient les captures, quatre visuels generes et les icones
Lucide locales avec leur licence. VISUELS.md donne les prompts et la provenance.
Les scripts site-icons.mjs et check-site.mjs permettent de regenerer les icones
et de verifier les interactions et les ecrans bureau/mobile.
site-assets.mjs cree des versions WebP legeres, sans recadrer ni redimensionner
les sources PNG. La page utilise ces versions optimisees, conservees localement.

Aucune dependance ajoutee. Le changement de marque touche aussi les libelles
de l'application et l'installateur Windows, reconstruit sous le nom Lotigo.
Les captures reelles sont regenerees et les liens utilisent les nouveaux noms
lotigo-setup.exe et lotigo-source.zip. Les donnees existantes restent dans
le dossier technique historique, sans migration ni suppression.

## Verification et preparation

```powershell
node --check website/app.js
node scripts/check-site-state.mjs
node scripts/check-site.mjs
npm.cmd run source:zip
node scripts/check-source.mjs
npm.cmd run site:prepare
npm.cmd run site:github -- lotigo-ops/lotigo
node scripts/check-github-site.mjs
```

Les tests ouvrent le fichier local dans Edge avec Playwright et verifient
les editions, copies, CSV, onglets au clavier, dialogues, FAQ, menu mobile,
liens de telechargement et absence de requete Internet. Cinq tailles d'ecran
sont controlees : 1920, 1366, 768, 390 et 360 pixels de large. Les captures
sont dans outputs/.
Le dernier changement de positionnement (batch affiche par defaut) est aussi
controle par check-site-state.mjs avec un DOM simule, sans ouvrir de navigateur.
Ce controle ne remplace pas une verification visuelle des derniers textes.
Le controle navigateur du fichier local a ete bloque par la politique du
navigateur integre. La verification du nouveau nom et du message sur les series
de livres reste donc limitee au code et aux tests d'etat ; les tests visuels de
la revision precedente ne valident pas les derniers textes Lotigo.

Pour la mise en ligne, conserver le dossier website entier, dont downloads/,
ou remplacer les liens de telechargement par les URL d'une release publique.
Voir DISTRIBUTION.md. Ajouter l'identite et le contact publics avant diffusion.
