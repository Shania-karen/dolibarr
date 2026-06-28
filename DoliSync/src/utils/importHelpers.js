import { fetchDolData } from '../services/apiClient';

/**
 * Parses raw CSV content into headers and rows of objects.
 * Handles escaped double quotes, quotes, commas, and line breaks properly.
 * @param {string} text 
 * @returns {{headers: string[], data: Object[]}}
 */
export function parseCSV(text) {
  const lines = [];
  let row = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped double quote inside quotes (e.g. "")
        row[row.length - 1] += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push('');
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      lines.push(row);
      row = [""];
    } else {
      row[row.length - 1] += char;
    }
  }
  if (row.length > 1 || row[0] !== '') {
    lines.push(row);
  }

  if (lines.length === 0) return { headers: [], data: [] };

  const headers = lines[0].map(h => h.trim());
  const data = lines.slice(1).map(line => {
    const rowObj = {};
    headers.forEach((header, index) => {
      rowObj[header] = line[index] !== undefined ? line[index].trim() : '';
    });
    return rowObj;
  }).filter(rowObj => Object.values(rowObj).some(v => v !== '')); // Skip empty rows

  return { headers, data };
}

/**
 * Parses custom payment formats like "{["08/03/26",890]}" or "{["08/03/26",480],["08/03/26",300]}"
 * @param {string} val 
 * @returns {Array<{date: string, amount: number}>}
 */
export function parsePaiementField(val) {
  if (!val) return [];
  let cleaned = val.trim();
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    cleaned = cleaned.substring(1, cleaned.length - 1);
  }
  const matches = cleaned.match(/\[[^\]]+\]/g);
  if (!matches) return [];

  return matches.map(match => {
    try {
      const parsed = JSON.parse(match);
      if (Array.isArray(parsed) && parsed.length >= 2) {
        return {
          date: parsed[0],
          amount: parseFloat(parsed[1])
        };
      }
    } catch (e) {
      const parts = match.replace(/[\[\]"]/g, '').split(',');
      if (parts.length >= 2) {
        return {
          date: parts[0].trim(),
          amount: parseFloat(parts[1].trim())
        };
      }
    }
    return null;
  }).filter(Boolean);
}

/**
 * Converts date strings in format DD/MM/YYYY or DD/MM/YY to YYYY-MM-DD.
 * @param {string} dateStr 
 * @returns {string|null}
 */
export function parseCSVDate(dateStr) {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();
  const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (match) {
    let day = match[1].padStart(2, '0');
    let month = match[2].padStart(2, '0');
    let year = match[3];
    if (year.length === 2) {
      year = '20' + year;
    }
    return `${year}-${month}-${day}`;
  }
  if (cleaned.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return cleaned;
  }
  return null;
}

/**
 * Standardizes decimal strings like "677,56" or "1 250,50" into standard float numbers.
 * @param {string|number} val 
 * @returns {number}
 */
export function parseNumber(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = val.replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Attempts to match ref_employe from Dolibarr's users list.
 * Inspects note_private for "ref_employe: X" or "ref_employe = X" patterns.
 * Falls back to matching user login with identity login if they correspond.
 * @param {Object[]} dolibarrUsers 
 * @param {string|number} refEmploye 
 * @param {string} [loginBackup] 
 * @returns {number|null} ID of user in Dolibarr
 */
export function findUserByRef(dolibarrUsers, refEmploye, loginBackup = '') {
  if (!Array.isArray(dolibarrUsers)) return null;

  for (const user of dolibarrUsers) {
    // 1. Check note_private or note_public for ref_employe match
    const notes = [user.note_private, user.note_public, user.note].filter(Boolean).join('\n');
    const regex = new RegExp(`ref_employe\\s*[:=]\\s*${refEmploye}\\b`, 'i');
    if (regex.test(notes)) {
      return parseInt(user.id || user.rowid);
    }

    // 2. Check if the login matches
    if (loginBackup && user.login && user.login.toLowerCase() === loginBackup.toLowerCase()) {
      return parseInt(user.id || user.rowid);
    }
  }
  return null;
}

export const RESOURCE_TYPES = {
  users: {
    label: "Employés / Utilisateurs",
    endpoint: "/users",
    requiredFields: ["login", "lastname"],
    fields: [
      { key: "login", label: "Identifiant (Login)", required: true, desc: "Identifiant de connexion" },
      { key: "lastname", label: "Nom", required: true, desc: "Nom de l'employé" },
      { key: "firstname", label: "Prénom", required: false, desc: "Prénom de l'employé" },
      { key: "password", label: "Mot de passe", required: false, desc: "Mot de passe initial" },
      { key: "gender", label: "Genre", required: false, desc: "Genre (homme/femme)" },
      { key: "civility_code", label: "Civilité", required: false, desc: "Code civilité (ex: MR, MME)" },
      { key: "weeklyhours", label: "Heures / semaine", required: false, desc: "Heures travaillées" },
      { key: "ref_employe", label: "Référence Interne (ID)", required: false, desc: "ID de liaison unique" }
    ]
  },
  salaries: {
    label: "Salaires (Charges Sociales/Salaires)",
    endpoint: "/salaries",
    requiredFields: ["amount", "ref_employe_salary"],
    fields: [
      { key: "ref_employe_salary", label: "Référence Employé", required: true, desc: "ID unique de l'employé pour lier le salaire" },
      { key: "amount", label: "Montant", required: true, desc: "Montant net ou brut" },
      { key: "date_debut", label: "Date Début", required: false, desc: "Début de période" },
      { key: "date_fin", label: "Date Fin", required: false, desc: "Fin de période" },
      { key: "paiement", label: "Paiement (Détails)", required: false, desc: "Format: {[\"date\", montant]}" },
      { key: "eref_salaire", label: "Réf Salaire", required: false, desc: "ID unique du salaire" }
    ]
  },
  products: {
    label: "Produits",
    endpoint: "/products",
    requiredFields: ["ref", "label"],
    fields: [
      { key: "ref", label: "Référence", required: true, desc: "Référence unique du produit" },
      { key: "label", label: "Libellé", required: true, desc: "Libellé du produit" },
      { key: "price", label: "Prix HT", required: false, desc: "Prix de vente" },
      { key: "description", label: "Description", required: false, desc: "Description textuelle" }
    ]
  },
  warehouses: {
    label: "Entrepôts",
    endpoint: "/warehouses",
    requiredFields: ["ref", "label"],
    fields: [
      { key: "ref", label: "Référence", required: true, desc: "Référence unique de l'entrepôt" },
      { key: "label", label: "Libellé", required: true, desc: "Nom de l'entrepôt" },
      { key: "description", label: "Description", required: false, desc: "Description de l'entrepôt" }
    ]
  },
  holidays: {
    label: "Demandes de Congés",
    endpoint: "/holidays",
    requiredFields: ["ref_employe_holiday", "date_debut", "date_fin"],
    fields: [
      { key: "ref_employe_holiday", label: "Référence Employé", required: true, desc: "ID unique de l'employé" },
      { key: "date_debut", label: "Date Début", required: true, desc: "Début du congé" },
      { key: "date_fin", label: "Date Fin", required: true, desc: "Fin du congé" },
      { key: "type", label: "Type", required: false, desc: "Type de congé" },
      { key: "description", label: "Description", required: false, desc: "Motif ou commentaires" }
    ]
  },
  expensereports: {
    label: "Notes de frais",
    endpoint: "/expensereports",
    requiredFields: ["ref_employe_expense", "date_debut", "date_fin"],
    fields: [
      { key: "ref_employe_expense", label: "Référence Employé", required: true, desc: "ID unique de l'employé" },
      { key: "date_debut", label: "Date Début", required: true, desc: "Début de la période" },
      { key: "date_fin", label: "Date Fin", required: true, desc: "Fin de la période" },
      { key: "amount", label: "Montant Total", required: false, desc: "Total de la note de frais" }
    ]
  }
};

/**
 * Imports a single record to Dolibarr based on resource config and mapping.
 * @param {string} resourceType 
 * @param {Object} row Raw CSV row values
 * @param {Object} mapping Map of fieldKey -> csvHeader
 * @param {Object} context Context data (e.g. user lookup table)
 * @returns {Promise<Object>} Created object details
 */
export async function importRow(resourceType, row, mapping, context = {}) {
  const config = RESOURCE_TYPES[resourceType];
  if (!config) throw new Error(`Type de ressource inconnu : ${resourceType}`);

  const payload = {};
  
  // Extract mapped values from CSV row
  const getVal = (fieldKey) => {
    const csvHeader = mapping[fieldKey];
    return csvHeader && row[csvHeader] !== undefined ? row[csvHeader] : '';
  };

  if (resourceType === 'users') {
    payload.login = getVal('login');
    payload.lastname = getVal('lastname');
    payload.firstname = getVal('firstname');
    payload.password = getVal('password') || 'Dolibarr2026!';
    payload.civility_code = getVal('civility_code');
    
    // Map gender and infer civility if not specified
    const rawGender = getVal('gender').toLowerCase();
    if (rawGender === 'homme' || rawGender === 'man') {
      payload.gender = 'man';
      if (!payload.civility_code) {
        payload.civility_code = 'MR';
        payload.civility_id = 1;
      }
    } else if (rawGender === 'femme' || rawGender === 'woman') {
      payload.gender = 'woman';
      if (!payload.civility_code) {
        payload.civility_code = 'MME';
        payload.civility_id = 2;
      }
    }

    if (payload.civility_code === 'MR') {
      payload.civility_id = 1;
    } else if (payload.civility_code === 'MME') {
      payload.civility_id = 2;
    }

    // Map weekly hours
    const hours = parseNumber(getVal('weeklyhours'));
    if (hours > 0) {
      payload.weeklyhours = hours;
    }

    // Mark as employee and active
    payload.employee = 1;
    payload.statut = 1;

    // Save ref_employe inside private note
    const ref = getVal('ref_employe');
    if (ref) {
      payload.note_private = `ref_employe: ${ref}`;
    }
  }

  else if (resourceType === 'salaries') {
    const refEmploye = getVal('ref_employe_salary');
    let fk_user = findUserByRef(context.users || [], refEmploye, context.employeeRefMap?.[refEmploye]);
    if (!fk_user) {
      throw new Error(`Aucun utilisateur Dolibarr trouvé pour la référence employé '${refEmploye}'`);
    }

    payload.fk_user = fk_user;
    payload.amount = parseNumber(getVal('amount'));
    payload.label = getVal('label') || `Salaire réf ${getVal('eref_salaire') || 'N/A'}`;

    // Convertit une date YYYY-MM-DD en timestamp Unix en tenant compte du
    // fuseau horaire Madagascar (UTC+3, Indian/Antananarivo)
    const toTimestampTZ = (dateStr) => {
      if (!dateStr) return null;
      // Forcer minuit heure locale Madagascar (UTC+3)
      const d = new Date(`${dateStr}T00:00:00+03:00`);
      return isNaN(d.getTime()) ? null : Math.floor(d.getTime() / 1000);
    };

    const dateStart = parseCSVDate(getVal('date_debut'));
    const dateEnd   = parseCSVDate(getVal('date_fin'));
    if (dateStart) payload.datesp = toTimestampTZ(dateStart);
    if (dateEnd)   payload.dateep = toTimestampTZ(dateEnd);

    // Analyse des paiements de la colonne "paiement"
    const rawPayments = getVal('paiement');
    const payments = parsePaiementField(rawPayments);

    // Calculer le montant total des paiements déclarés
    const totalPaid = payments.reduce((a, p) => a + p.amount, 0);

    // paye = 0 toujours à la création (Dolibarr met à jour paye via les payments)
    // On stocke juste l'info pour la phase de paiement
    payload.paye = 0;

    // Stocker les détails de paiement et la ref dans note_private
    payload.note_private = JSON.stringify({
      eref_salaire: getVal('eref_salaire'),
      payments,
      raw_paiement: rawPayments
    });

    // Exposer les payments et isFullyPaid pour la phase POST payments
    payload._payments = payments;
    payload._totalPaid = totalPaid;
    payload._isFullyPaid = payments.length > 0 && Math.abs(totalPaid - payload.amount) < 0.01;
  }

  else if (resourceType === 'products') {
    payload.ref = getVal('ref');
    payload.label = getVal('label');
    payload.status = 1; // Active
    
    const price = parseNumber(getVal('price'));
    if (price > 0) {
      payload.price = price;
    }
    payload.description = getVal('description');
  }

  else if (resourceType === 'warehouses') {
    payload.ref = getVal('ref');
    payload.label = getVal('label');
    payload.status = 1; // Active
    payload.description = getVal('description');
  }

  else if (resourceType === 'holidays') {
    const refEmploye = getVal('ref_employe_holiday');
    let fk_user = findUserByRef(context.users || [], refEmploye, context.employeeRefMap?.[refEmploye]);
    if (!fk_user) {
      throw new Error(`Aucun utilisateur Dolibarr trouvé pour la référence employé '${refEmploye}'`);
    }

    payload.fk_user = fk_user;
    payload.date_debut = parseCSVDate(getVal('date_debut'));
    payload.date_fin = parseCSVDate(getVal('date_fin'));
    payload.type = getVal('type') || '1';
    payload.description = getVal('description');
  }

  else if (resourceType === 'expensereports') {
    const refEmploye = getVal('ref_employe_expense');
    let fk_user = findUserByRef(context.users || [], refEmploye, context.employeeRefMap?.[refEmploye]);
    if (!fk_user) {
      throw new Error(`Aucun utilisateur Dolibarr trouvé pour la référence employé '${refEmploye}'`);
    }

    payload.fk_user = fk_user;
    payload.date_debut = parseCSVDate(getVal('date_debut'));
    payload.date_fin = parseCSVDate(getVal('date_fin'));
    payload.amount = parseNumber(getVal('amount'));
  }

  // Submit to Dolibarr API
  return await fetchDolData(config.endpoint, {
    method: 'POST',
    body: payload
  });
}

/**
 * Uploads a user photo (avatar) to Dolibarr using the documents API.
 * @param {string|number} userId Dolibarr User ID
 * @param {string} filename Name of the image file (e.g. "1.png")
 * @param {string} base64Data Base64 encoded file content
 * @returns {Promise<Object>} API response details
 */
export async function uploadUserPhoto(userId, filename, base64Data) {
  const payload = {
    filename,
    modulepart: 'user',
    ref: String(userId),
    filecontent: base64Data,
    fileencoding: 'base64',
    overwriteifexists: 1
  };
  return await fetchDolData('/documents/upload', {
    method: 'POST',
    body: payload
  });
}

/**
 * Enregistre les paiements d'un salaire dans Dolibarr via POST /salaries/{id}/payments.
 * Récupère automatiquement le premier compte bancaire disponible (champ `chid` obligatoire).
 * La date est corrigée pour le fuseau horaire Madagascar (UTC+3).
 *
 * @param {string|number} salaryId  ID du salaire créé dans Dolibarr
 * @param {Array<{date: string, amount: number}>} payments  Tableau des paiements parsés
 * @returns {Promise<{posted: number, errors: string[]}>}
 */
export async function recordSalaryPayments(salaryId, payments, isFullyPaid = false) {
  const results = { posted: 0, errors: [] };
  if (!payments || payments.length === 0) return results;

  // Récupérer le premier compte bancaire disponible (accountid, optionnel)
  let accountid = null;
  try {
    const bankAccounts = await fetchDolData('/bankaccounts?limit=1');
    const accounts = Array.isArray(bankAccounts) ? bankAccounts : [];
    if (accounts.length > 0) {
      accountid = parseInt(accounts[0].id || accounts[0].rowid);
    }
  } catch (e) {
    results.errors.push(`Avertissement : Impossible de récupérer les comptes bancaires (${e.message}). Paiements sans compte bancaire.`);
  }

  for (const p of payments) {
    const dateStr = parseCSVDate(p.date); // YYYY-MM-DD
    if (!dateStr || isNaN(p.amount) || p.amount <= 0) continue;

    try {
      const body = {
        chid: parseInt(salaryId),            // ID du salaire (obligatoire)
        datepaye: dateStr,                    // string YYYY-MM-DD
        amounts: { [String(salaryId)]: p.amount }, // { id_salaire: montant }
        paiementtype: 0,
      };
      if (accountid) body.accountid = accountid;

      await fetchDolData(`/salaries/${salaryId}/payments`, {
        method: 'POST',
        body
      });
      results.posted++;
    } catch (err) {
      results.errors.push(`Paiement du ${p.date} (${p.amount}) : ${err.message}`);
    }
  }

  // Si tous les paiements couvrent le montant total → marquer paye=1 via PUT
  if (isFullyPaid && results.posted > 0) {
    try {
      await fetchDolData(`/salaries/${salaryId}`, {
        method: 'PUT',
        body: { paye: 1 }
      });
    } catch (err) {
      results.errors.push(`Impossible de marquer le salaire ${salaryId} comme payé : ${err.message}`);
    }
  }

  return results;
}