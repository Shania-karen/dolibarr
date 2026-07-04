# Guide : Import CSV des Jours Fériés

Ce document décrit exactement **quels fichiers modifier ou créer**, et **quelles lignes ajouter**, pour implémenter un import CSV de jours fériés dans DoliSync.

---

## Format CSV attendu

### Cas 1 — CSV avec colonne `nombre_jours`

```csv
date_ferie,label,type_periode,nombre_jours
01/01/2026,Jour de l'An,JOURNEE_ENTIERE,1
01/05/2026,Fête du Travail,MATIN,0.5
26/06/2026,Fête de l'Indépendance,JOURNEE_ENTIERE,1
```

| Colonne | Obligatoire | Description |
|---|---|---|
| `date_ferie` | ✅ | Date au format `DD/MM/YYYY` |
| `label` | ✅ | Nom du jour férié |
| `type_periode` | ✅ | `JOURNEE_ENTIERE`, `MATIN`, ou `APRES_MIDI` |
| `nombre_jours` | ✅ dans ce cas | `1` pour journée entière, `0.5` pour demi-journée |

### Cas 2 — CSV sans colonne `nombre_jours`

```csv
date_ferie,label,type_periode
01/01/2026,Jour de l'An,JOURNEE_ENTIERE
01/05/2026,Fête du Travail,MATIN
26/06/2026,Fête de l'Indépendance,JOURNEE_ENTIERE
```

> Sans `nombre_jours`, la valeur sera déduite automatiquement depuis `type_periode` :
> - `JOURNEE_ENTIERE` → `1.0`
> - `MATIN` ou `APRES_MIDI` → `0.5`

---

## Fichiers à modifier ou créer

### Vue d'ensemble

```
DoliSync/src/
├── pages/backOffice/
│   └── Import.jsx                  ← MODIFIER (ajouter gestion fichier fériés)
├── utils/
│   └── importHelpers.js            ← MODIFIER (ajouter fonction importHolidayRow)
└── services/
    └── holidayPublicService.js     ← OK (déjà existant, utilisé tel quel)

server/
├── database.js                     ← MODIFIER (ajouter colonne nombreJours)
└── routes/
    └── holidayPublic.js            ← MODIFIER (accepter nombreJours dans POST)
```

---

## 1. `DoliSync/src/utils/importHelpers.js`

**Action : MODIFIER** — Ajouter une fonction `importHolidayRow` à la fin du fichier.

```js
// À AJOUTER à la fin du fichier (après la dernière fonction existante)

/**
 * Importe une ligne CSV de jour férié vers le backend Express (SQLite).
 * Gère les deux cas : avec ou sans colonne "nombre_jours".
 *
 * @param {Object} row  - Ligne CSV parsée (objet clé=entête CSV)
 * @returns {Promise<Object>} - Le jour férié créé
 */
export async function importHolidayRow(row) {
  const rawDate     = row['date_ferie']   || '';
  const label       = row['label']        || '';
  const typePeriode = (row['type_periode'] || 'JOURNEE_ENTIERE').trim().toUpperCase();

  const dateHoliday = parseCSVDate(rawDate); // DD/MM/YYYY → YYYY-MM-DD
  if (!dateHoliday) throw new Error(`Date invalide : "${rawDate}"`);

  const validTypes = ['JOURNEE_ENTIERE', 'MATIN', 'APRES_MIDI'];
  if (!validTypes.includes(typePeriode)) {
    throw new Error(`type_periode invalide : "${typePeriode}"`);
  }

  // CAS 1 : colonne "nombre_jours" présente dans le CSV
  // CAS 2 : colonne absente → déduction depuis type_periode
  let nombreJours;
  if (row['nombre_jours'] !== undefined && row['nombre_jours'] !== '') {
    nombreJours = parseFloat(row['nombre_jours'].replace(',', '.'));
    if (isNaN(nombreJours) || nombreJours <= 0) {
      throw new Error(`nombre_jours invalide : "${row['nombre_jours']}"`);
    }
  } else {
    nombreJours = typePeriode === 'JOURNEE_ENTIERE' ? 1.0 : 0.5;
  }

  const response = await fetch('/api/holidayPublic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dateHoliday, label, typePeriode, nombreJours })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || `Erreur API (${response.status})`);
  }

  return response.json();
}
```

---

## 2. `DoliSync/src/pages/backOffice/Import.jsx`

**Action : MODIFIER** — 4 endroits à changer.

### 2a. Import de la fonction (lignes 1-10)

```js
// AVANT :
import {
  parseCSV, importRow, findUserByRef,
  uploadUserPhoto, recordSalaryPayments, parsePaiementField
} from '../../utils/importHelpers';

// APRÈS — ajouter importHolidayRow :
import {
  parseCSV, importRow, findUserByRef,
  uploadUserPhoto, recordSalaryPayments, parsePaiementField,
  importHolidayRow   // ← AJOUTER
} from '../../utils/importHelpers';
```

### 2b. Nouveaux états (après ligne ~36)

```js
// AJOUTER après const [photosData, setPhotosData] = useState({});
const [holidaysFile, setHolidaysFile]       = useState(null);
const [holidaysData, setHolidaysData]       = useState([]);
const [holidaysHeaders, setHolidaysHeaders] = useState([]);
const holidaysInputRef = useRef(null);
```

### 2c. Handler de chargement du fichier fériés (après `handleSalariesLoad`, ~ligne 135)

```js
const handleHolidaysLoad = (file) => {
  if (!file || !file.name.endsWith('.csv')) {
    setUploadError('Le fichier des jours fériés doit être au format .csv');
    return;
  }
  setUploadError('');
  setHolidaysFile(file);

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const { headers, data } = parseCSV(e.target.result);

      // Colonnes obligatoires (nombre_jours est optionnel)
      const required = ['date_ferie', 'label', 'type_periode'];
      const missing = required.filter(h => !headers.includes(h));
      if (missing.length > 0) {
        setUploadError(`Colonnes manquantes : ${missing.join(', ')}`);
        setHolidaysFile(null);
        return;
      }

      if (!headers.includes('nombre_jours')) {
        addLog('[Fériés] Colonne "nombre_jours" absente → valeur déduite depuis type_periode.', 'info');
      }

      setHolidaysHeaders(headers);
      setHolidaysData(data);
    } catch (err) {
      setUploadError(`Erreur lecture fichier fériés : ${err.message}`);
      setHolidaysFile(null);
    }
  };
  reader.readAsText(file, 'UTF-8');
};
```

### 2d. Phase 3 dans `handleImport` (après la Phase 2 Salaires, ~ligne 485)

```js
// AJOUTER après addLog(`=== FIN PHASE 2 ...`)
if (holidaysData.length > 0) {
  addLog(`=== PHASE 3 : Import jours fériés (${holidaysData.length} lignes) ===`, 'info');
  let holSuccess = 0;

  for (let i = 0; i < holidaysData.length; i++) {
    if (shouldStopRef.current) break;
    try {
      await importHolidayRow(holidaysData[i]);
      holSuccess++;
      addLog(`[Férié] "${holidaysData[i]['label']}" (${holidaysData[i]['date_ferie']}) importé.`, 'success');
    } catch (err) {
      addLog(`[Férié] Ligne ${i + 1} : Échec — ${err.message}`, 'error');
    }
  }

  addLog(`=== FIN PHASE 3 : ${holSuccess}/${holidaysData.length} jours fériés importés ===`, 'info');
}
```

---

## 3. `server/routes/holidayPublic.js`

**Action : MODIFIER** — Accepter `nombreJours` dans le `POST`.

```js
// AVANT (route POST) :
const { dateHoliday, label = '', fkUser = null, typePeriode = 'JOURNEE_ENTIERE' } = req.body;
// ...
db.run(
  'INSERT INTO holiday_public (dateHoliday, label, fkUser, typePeriode) VALUES (?, ?, ?, ?)',
  [dateHoliday, label, fkUserVal, typePeriode]
);
res.status(201).json({ id, dateHoliday, label, fkUser: fkUserVal, typePeriode });

// APRÈS — ajouter nombreJours :
const {
  dateHoliday,
  label       = '',
  fkUser      = null,
  typePeriode = 'JOURNEE_ENTIERE',
  nombreJours = typePeriode === 'JOURNEE_ENTIERE' ? 1.0 : 0.5  // ← AJOUTER
} = req.body;
// ...
db.run(
  'INSERT INTO holiday_public (dateHoliday, label, fkUser, typePeriode, nombreJours) VALUES (?, ?, ?, ?, ?)',
  [dateHoliday, label, fkUserVal, typePeriode, nombreJours]
);
res.status(201).json({ id, dateHoliday, label, fkUser: fkUserVal, typePeriode, nombreJours });
```

---

## 4. `server/database.js`

**Action : MODIFIER** — Ajouter `nombreJours` dans le `CREATE TABLE`.

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

// APRÈS — ajouter la colonne nombreJours :
db.run(`
  CREATE TABLE IF NOT EXISTS holiday_public (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    dateHoliday TEXT    NOT NULL,
    label       TEXT    NOT NULL DEFAULT '',
    fkUser      INTEGER,
    typePeriode TEXT    NOT NULL DEFAULT 'JOURNEE_ENTIERE',
    nombreJours REAL    NOT NULL DEFAULT 1.0   -- ← AJOUTER
  )
`);
```

> **Important :** `CREATE TABLE IF NOT EXISTS` ne modifie pas une table déjà créée.
> Si `dolisync.db` existe déjà sans la colonne, deux options :
> - Supprimer `dolisync.db` et redémarrer le serveur (données perdues).
> - Ou via un client SQLite : `ALTER TABLE holiday_public ADD COLUMN nombreJours REAL NOT NULL DEFAULT 1.0;`

---

## Comparaison des deux cas

| Élément | Cas 1 (avec `nombre_jours`) | Cas 2 (sans `nombre_jours`) |
|---|---|---|
| Colonnes CSV | `date_ferie, label, type_periode, nombre_jours` | `date_ferie, label, type_periode` |
| Valeur `nombreJours` | Lue depuis le CSV | Calculée : `JOURNEE_ENTIERE`→`1.0`, sinon `0.5` |
| Validation | Vérifie que la valeur est un nombre > 0 | Aucune validation supplémentaire |
| Log d'info | — | `"Colonne nombre_jours absente → valeur déduite"` |
| Code actif | Branche `if (row['nombre_jours'] !== undefined ...)` | Branche `else` |

---

## Flux de données complet

```
Fichier CSV (upload dans l'UI)
    ↓  FileReader → parseCSV()
Tableau d'objets [{ date_ferie, label, type_periode, (nombre_jours?) }, ...]
    ↓  handleHolidaysLoad() — validation colonnes obligatoires
Phase 3 de handleImport()
    ↓  importHolidayRow(row)  [importHelpers.js]
        ├── parseCSVDate() → "YYYY-MM-DD"
        ├── Cas 1 : lit row['nombre_jours']
        └── Cas 2 : déduit depuis type_periode
    ↓  fetch POST /api/holidayPublic  [proxy Vite → localhost:8081]
Express route POST  [server/routes/holidayPublic.js]
    ↓  db.run('INSERT INTO holiday_public ...')  [server/database.js]
Fichier dolisync.db (SQLite)  ← données persistées
    ↓  res.status(201).json(...)
Log "succès" affiché dans l'UI d'import
```
