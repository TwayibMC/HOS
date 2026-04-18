# HOS PWA — v5

PWA Android. Tout local, IndexedDB, aucun serveur, aucun tracking.

## Contenu

```
hos-pwa-v5/
├── index.html       # App complète (HTML + CSS + JS embarqué)
├── manifest.json    # PWA manifest (installation écran d'accueil)
├── sw.js            # Service Worker (mode offline + detection update)
└── icon.png         # Ton icône (à ajouter, non livrée ici)
```

## Nouveautés v5 (correctifs)

**4 bugs corrigés depuis v4 :**

- **m_003 async bug (critique)** — La migration originale utilisait un curseur asynchrone dans `onupgradeneeded`. La transaction IndexedDB se ferme dès que le callstack synchrone est vide : les `cursor.update()` arrivaient trop tard, provoquant un `TransactionInactiveError` silencieux sur toute base avec des todos existants. Corrigé en `getAll()` + boucle `put()` synchrone.
- **m_004 ajoutée** — Repair run idempotent qui re-applique `is_grocery = 0` sur les todos qui auraient été manqués par le bug de m_003. Les appareils déjà à DB_VERSION=3 passent proprement à v4.
- **Drift detection** — Le z-score était calculé sur le dernier point isolé. Un pic d'une nuit déclenchait une fausse alerte. Corrigé : z-score calculé sur la moyenne des 5 derniers jours. La tendance doit être soutenue pour déclencher un signal.
- **Import avec validation de schéma** — L'import acceptait silencieusement des exports pré-v4 (champs `sleep_hours`, `deep_work_min`, etc.), corrompant les stats sans erreur. L'import détecte maintenant les champs legacy et refuse avec un message explicite.
- **wipeData complet** — Le wipe n'effaçait pas le store `meta` (dont `last_export_at`). Après un wipe, le badge d'export restait silencieux sur une base vide, donnant une fausse impression de sauvegarde à jour. Le wipe efface maintenant `daily_log`, `events`, `todos` et `meta`. Les backups (snapshots de migration) sont conservés intentionnellement — ils permettent de récupérer des données d'une version antérieure.

## Historique des versions

### v4
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
- Retrait : `deep_work_min`, `output_units`, `discipline_ratio` (hors scope)
- Nouveaux stores : `events` (typés : RDV / Appel / Anniv / Sortie / Rappel), `todos`

## Protections préservées depuis v2

- Migration framework append-only
- Snapshots automatiques avant chaque migration (3 plus récents conservés)
- Détection de nouvelle version du Service Worker avec prompt user-driven
- Badge d'alerte si export manuel > 7 jours

## DA

Palette : noir / cuivre / ambre / or / argent oxydé.

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

La limite **3 MIT par jour** est volontaire. Son but : te forcer à prioriser. Si tout est important, rien ne l'est.

Une tâche peut être marquée :
- **★ MIT** seulement — elle apparaît dans la section MIT
- **⚠ Urgent** seulement — elle apparaît dans la section Urgent
- **MIT + Urgent** — elle apparaît en MIT (priorité visuelle)
- **Ni l'un ni l'autre** — Backlog

Les tâches avec `due_date` sont visibles dans l'Agenda au jour correspondant.

## Processus de mise à jour (à garder sous la main)

### Update de code applicatif (pas de changement de schéma)

1. Modifier `index.html`
2. Bumper `CACHE_VERSION` dans `sw.js` (ex: `'hos-v0.1.9'` → `'hos-v0.2.0'`)
3. Push GitHub
4. Bandeau orange "Nouvelle version disponible" apparaît dans l'heure sur ton tél → Recharger

### Update avec changement de schéma IndexedDB

1. **APPEND** une nouvelle fonction de migration à la fin du tableau `MIGRATIONS`. Jamais modifier les anciennes (exception : si tu es certain qu'aucun appareil n'a jamais exécuté cette migration — à documenter explicitement).
2. Exemple pour ajouter un champ `cardio_min` aux daily :
   ```js
   function m_005_add_cardio(db, tx) {
     const store = tx.objectStore('daily_log');
     const req = store.getAll();
     req.onsuccess = () => {
       for (const row of (req.result || [])) {
         if (row.cardio_min === undefined) {
           row.cardio_min = 0;
           store.put(row);
         }
       }
     };
   }
   ```
   **Règle impérative** : toujours utiliser `getAll()` + boucle `put()`. Ne jamais utiliser `openCursor()` dans `onupgradeneeded` — la transaction se ferme avant que les callbacks arrivent.
3. `DB_VERSION = MIGRATIONS.length` (automatique)
4. Bumper `CACHE_VERSION` dans `sw.js`
5. Push
6. Snapshot automatique créé dans `backups` avant exécution.

### Règles qu'il ne faut JAMAIS enfreindre

- ❌ Ne jamais supprimer une migration existante
- ❌ Ne jamais modifier une migration déjà déployée sur un appareil réel
- ❌ Ne jamais utiliser `openCursor()` dans `onupgradeneeded` (bug async — voir m_003)
- ❌ Ne jamais appeler `db.deleteObjectStore()` sans plan de préservation
- ✅ Toujours bumper `CACHE_VERSION` à chaque déploiement
- ✅ Toujours faire un export manuel avant un update de schéma
- ✅ Toujours utiliser `getAll()` + boucle `put()` pour les migrations de données

## Installation Android

1. Crée un repo GitHub avec les 4 fichiers (+ ton `icon.png`) à la racine
2. Settings → Pages → branche `main` → Save
3. URL : `https://<user>.github.io/<repo>/`
4. Ouvre l'URL dans Chrome Android → menu ⋮ → "Installer l'application"
5. L'app vit sur ton écran d'accueil, fonctionne offline

## Validation effectuée (v5)

- **m_003 fix** : base avec todos existants → `is_grocery` bien appliqué, pas de `TransactionInactiveError`
- **m_004 repair** : base laissée en DB_VERSION=3 avec todos sans `is_grocery` → champ ajouté proprement à l'upgrade v4
- **Drift detection** : pic isolé sur 1 jour → plus de fausse alerte ; tendance soutenue 5j → signal correct
- **Import validation** : export pré-v4 avec `sleep_hours` → refus avec message ; export v4/v5 → import propre
- **Wipe + badge export** : après wipe, badge s'affiche immédiatement si des données existent (meta effacé)

## Limites connues

- **Drift detection un peu sensible** sur échantillons courts (< 30 jours). Avec 2 mois de données, faux positifs deviennent rares.
- **Le seed démo n'injecte pas de todos ni d'anciennes entrées** : 2 événements d'exemple et 60 jours de tracking. Pour voir les todos, crée-les manuellement.
- **L'analyse sommeil × fatigue** a besoin d'au moins 14 jours avec les deux champs remplis.
- **La vue semaine** de l'agenda commence au lundi (convention FR, pas US).
- **Pas testé sur Android réel** — HTML/JS standard, IndexedDB bien spécifié.

## Ce qui vient derrière si tu veux aller plus loin

- Remettre un moteur d'hypothèses (tester formellement si "je me couche avant 23:00 pendant 14j" fait baisser la fatigue)
- Rappels / notifications push (limité sans backend)
- Sync entre téléphone et ordi (nécessite un backend)
- Recherche dans les événements / todos

