# Scénario L2 Intermédiaire : Catégorisation des Jours Fériés et Statistiques SQL

Ce scénario est destiné à un étudiant de 2ème année. Il requiert environ **1 heure à 1 heure 15** de travail. Il est plus complet car il demande de modifier la structure de la base de données, d'écrire une requête SQL d'agrégation (`GROUP BY` et `SUM CASE`) côté Express, et de créer un composant de statistiques côté React.

---

## Objectif du Scénario
L'entreprise souhaite distinguer deux types de jours fériés :
1. **National** : Jours fériés officiels (ex: Jour de l'An, Fête du Travail).
2. **Entreprise** : Jours de fermeture exceptionnels accordés par la direction (ex: Journée de cohésion, ponts).

L'étudiant doit ajouter ce champ **Catégorie**, afficher la catégorie de chaque jour dans le tableau, et ajouter un encadré de statistiques au-dessus de la liste affichant le total cumulé de jours chômés pour chaque catégorie (une journée entière compte pour `1.0` jour, une demi-journée `MATIN` ou `APRES_MIDI` compte pour `0.5` jour).

---

## 🛠️ Partie 1 : Base de données SQLite (`server/database.js`)
L'étudiant doit ajouter une colonne `categorie` à la table `holiday_public`.

* **Fichier à modifier** : [`server/database.js`](file:///d:/shania/itu/L3/dolibarr/server/database.js)

```js
// Dans la fonction init(), modifier la table :
db.run(`
  CREATE TABLE IF NOT EXISTS holiday_public (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    dateHoliday TEXT    NOT NULL,
    label       TEXT    NOT NULL DEFAULT '',
    categorie   TEXT    NOT NULL DEFAULT 'NATIONAL', -- 🌟 AJOUT (NATIONAL ou ENTREPRISE)
    fkUser      INTEGER,
    typePeriode TEXT    NOT NULL DEFAULT 'JOURNEE_ENTIERE'
  )
`);
```
*Note : Pour appliquer le changement, l'étudiant doit supprimer son fichier `server/dolisync.db` et redémarrer Express.*

---

## ⚡ Partie 2 : Backend Express & Requêtes SQL (`server/routes/holidayPublic.js`)
L'étudiant doit modifier le contrôleur pour gérer la nouvelle colonne et créer un nouvel endpoint pour calculer les statistiques.

* **Fichier à modifier** : [`server/routes/holidayPublic.js`](file:///d:/shania/itu/L3/dolibarr/server/routes/holidayPublic.js)

### 2a. Mettre à jour les routes CRUD existantes (POST et PUT)
Il faut récupérer et sauvegarder le champ `categorie` provenant du corps de la requête.

* **Route POST** :
  ```js
  const { dateHoliday, label = '', categorie = 'NATIONAL', fkUser = null, typePeriode = 'JOURNEE_ENTIERE' } = req.body;
  // ...
  db.run(
    'INSERT INTO holiday_public (dateHoliday, label, categorie, fkUser, typePeriode) VALUES (?, ?, ?, ?, ?)',
    [dateHoliday, label, categorie, fkUserVal, typePeriode]
  );
  ```

* **Route PUT** :
  ```js
  const { dateHoliday, label, categorie, fkUser, typePeriode } = req.body;
  const updated = {
    // ...
    categorie: categorie ?? existing.categorie,
  };
  db.run(
    'UPDATE holiday_public SET dateHoliday = ?, label = ?, categorie = ?, fkUser = ?, typePeriode = ? WHERE id = ?',
    [updated.dateHoliday, updated.label, updated.categorie, updated.fkUser, updated.typePeriode, id]
  );
  ```

### 2b. Créer l'endpoint de statistiques (`GET /api/holidayPublic/stats`)
Cet endpoint doit exécuter une requête SQL d'agrégation pour calculer le total cumulé de jours par catégorie.
* Une `JOURNEE_ENTIERE` vaut `1` jour.
* Un `MATIN` ou `APRES_MIDI` vaut `0.5` jour.

**Ajouter cette route AVANT la route `GET /:id`** pour éviter les conflits de routes Express :

```js
// GET /api/holidayPublic/stats
router.get('/stats', (req, res) => {
  try {
    const sql = `
      SELECT 
        categorie,
        COUNT(*) as nbFeries,
        SUM(CASE WHEN typePeriode = 'JOURNEE_ENTIERE' THEN 1.0 ELSE 0.5 END) as totalJoursChomes
      FROM holiday_public
      GROUP BY categorie
    `;
    const rows = db.query(sql);
    
    // Formater la réponse pour faciliter l'usage côté React
    const stats = {
      NATIONAL: { count: 0, days: 0 },
      ENTREPRISE: { count: 0, days: 0 }
    };
    
    rows.forEach(row => {
      if (stats[row.categorie]) {
        stats[row.categorie].count = row.nbFeries;
        stats[row.categorie].days  = row.totalJoursChomes;
      }
    });

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

---

## 🎨 Partie 3 : Interface React Frontend

### 3a. Ajouter la Catégorie dans le formulaire
* **Fichiers à modifier** :
  * [`HolidayPublicModal.jsx`](file:///d:/shania/itu/L3/dolibarr/DoliSync/src/pages/backOffice/holidayPublic/HolidayPublicModal.jsx) : Ajouter `categorie: 'NATIONAL'` dans `initialFormData` et dans le `payload` d'envoi.
  * [`HolidayPublicForm.jsx`](file:///d:/shania/itu/L3/dolibarr/DoliSync/src/pages/backOffice/holidayPublic/HolidayPublicForm.jsx) : Ajouter un champ `<Select>` pour la catégorie.

```jsx
{/* Dans HolidayPublicForm.jsx, à ajouter dans la grille des champs de configuration */}
<FormGroup label="Catégorie">
  <Select name="categorie" value={formData.categorie} onChange={onChange}>
    <option value="NATIONAL">National (Officiel)</option>
    <option value="ENTREPRISE">Entreprise (Offert)</option>
  </Select>
</FormGroup>
```

### 3b. Mettre à jour et afficher les statistiques dans la liste
* **Fichier à modifier** : [`HolidayPublicList.jsx`](file:///d:/shania/itu/L3/dolibarr/DoliSync/src/pages/backOffice/holidayPublic/HolidayPublicList.jsx)

L'étudiant doit :
1. Charger les statistiques depuis `/api/holidayPublic/stats` au chargement de la page et après chaque modification/suppression.
2. Afficher des cartes de résumé en haut de la page.
3. Afficher la colonne "Catégorie" dans le tableau principal.

#### Code React à intégrer pour le chargement des données :
```javascript
const [stats, setStats] = useState({
  NATIONAL: { count: 0, days: 0 },
  ENTREPRISE: { count: 0, days: 0 }
});

const loadData = async (isReload = false) => {
  if (isReload) setLoadingExtra(true);
  try {
    const holidaysPublic = await HolidaysPublicService.getAll();
    setHolidays(holidaysPublic);
    
    // 🌟 Charger les stats depuis le nouvel endpoint Express
    const resStats = await fetch('/api/holidayPublic/stats').then(r => r.json());
    setStats(resStats);
  } catch (err) {
    console.error(err);
    setError(err.message);
  } finally {
    setLoadingExtra(false);
  }
};
```

#### Code JSX pour les cartes statistiques (à mettre sous le titre principal) :
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
    <h3 className="text-sm font-semibold text-gray-500 uppercase">Jours Fériés Nationaux</h3>
    <div className="flex justify-between items-baseline mt-2">
      <p className="text-2xl font-bold text-blue-600">{stats.NATIONAL.count} jours fériés</p>
      <p className="text-sm text-gray-500">Cumul : <span className="font-semibold text-gray-700">{stats.NATIONAL.days} jours chômés</span></p>
    </div>
  </div>

  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
    <h3 className="text-sm font-semibold text-gray-500 uppercase">Fermetures Entreprise</h3>
    <div className="flex justify-between items-baseline mt-2">
      <p className="text-2xl font-bold text-emerald-600">{stats.ENTREPRISE.count} événements</p>
      <p className="text-sm text-gray-500">Cumul : <span className="font-semibold text-gray-700">{stats.ENTREPRISE.days} jours offerts</span></p>
    </div>
  </div>
</div>
```

---

## 🎯 Compétences évaluées pour l'étudiant
1. **Architecture de données** : Capacité à faire évoluer un schéma de table SQLite existant.
2. **SQL avancé** : Écriture de fonctions conditionnelles complexes (`SUM(CASE WHEN...)`) et d'agrégations (`GROUP BY`).
3. **Développement API** : Définition et ordonnancement de routes Express (comprendre la priorité des routes pour éviter le conflit entre `/stats` et `/:id`).
4. **Intégration d'états React** : Gestion des cycles de vie des requêtes avec `useEffect`, synchronisation des composants enfants (`Modal`, `Form`) et re-render suite aux écritures.
