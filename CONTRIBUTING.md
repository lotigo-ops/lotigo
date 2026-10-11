# Contribuer

Le projet est distribue sous licence MIT. Les contributions sont bienvenues.

Utilisez Node.js 24 LTS et Windows pour produire l'installateur.

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run build
npm.cmd run dev
```

Les tests ne consomment aucun appel OpenAI. Le mode demonstration permet de
travailler sans cle. Conservez les cles et les photos personnelles hors du depot.
Le script `npm.cmd run source:zip` cree une archive a partir d'une liste de
dossiers autorises ; il n'inclut pas `.env`, `outputs`, `work` ni les donnees
de l'application.

Pour une modification de l'interface, verifiez les espaces Une annonce,
Analyse par lot, Historique et Reglages. Une nouvelle fonction ne doit pas
introduire de publication automatique sur Leboncoin.
