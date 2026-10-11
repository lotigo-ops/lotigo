# Plan de revision et de diffusion

## 1. Audit de l'existant

Responsable : agent principal. Controle : agent relecteur independant.

- Examiner le lancement Electron, les donnees, la connexion OpenAI et les exports.
- Identifier les situations de perte de modification, les doubles analyses et les confusions entre photo et annonce.
- Etablir des criteres de verification concrets avant les modifications.

Livrable : revue initiale avec bugs reproductibles et criteres de validation.

## 2. Fondations et protection des donnees

- Conserver le nom de l'application pour retrouver l'historique existant.
- Serialiser les modifications de l'historique et ecrire les fichiers via un fichier temporaire, puis remplacement.
- Valider les images et les reponses structurees, isoler le renderer et limiter les appels IPC a la fenetre de l'application.
- Enregistrer la cle API avec le chiffrement Windows ; ne jamais la renvoyer au renderer une fois sauvegardee.
- Maintenir .env pour le developpement et exclure les secrets des paquets diffuses.

Validation : sauvegardes concurrentes, redemarrage, contenu chiffre du fichier de reglages, absence de cle dans la configuration publique.

## 3. Parcours de premiere ouverture

- Choix entre demonstration et analyse en ligne.
- Explication du compte et du projet OpenAI, de la facturation API distincte de ChatGPT et de la creation d'une cle.
- Liens vers les pages officielles, saisie masquee, test de connexion et accord explicite pour envoyer les photos a OpenAI.
- Preferences de lieu de remise, modification du modele, remplacement et retrait de la cle.
- Retour possible a la demonstration sans compte.

Validation : un utilisateur sans environnement de developpement peut terminer le parcours sans manipuler de fichier de configuration.

## 4. Interface et flux quotidiens

- Espaces Une annonce, Analyse par lot et Historique.
- Titre, description et prix visibles en premier ; details et notes internes accessibles dans une section depliante.
- Photographies preparees a taille raisonnable ; nouveaux fichiers separant correctement les annonces precedentes.
- Lots analyses une image a la fois, progression globale, pause apres l'image courante et relance par photo.
- Copie avec retour visible, exports individuels et par lot, dialogue Windows d'enregistrement.
- Historique avec recherche, restauration par photo et suppression confirmee.

Validation : utilisation a plusieurs tailles de fenetre, absence de defilement horizontal, conservation des modifications, aucune seconde analyse automatique pour un resultat individuel deja prepare.

## 5. Exports et erreurs

- HTML autonome avec photos et textes echappes.
- CSV UTF-8 pour Excel, cellules textuelles protegees contre les formules.
- XLSX genere avec ExcelJS, prix numeriques et filtres.
- Demonstrations clairement identifiees dans l'interface, les copies et les fichiers.
- Quota epuise : bascule en demonstration pour la suite, sans refaire les appels refuses ; autres erreurs limitees a l'objet concerne.

Validation : classeur de 200 annonces, fichiers exportes ouverts ou relus, simulation du quota et tests sans appel OpenAI reel.

## 6. Installateur Windows

- Mise a jour d'Electron et de l'outil d'installation.
- Installateur NSIS en francais, page de bienvenue expliquant OpenAI, licence MIT et raccourcis.
- Paquet autonome 64 bits et sources diffusables sans donnees personnelles.
- Revue du contenu ASAR et verification des chemins d'entree et de prechargement apres compilation.

Validation : compilation, inspection du paquet et lancement ; essai d'installation/desinstallation sur un autre PC avant annonce publique.

## 7. Site et open source

- Page statique locale : captures reelles, telechargement Windows, sources MIT, instructions OpenAI et questions frequentes.
- Archive source construite par liste explicite ; empreintes SHA-256 des telechargements.
- Documentation d'utilisation, de contribution et de compilation ; verification Windows sur GitHub Actions.

Livrable local : dossier website/, installateur et archive source. Publication restante : depot public, URL de telechargement, hebergement et identite/contact du responsable.

## 8. Controle independant et ouverture publique

Le relecteur travaille sans modifier les fichiers. Il examine l'etat initial,
puis la revision, pendant que l'agent principal implemente et verifie les
autres parties. Chaque finding concret est corrige ou documente ; les tests
concernes sont rejoues. Le compte rendu final indique les verifications
reussies et leurs limites.

La signature de code avec une identite d'editeur et le test sur un autre PC
sont des etapes de diffusion distinctes. Un installateur non signe est fourni
pour l'essai local, mais peut susciter un avertissement Windows. Les appels
OpenAI reels ne sont pas effectues pendant cette revision afin de ne pas
consommer le quota personnel du developpeur.
