# Utiliser Lotigo

## Installer et ouvrir

Double-cliquez sur `Lotigo-0.2.0-Setup.exe`. L'installateur
est en francais. Il cree les raccourcis et propose de lancer l'application.
Vous n'avez pas besoin de Node.js ni d'un fichier `.env`.
Le raccourci Windows porte le nom Lotigo : votre assistant d'annonces par lot
pour Leboncoin.

Cette premiere version est non signee : Windows peut afficher un editeur
inconnu. Utilisez uniquement la source de telechargement officielle du projet
et comparez l'empreinte SHA-256. Ne diffusez pas votre cle avec le logiciel.

## Choisir un mode

A la premiere ouverture, choisissez la demonstration ou l'analyse OpenAI.
La demonstration produit des exemples fictifs, identifies dans l'interface,
les copies et les exports. Elle ne reconnait pas reellement les objets.

Pour analyser vos objets :

1. Ouvrez [la plateforme OpenAI](https://platform.openai.com/api-keys).
2. Connectez-vous, choisissez votre projet et creez une cle API secrete.
3. Activez la [facturation API](https://platform.openai.com/settings/organization/billing/overview). Les abonnements ChatGPT Plus et Pro ne paient pas les appels de cette application.
4. Collez la cle dans l'assistant. Le bouton Tester la connexion verifie la cle et l'acces au modele, sans analyse facturee ; il ne garantit pas la disponibilite de credits.
5. Confirmez l'envoi des photos a OpenAI, indiquez votre lieu de remise si souhaite, puis ouvrez l'application.

Les reglages permettent de changer de mode, de remplacer ou de retirer une
cle. La cle saisie est chiffree localement avec la protection Windows. Les
autres programmes de votre session Windows ne sont pas bloques par cette
protection. Elle ne remplace pas la securite de votre compte Windows.
Le bouton Afficher ne revele que la cle en cours de saisie, jamais celle deja
enregistree. Retirer la cle efface sa sauvegarde dans Lotigo, mais ne la revoque
pas sur votre compte OpenAI.

Utilisez une cle dediee a Lotigo avec des permissions restreintes. Si une cle
est apparue dans un journal ou a ete partagee, revoquez-la sur OpenAI puis
enregistrez une nouvelle cle dans Reglages. Le fichier .env du projet, reserve
au developpement, contient sa cle en clair : evitez d'y conserver une copie.

## Preparer les annonces

Deposez une image JPG, PNG ou WebP, ou choisissez-la dans l'explorateur. La
taille maximale par fichier est de 20 Mo. Les images sont redimensionnees
avant analyse et enregistrement ; les originaux ne sont pas modifies.

Dans Une annonce, lancez l'analyse puis relisez et modifiez le titre, la
description, le prix, l'etat et la categorie. Les details contiennent la
marque, le modele, les fourchettes de prix, les notes personnelles et les
points a verifier. Les notes ne sont pas incluses dans l'annonce copiee.

Dans Analyse par lot, plusieurs photos produisent plusieurs annonces. Les
analyses se suivent une par une. Une erreur concerne seulement sa photo.
La pause prend effet apres l'image en cours. Une photo retiree du lot reste
dans l'historique si elle a deja ete analysee.

Les resultats sont des propositions. Verifiez les marques, references,
dimensions, defauts, fonctionnement et prix avant publication.

## Copier, exporter et retrouver

Les boutons copient le titre, la description, le prix ou l'annonce complete.
Le lieu de remise provient des reglages et peut etre laisse vide.

Choisissez un export puis son emplacement dans la boite Windows :

- HTML : photos integrees et textes, consultables hors ligne dans un navigateur.
- CSV : tableau compatible Excel avec separateurs point-virgule et encodage UTF-8.
- XLSX : classeur Excel avec prix numeriques, filtres et ligne d'en-tete fixe, sans photos.

Les CSV et XLSX incluent aussi les notes internes : gardez ces fichiers pour
vous. Les fichiers de demonstration sont marques comme fictifs.

L'historique est conserve sur votre ordinateur et revient au redemarrage.
Cliquez sur une photo pour restaurer une annonce. La corbeille de l'historique
supprime definitivement cette photo et ses informations locales, apres
confirmation. Les fichiers deja exportes restent a leur emplacement.

## Erreurs OpenAI

Une cle invalide doit etre remplacee dans les reglages. Une limite de debit
necessite d'attendre avant de relancer la photo concernee. Un quota financier
epuise active la demonstration pour la suite du lot. Apres avoir recharge
les credits, enregistrez les reglages pour retenter les analyses en ligne.

Les photos envoyees sont soumises aux [regles de donnees OpenAI](https://developers.openai.com/api/docs/guides/your-data).
L'application utilise `store: false` pour les reponses ; ce parametre ne
supprime pas les autres politiques de conservation d'OpenAI.
