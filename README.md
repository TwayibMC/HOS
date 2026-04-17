# HOS PWA — v4

PWA Android. Tout local, IndexedDB, aucun serveur, aucun tracking.

## Contenu

```
hos-pwa-v4/
├── index.html       # App complète (HTML + CSS + JS embarqué)
├── manifest.json    # PWA manifest (installation écran d'accueil)
├── sw.js            # Service Worker (mode offline + detection update)
└── icon.png         # Ton icône (à ajouter, non livrée ici)
```

## Nouveautés v4

**Navigation à 5 onglets avec Home comme racine** :
- **Home** — Salutation "Twayib" + contexte dynamique (tu)
- **Tracking** — 3 sections pliables (Sommeil & énergie / Corps / Din)
- **Board** — Actions du jour (en haut) + Accomplissements 7j/30j + Tendances (sommeil × fatigue)
- **Agenda** — Mois / Semaine, pastilles colorées, tap sur un jour → vue détail avec événements + tâches + tracking
- **To-do** — MIT (Most Important Today, max 3) + Urgent + Backlog

**Changements de schéma (migration m_002 appliquée automatiquement)** :
- `sleep_hours` (float) → `sleep_minutes` (int) pour des moyennes propres
- `quran_min` → `quran_pages` (volume quotidien en pages)
- Nouveaux booléens : `water_2l`, `stretching_morning`, `stretching_evening`, `skincare_done`
- Retrait : `deep_work_min`, `output_units`, `discipline_ratio` (hors scope de la v4)
- Nouveaux stores : `events` (typés : RDV / Appel / Anniv / Sortie / Rappel), `todos`

**Protections préservées depuis v2** :
- Migration framework append-only
- Snapshots automatiques avant chaque migration (3 plus récents conservés)
- Détection de nouvelle version du Service Worker avec prompt user-driven
- Badge d'alerte si export manuel > 7 jours

**DA préservée depuis v3** : palette noir / cuivre / ambre / or / argent oxydé.

## Tooltips `?` disponibles

Tap sur un `?` à côté d'un label pour obtenir l'explication :
- **Durée de sommeil** — comment la mesurer correctement
- **Fatigue (1–5)** — échelle détaillée, subjective mais honnête
- **Dhikr** — définition complète (ذِكْر)

## Événements — typage

Chaque événement a un type qui détermine son icône et sa couleur de liseré :
- 📅 RDV — rendez-vous médicaux, pro, admin
- 📞 Appel — appels à passer
- 🎂 Anniv — anniversaires
- 🚶 Sortie — activités, loisirs
- 🔔 Rappel — mémos génériques

Champs : titre (requis), date (requise), heure (optionnelle), lieu (optionnel), notes (optionnel).

## Todo — logique MIT

La limite **3 MIT par jour** (Most Important Today) est volontaire. Son but : te forcer à prioriser. Si tout est important, rien ne l'est.

Une tâche peut être marquée :
- **★ MIT** seulement — elle apparaît dans la section MIT
- **⚠ Urgent** seulement — elle apparaît dans la section Urgent
- **MIT + Urgent** — elle apparaît en MIT (priorité visuelle)
- **Ni l'un ni l'autre** — Backlog

Les tâches avec `due_date` sont visibles dans l'Agenda au jour correspondant.

## Processus de mise à jour (à garder sous la main)

### Update de code applicatif (pas de changement de schéma)

1. Modifier `index.html`
2. Bumper `CACHE_VERSION` dans `sw.js` (ex: `'hos-v4'` → `'hos-v5'`)
3. Push GitHub
4. Bandeau orange "Nouvelle version disponible" apparaît dans l'heure sur ton tél → Recharger

### Update avec changement de schéma IndexedDB

1. **APPEND** une nouvelle fonction de migration à la fin du tableau `MIGRATIONS`. Jamais modifier les anciennes.
2. Exemple pour ajouter un champ `cardio_min` aux daily :
   ```js
   function m_003_add_cardio(db, tx) {
     const store = tx.objectStore('daily_log');
     store.openCursor().onsuccess = (e) => {
       const cur = e.target.result;
       if (cur) {
         const row = cur.value;
         if (row.cardio_min === undefined) row.cardio_min = 0;
         cur.update(row);
         cur.continue();
       }
     };
   }
   ```
3. `DB_VERSION = MIGRATIONS.length` (automatique)
4. Bumper `CACHE_VERSION` dans `sw.js`
5. Push
6. Snapshot automatique créé dans `backups` avant exécution. Onglet Data pour le voir.

### Règles qu'il ne faut JAMAIS enfreindre

- ❌ Ne jamais supprimer une migration existante
- ❌ Ne jamais modifier une migration déjà déployée
- ❌ Ne jamais appeler `db.deleteObjectStore()` sans plan de préservation
- ✅ Toujours bumper `CACHE_VERSION` à chaque déploiement
- ✅ Toujours faire un export manuel avant un update de schéma

## Installation Android

1. Crée un repo GitHub avec les 4 fichiers (+ ton `icon.png`) à la racine
2. Settings → Pages → branche `main` → Save
3. URL : `https://<user>.github.io/<repo>/`
4. Ouvre l'URL dans Chrome Android → menu ⋮ → "Installer l'application"
5. L'app vit sur ton écran d'accueil, fonctionne offline

## Validation effectuée

- **Structure JS** : 0 déséquilibre sur accolades et parenthèses
- **Migration framework** : fresh install, upgrade partiel, up-to-date skip — les 3 cas OK
- **Drift detection** : détecté sur série réellement croissante
- **Conversion sleep minutes** : 7h30 = 450 min, 6h45 = 405 min
- **Bedtime categorization** : 22:30 → before23, 23:45 → after2330, 01:00 → after2330
- **Pas de référence** à `icon.svg`, `deep_work_min`, `output_units`, `discipline_ratio`, ou `Eisenhower`

## Limites connues

- **Drift detection un peu sensible** sur échantillons courts (< 30 jours). Avec 2 mois de données, faux positifs deviennent rares.
- **Le seed démo n'injecte pas de todos ni d'anciennes entrées** : 2 événements d'exemple et 60 jours de tracking. Pour voir les todos, crée-les manuellement.
- **L'analyse sommeil × fatigue** a besoin d'au moins 14 jours avec les deux champs remplis. Moins que ça → message "pas assez de données".
- **La vue semaine** de l'agenda commence au lundi (convention FR, pas US).
- **Pas testé sur Android réel** — mais HTML/JS standard, IndexedDB bien spécifié. Fais-moi un retour si tu rencontres un comportement inattendu sur ton appareil.

## Ce qui vient derrière si tu veux aller plus loin

- Remettre un moteur d'hypothèses (pour tester formellement si "je me couche avant 23:00 pendant 14j" fait effectivement baisser ma fatigue)
- Rappels / notifications push (limité sans backend)
- Sync entre téléphone et ordi (nécessite un backend)
- Recherche dans les événements / todos
