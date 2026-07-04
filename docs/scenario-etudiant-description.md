# Scénario Pratique L2 : Ajout d'une "Description" aux Jours Fériés

Ce document propose un scénario de développement idéal pour un étudiant de 2ème année (durée estimée : **1 heure** sans IA). Il couvre le cycle complet d'une modification full-stack (Base de données SQLite ➔ API Express ➔ Formulaire et affichage React).

---

## Objectif du Scénario
Actuellement, un jour férié n'a qu'un `label` court (ex: "Fête nationale"). L'objectif est d'ajouter un champ optionnel **Description** (un texte plus long) pour expliquer le contexte du jour férié ou donner des consignes spécifiques aux équipes.

---

## Étape 1 : Modifier la Base de données SQLite (`server/database.js`)
* **Temps estimé** : 10 minutes
* **Fichier à modifier** : [`server/database.js`](file:///d:/shania/itu/L3/dolibarr/server/database.js)

L'étudiant doit ajouter une colonne `description` à la table `holiday_public`.

### Ligne à modifier (~lignes 21-27)
```js
// AVANT :
db.run(`
  CREATE TABLE IF NOT EXISTS holiday_public (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    dateHoliday TEXT    NOT NULL,
    label       TEXT    NOT NULL DEFAULT '',
    fkUser      INTEGER,
    typePeriode TEXT    NOT NULL DEFAULT 'JOURNEE_ENTIERE'
  )
`);

// APRÈS — Ajouter la colonne description :
db.run(`
  CREATE TABLE IF NOT EXISTS holiday_public (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    dateHoliday TEXT    NOT NULL,
    label       TEXT    NOT NULL DEFAULT '',
    description TEXT    NOT NULL DEFAULT '',   -- 🌟 AJOUT
    fkUser      INTEGER,
    typePeriode TEXT    NOT NULL DEFAULT 'JOURNEE_ENTIERE'
  )
`);
```

> **Consigne étudiante** : Si la base `dolisync.db` existe déjà, le moteur SQLite n'appliquera pas la modification de la table existante (à cause du `IF NOT EXISTS`). L'étudiant doit supprimer le fichier local `server/dolisync.db` et redémarrer son serveur Express avec `node index.js` pour recréer la table proprement.

---

## Étape 2 : Mettre à jour l'API Express (`server/routes/holidayPublic.js`)
* **Temps estimé** : 15 minutes
* **Fichier à modifier** : [`server/routes/holidayPublic.js`](file:///d:/shania/itu/L3/dolibarr/server/routes/holidayPublic.js)

L'étudiant doit modifier les routes de **Création (POST)** et de **Modification (PUT)** pour qu'elles prennent en compte la `description`.

### 2a. Route POST (~lignes 29-45)
```js
// modifier la déstructuration de req.body et db.run() :
router.post('/', (req, res) => {
  try {
    const { 
      dateHoliday, 
      label = '', 
      description = '', // 🌟 AJOUT
      fkUser = null, 
      typePeriode = 'JOURNEE_ENTIERE' 
    } = req.body;
    
    if (!dateHoliday) return res.status(400).json({ error: 'dateHoliday est obligatoire.' });

    const fkUserVal = fkUser ? parseInt(fkUser) : null;

    db.run(
      'INSERT INTO holiday_public (dateHoliday, label, description, fkUser, typePeriode) VALUES (?, ?, ?, ?, ?)', // 🌟 AJOUT "?"
      [dateHoliday, label, description, fkUserVal, typePeriode] // 🌟 AJOUT paramètre
    );

    const id = db.lastInsertId();
    res.status(201).json({ id, dateHoliday, label, description, fkUser: fkUserVal, typePeriode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

### 2b. Route PUT (~lignes 48-75)
```js
// modifier l'objet mis à jour et db.run() :
router.put('/:id', (req, res) => {
  try {
    const id = +req.params.id;
    const rows = db.query('SELECT * FROM holiday_public WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Jour férié introuvable.' });

    const existing = rows[0];
    const { dateHoliday, label, description, fkUser, typePeriode } = req.body; // 🌟 AJOUT description

    const updated = {
      id,
      dateHoliday:  dateHoliday  ?? existing.dateHoliday,
      label:        label        ?? existing.label,
      description:  description  ?? existing.description, // 🌟 AJOUT
      fkUser:       fkUser !== undefined ? (fkUser ? parseInt(fkUser) : null) : existing.fkUser,
      typePeriode:  typePeriode  ?? existing.typePeriode,
    };

    db.run(
      'UPDATE holiday_public SET dateHoliday = ?, label = ?, description = ?, fkUser = ?, typePeriode = ? WHERE id = ?', // 🌟 AJOUT "?"
      [updated.dateHoliday, updated.label, updated.description, updated.fkUser, updated.typePeriode, id] // 🌟 AJOUT paramètre
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

---

## Étape 3 : Ajouter le champ dans le formulaire React
* **Temps estimé** : 15 minutes
* **Fichiers concernés** : 
  * [`DoliSync/src/pages/backOffice/holidayPublic/HolidayPublicModal.jsx`](file:///d:/shania/itu/L3/dolibarr/DoliSync/src/pages/backOffice/holidayPublic/HolidayPublicModal.jsx) (Modèle de données d'envoi)
  * [`DoliSync/src/pages/backOffice/holidayPublic/HolidayPublicForm.jsx`](file:///d:/shania/itu/L3/dolibarr/DoliSync/src/pages/backOffice/holidayPublic/HolidayPublicForm.jsx) (Composant graphique)

### 3a. Initialisation et Payload dans `HolidayPublicModal.jsx`
1. Modifier l'objet `initialFormData` pour inclure `description` :
   ```js
   const initialFormData = {
     dateHoliday: '',
     label: '',
     description: '', // 🌟 AJOUT
     fkUser: '',
     typePeriode: 'JOURNEE_ENTIERE'
   };
   ```
2. Ajouter le champ au payload envoyé à l'API lors du submit (~ligne 37) :
   ```js
   const payload = {
     dateHoliday: formData.dateHoliday || null,
     label: formData.label || '',
     description: formData.description || '', // 🌟 AJOUT
     fkUser: formData.fkUser ? parseInt(formData.fkUser) : null,
     typePeriode: formData.typePeriode || 'JOURNEE_ENTIERE'
   };
   ```

### 3b. Rendu visuel dans `HolidayPublicForm.jsx`
Ajouter un champ de saisie de type zone de texte (`textarea`) sous le champ `Label`.
```jsx
{/* Dans le JSX du formulaire, après le groupe de champ "Libellé" : */}
<div className="space-y-1">
  <label className="block text-sm font-medium text-neutral-700">
    Description (optionnel)
  </label>
  <textarea
    name="description"
    value={formData.description || ''}
    onChange={onChange}
    placeholder="Ex: Commémoration nationale, fermeture obligatoire des bureaux..."
    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
    rows={3}
  />
</div>
```

---

## Étape 4 : Afficher la description dans la liste
* **Temps estimé** : 10 minutes
* **Fichier à modifier** : [`DoliSync/src/pages/backOffice/holidayPublic/HolidayPublicList.jsx`](file:///d:/shania/itu/L3/dolibarr/DoliSync/src/pages/backOffice/holidayPublic/HolidayPublicList.jsx)

L'étudiant doit ajouter une colonne dans le tableau pour afficher la description de chaque jour férié.

### 4a. Ajouter l'en-tête du tableau (~lignes 85-91)
```jsx
<Tr>
  <Th>ID</Th>
  <Th>Date</Th>
  <Th>Période</Th>
  <Th>Label</Th>
  <Th>Description</Th> {/* 🌟 AJOUT */}
  <Th>Action</Th>
</Tr>
```

### 4b. Ajouter la cellule de données (~lignes 104-118)
```jsx
<Tr key={holiday.id}>
  <Td>{holiday.id}</Td>
  <Td className="font-medium text-black">{holiday.dateHoliday}</Td>
  <Td>{formatPeriode(holiday.typePeriode)}</Td>
  <Td>{holiday.label || 'Sans titre'}</Td>
  
  {/* 🌟 AJOUT : cellule de description avec style discret */}
  <Td className="text-neutral-500 italic max-w-xs truncate">
    {holiday.description || '—'}
  </Td>

  <Td>
    <div className="flex gap-2">
      {/* Boutons actions existants */}
    </div>
  </Td>
</Tr>
```

---

## Critères de Validation (Correction)
1. **Compilation** : L'application React et le serveur Express démarrent sans erreur.
2. **Création** : Remplir le formulaire avec une description et sauvegarder. Vérifier dans la liste que la description apparaît.
3. **Persistance** : Si on éteint et rallume le serveur Express (`node index.js`), les descriptions doivent toujours être visibles (sauvegardées dans `dolisync.db`).
4. **Modification** : Cliquer sur "Modifier", changer la description, sauvegarder ➔ la mise à jour s'affiche.
