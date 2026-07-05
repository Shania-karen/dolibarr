import { useState, useRef } from 'react';
import JSZip from 'jszip';
import {
  parseCSV,
  importRow,
  findUserByRef,
  uploadUserPhoto,
  recordSalaryPayments,
  parsePaiementField
} from '../../utils/importHelpers';
import { fetchDolData } from '../../services/apiClient';
import {
  Card,
  Button,
  Table,
  Th,
  Tr,
  Td,
  Alert,
  Spinner,
  Divider,
  H2,
  H3,
  P
} from '../../components/templates';
import { ImportIcon } from '../../components/templates/Icon';

export default function ImportPage() {
  const [step, setStep] = useState(1);
  const [employeesFile, setEmployeesFile] = useState(null);
  const [salariesFile, setSalariesFile] = useState(null);
  const [photosFile, setPhotosFile] = useState(null);

  const [employeesData, setEmployeesData] = useState([]);
  const [salariesData, setSalariesData] = useState([]);
  const [photosData, setPhotosData] = useState({});
  const [employeesHeaders, setEmployeesHeaders] = useState([]);
  const [salariesHeaders, setSalariesHeaders] = useState([]);

  const [uploadError, setUploadError] = useState('');
  const [showAllEmployees, setShowAllEmployees] = useState(false);
  const [showAllSalaries, setShowAllSalaries] = useState(false);

  // Drag and Drop states
  const [isDragOverEmp, setIsDragOverEmp] = useState(false);
  const [isDragOverSal, setIsDragOverSal] = useState(false);
  const [isDragOverPhotos, setIsDragOverPhotos] = useState(false);

  const empInputRef = useRef(null);
  const salInputRef = useRef(null);
  const photosInputRef = useRef(null);
  const shouldStopRef = useRef(false);

  // Import execution states
  const [isImporting, setIsImporting] = useState(false);
  const [shouldStop, setShouldStop] = useState(false);
  const [progress, setProgress] = useState({
    empCurrent: 0,
    empTotal: 0,
    empSuccess: 0,
    empFail: 0,
    salCurrent: 0,
    salTotal: 0,
    salSuccess: 0,
    salFail: 0
  });
  const [logs, setLogs] = useState([]);

  const handleEmployeesLoad = (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setUploadError('Le fichier des employés doit être au format .csv');
      return;
    }
    setUploadError('');
    setEmployeesFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const { headers, data } = parseCSV(text);

        // Validate required headers
        const required = ['ref_employe', 'nom', 'genre', 'identifiant', 'mdp', 'heure_travail_semaine'];
        const missing = required.filter(h => !headers.includes(h));
        if (missing.length > 0) {
          setUploadError(`Fichier Employés invalide. Colonnes manquantes : ${missing.join(', ')}`);
          setEmployeesFile(null);
          return;
        }

        setEmployeesHeaders(headers);
        setEmployeesData(data);
      } catch (err) {
        setUploadError(`Erreur lors de la lecture du fichier employés : ${err.message}`);
        setEmployeesFile(null);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleSalariesLoad = (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setUploadError('Le fichier des salaires doit être au format .csv');
      return;
    }
    setUploadError('');
    setSalariesFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const { headers, data } = parseCSV(text);

        // Validate required headers
        const required = ['ref_salaire', 'ref_employe', 'date_debut', 'date_fin', 'montant', 'paiement'];
        const missing = required.filter(h => !headers.includes(h));
        if (missing.length > 0) {
          setUploadError(`Fichier Salaires invalide. Colonnes manquantes : ${missing.join(', ')}`);
          setSalariesFile(null);
          return;
        }

        setSalariesHeaders(headers);
        setSalariesData(data);
      } catch (err) {
        setUploadError(`Erreur lors de la lecture du fichier salaires : ${err.message}`);
        setSalariesFile(null);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handlePhotosLoad = async (file) => {
    if (!file) return;
    if (!file.name.endsWith('.zip')) {
      setUploadError('Le fichier des photos doit être au format .zip');
      return;
    }
    setUploadError('');
    setPhotosFile(file);

    try {
      const zip = await JSZip.loadAsync(file);
      const parsedPhotos = {};
      const filePromises = [];

      zip.forEach((relativePath, zipEntry) => {
        if (zipEntry.dir) return;

        const isImage = /\.(png|jpe?g)$/i.test(relativePath);
        if (!isImage) return;

        const filename = zipEntry.name.split('/').pop();
        const baseName = filename.replace(/\.[^/.]+$/, "").trim();

        const promise = zipEntry.async('base64').then((base64Content) => {
          parsedPhotos[baseName] = {
            filename: filename,
            filecontent: base64Content
          };
        });
        filePromises.push(promise);
      });

      await Promise.all(filePromises);
      setPhotosData(parsedPhotos);
      addLog(`[Photos] ${Object.keys(parsedPhotos).length} photos d'employés extraites du ZIP.`, 'info');
    } catch (err) {
      setUploadError(`Erreur lors de la lecture du ZIP des photos : ${err.message}`);
      setPhotosFile(null);
      setPhotosData({});
    }
  };

  const resetAll = () => {
    setEmployeesFile(null);
    setSalariesFile(null);
    setPhotosFile(null);
    setEmployeesData([]);
    setSalariesData([]);
    setPhotosData({});
    setEmployeesHeaders([]);
    setSalariesHeaders([]);
    setShowAllEmployees(false);
    setShowAllSalaries(false);
    setUploadError('');
    setStep(1);
  };

  const addLog = (message, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    const logEntry = { time, message, type };
    setLogs(prev => [logEntry, ...prev]);
  };

  const handleStopImport = () => {
    shouldStopRef.current = true;
    setShouldStop(true);
    addLog("Demande d'interruption par l'utilisateur...", "warning");
  };

  const executeDoubleImport = async () => {
    setStep(3);
    setIsImporting(true);
    setShouldStop(false);
    shouldStopRef.current = false;

    setProgress({
      empCurrent: 0,
      empTotal: employeesData.length,
      empSuccess: 0,
      empFail: 0,
      salCurrent: 0,
      salTotal: salariesData.length,
      salSuccess: 0,
      salFail: 0
    });
    setLogs([]);

    addLog("Début de l'importation combinée...", "info");

    // Fetch existing users first to avoid duplicate 500 errors and enable reuse
    let allDolibarrUsers = [];
    try {
      addLog("Récupération de la liste complète des utilisateurs de Dolibarr pour recoupement...", "info");
      const fetched = await fetchDolData('/users?limit=1000');
      allDolibarrUsers = Array.isArray(fetched) ? fetched : [];
    } catch (e) {
      addLog(`Attention : Impossible de lire la liste complète des utilisateurs depuis l'API (${e.message}).`, "warning");
    }

    const createdUsersMap = {}; // Maps ref_employe -> Dolibarr User ID
    const employeeRefMap = {};  // Maps ref_employe -> Login (Identifiant)
    let skipPhotoUploads = false;
    const newlyCreatedUserIds = [];
    const newlyCreatedSalaryIds = [];
    let hasError = false;

    // Helper function to rollback
    const performRollback = async () => {
      addLog("⚠️ Erreur détectée lors de l'importation. Lancement du rollback (annulation de toutes les créations de cet import)...", "warning");
      
      // Rollback salaries first
      for (const salId of newlyCreatedSalaryIds) {
        try {
          addLog(`[Rollback] Suppression du salaire créé (ID Dolibarr: ${salId})...`, 'info');
          await fetchDolData(`/salaries/${salId}`, { method: 'DELETE' });
          addLog(`[Rollback] Salaire ID ${salId} supprimé avec succès.`, 'success');
        } catch (err) {
          addLog(`[Rollback] Échec de la suppression du salaire ID ${salId} : ${err.message}`, 'error');
        }
      }

      // Rollback users next
      for (const userId of newlyCreatedUserIds) {
        try {
          addLog(`[Rollback] Suppression de l'utilisateur créé (ID Dolibarr: ${userId})...`, 'info');
          await fetchDolData(`/users/${userId}`, { method: 'DELETE' });
          addLog(`[Rollback] Utilisateur ID ${userId} supprimé avec succès.`, 'success');
        } catch (err) {
          addLog(`[Rollback] Échec de la suppression de l'utilisateur ID ${userId} : ${err.message}`, 'error');
        }
      }

      addLog("🔄 Rollback terminé. Toutes les créations de cette session ont été annulées.", "warning");
    };

    // --- PHASE 1 : IMPORT EMPLOYEES ---
    addLog(`=== PHASE 1 : Importation des employés (${employeesData.length} à traiter) ===`, "info");

    let empSuccess = 0;
    let empFail = 0;

    // Default mapping for employees
    const empMapping = {
      login: 'identifiant',
      lastname: 'nom',
      gender: 'genre',
      password: 'mdp',
      weeklyhours: 'heure_travail_semaine',
      poste: 'poste',          // → payload.job dans importRow
      ref_employe: 'ref_employe'
    };

    for (let i = 0; i < employeesData.length; i++) {
      if (shouldStopRef.current) {
        addLog("Importation interrompue par l'utilisateur.", "warning");
        setIsImporting(false);
        return;
      }

      const row = employeesData[i];
      const rowNum = i + 1;
      const refEmp = row['ref_employe'];
      const login = row['identifiant'];

      try {
        // Check if user already exists
        const existingUserId = findUserByRef(allDolibarrUsers, refEmp, login);
        if (existingUserId) {
          createdUsersMap[refEmp] = existingUserId;
          employeeRefMap[refEmp] = login;
          empSuccess++;
          addLog(`[Employé] Ligne ${rowNum} : '${row['nom']}' existe déjà (ID Dolibarr: ${existingUserId}). Liaison effectuée.`, 'success');

          // Associated photo upload
          if (photosData[rowNum] && !skipPhotoUploads) {
            try {
              addLog(`[Photo] Association de la photo pour '${row['nom']}'...`, 'info');
              await uploadUserPhoto(existingUserId, photosData[rowNum].filename, photosData[rowNum].filecontent);
              addLog(`[Photo] Photo associée avec succès pour '${row['nom']}'.`, 'success');
            } catch (photoErr) {
              if (photoErr.message.includes("not implemented yet") || photoErr.message.includes("Modulepart")) {
                skipPhotoUploads = true;
                addLog(`[Photo] Info : L'importation des photos n'est pas prise en charge par votre version de Dolibarr (Modulepart user non implémenté). Les photos suivantes seront ignorées pour cet import.`, 'warning');
              } else {
                addLog(`[Photo] Attention : Impossible d'associer la photo pour '${row['nom']}' - ${photoErr.message}`, 'warning');
              }
            }
          }
        } else {
          addLog(`[Employé] Création de '${row['nom']}' (Identifiant: ${login})...`, 'info');
          const res = await importRow('users', row, empMapping);
          const newUserId = (res && typeof res === 'object') ? (res.id || res.rowid) : res;

          if (newUserId) {
            const parsedUserId = parseInt(newUserId, 10);
            createdUsersMap[refEmp] = parsedUserId;
            newlyCreatedUserIds.push(parsedUserId); // Track newly created user
            employeeRefMap[refEmp] = login;
            empSuccess++;
            addLog(`[Employé] Ligne ${rowNum} : '${row['nom']}' créé avec succès (ID Dolibarr: ${parsedUserId})`, 'success');

            // Associated photo upload
            if (photosData[rowNum] && !skipPhotoUploads) {
              try {
                addLog(`[Photo] Association de la photo pour '${row['nom']}'...`, 'info');
                await uploadUserPhoto(newUserId, photosData[rowNum].filename, photosData[rowNum].filecontent);
                addLog(`[Photo] Photo associée avec succès pour '${row['nom']}'.`, 'success');
              } catch (photoErr) {
                if (photoErr.message.includes("not implemented yet") || photoErr.message.includes("Modulepart")) {
                  skipPhotoUploads = true;
                  addLog(`[Photo] Info : L'importation des photos n'est pas prise en charge par votre version de Dolibarr (Modulepart user non implémenté). Les photos suivantes seront ignorées pour cet import.`, 'warning');
                } else {
                  addLog(`[Photo] Attention : Impossible d'associer la photo pour '${row['nom']}' - ${photoErr.message}`, 'warning');
                }
              }
            }
          } else {
            throw new Error("L'API Dolibarr n'a pas retourné d'ID valide.");
          }
        }
      } catch (err) {
        empFail = employeesData.length - empSuccess;
        addLog(`[Employé] Ligne ${rowNum} : Échec pour '${row['nom']}' - ${err.message}`, 'error');
        hasError = true;
        break; // Stop loop on first error
      }

      setProgress(prev => ({
        ...prev,
        empCurrent: rowNum,
        empSuccess,
        empFail
      }));
    }

    if (hasError) {
      await performRollback();
      setIsImporting(false);
      return;
    }

    addLog(`=== FIN PHASE 1 : Employés créés avec succès : ${empSuccess} ===`, "info");

    // --- PHASE 2 : IMPORT SALARIES ---
    addLog(`=== PHASE 2 : Importation des salaires (${salariesData.length} à traiter) ===`, "info");

    let salSuccess = 0;
    let salFail = 0;

    // Default mapping for salaries
    const salMapping = {
      ref_employe_salary: 'ref_employe',
      amount: 'montant',
      date_debut: 'date_debut',
      date_fin: 'date_fin',
      paiement: 'paiement',
      ref_salaire: 'ref_salaire'
    };

    // Combine local newly created users with fetched users
    // For fetched users, we extract ref_employe from note_private
    const mergedUsers = [...allDolibarrUsers];

    // Add newly created users to mergedUsers if not already present
    Object.entries(createdUsersMap).forEach(([ref, id]) => {
      if (!mergedUsers.some(u => parseInt(u.id || u.rowid) === id)) {
        mergedUsers.push({
          id: id,
          login: employeeRefMap[ref],
          note_private: `ref_employe: ${ref}`
        });
      }
    });

    const context = {
      users: mergedUsers,
      employeeRefMap: employeeRefMap
    };

    for (let i = 0; i < salariesData.length; i++) {
      if (shouldStopRef.current) {
        addLog("Importation interrompue par l'utilisateur.", "warning");
        break;
      }

      const row = salariesData[i];
      const rowNum = i + 1;
      const refEmp = row['ref_employe'];
      const montant = row['montant'];

      try {
        addLog(`[Salaire] Liaison et création du salaire pour ref_employe '${refEmp}' (Montant: ${montant})...`, 'info');
        const res = await importRow('salaries', row, salMapping, context);
        const newSalId = (res && typeof res === 'object') ? (res.id || res.rowid) : res;

        if (newSalId) {
          const parsedSalId = parseInt(newSalId, 10);
          newlyCreatedSalaryIds.push(parsedSalId);
          salSuccess++;
          addLog(`[Salaire] Ligne ${rowNum} : Salaire créé avec succès (ID Dolibarr: ${parsedSalId})`, 'success');

          // Enregistrer chaque versement dans /salaries/{id}/payments
          const rawPaiement = row['paiement'];
          const payments = parsePaiementField(rawPaiement || '');
          const montantSalaire = parseFloat(row['montant']?.replace(',', '.') || '0');
          const totalPaid = payments.reduce((a, p) => a + p.amount, 0);
          const isFullyPaid = payments.length > 0 && Math.abs(totalPaid - montantSalaire) < 0.01;

          if (payments.length > 0) {
            addLog(`[Salaire] Enregistrement de ${payments.length} paiement(s) pour le salaire ${parsedSalId} (${isFullyPaid ? 'intégralement payé' : 'partiellement payé'})...`, 'info');
            try {
              const payResult = await recordSalaryPayments(parsedSalId, payments, isFullyPaid);
              if (payResult.posted > 0) {
                addLog(`[Salaire] ${payResult.posted} paiement(s) enregistré(s) avec succès.${isFullyPaid ? ' Salaire marqué comme payé (paye=1).' : ''}`, 'success');
              }
              if (payResult.errors.length > 0) {
                payResult.errors.forEach(e => addLog(`[Paiement] Attention : ${e}`, 'warning'));
              }
            } catch (payErr) {
              addLog(`[Paiement] Attention : Impossible d'enregistrer les paiements - ${payErr.message}`, 'warning');
            }
          } else {
            addLog(`[Salaire] Aucun paiement déclaré pour le salaire ${parsedSalId} → paye=0 conservé.`, 'info');
          }
        } else {
          throw new Error("L'API Dolibarr n'a pas retourné d'ID valide pour le salaire.");
        }
      } catch (err) {
        salFail = salariesData.length - salSuccess;
        addLog(`[Salaire] Ligne ${rowNum} : Échec pour ref_employe '${refEmp}' - ${err.message}`, 'error');
        hasError = true;
        break; // Stop loop on first error
      }

      setProgress(prev => ({
        ...prev,
        salCurrent: rowNum,
        salSuccess,
        salFail
      }));
    }

    if (hasError) {
      await performRollback();
      setIsImporting(false);
      return;
    }

    addLog(`=== FIN PHASE 2 : Salaires créés avec succès : ${salSuccess} ===`, "info");
    addLog("Importation combinée terminée avec succès.", "success");
    setIsImporting(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <H2 className="flex items-center gap-2">
          <ImportIcon className="w-6 h-6 text-black" />
          Importation Simultanée (GRH Dolibarr)
        </H2>
        <P className="text-neutral-500 mt-1">
          Déposez simultanément le fichier des <strong>Employés (Feuille 1)</strong> et des <strong>Salaires (Feuille 2)</strong> pour effectuer un import coordonné.
        </P>
      </div>

      {/* Stepper Header */}
      <div className="flex justify-between items-center bg-white p-4 border border-neutral-200 rounded-xl shadow-sm">
        {[
          { stepNum: 1, label: "Sélection des fichiers" },
          { stepNum: 2, label: "Aperçu des données" },
          { stepNum: 3, label: "Rapport d'importation" }
        ].map(({ stepNum, label }) => (
          <div key={stepNum} className="flex items-center gap-2">
            <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold ${step === stepNum
              ? 'bg-black text-white'
              : step > stepNum
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-neutral-100 text-neutral-400'
              }`}>
              {step > stepNum ? '✓' : stepNum}
            </span>
            <span className={`text-xs font-medium ${step === stepNum ? 'text-black font-semibold' : 'text-neutral-500'}`}>
              {label}
            </span>
            {stepNum < 3 && <span className="text-neutral-300 mx-2">→</span>}
          </div>
        ))}
      </div>

      {/* STEP 1: UPLOAD BOTH CSV FILES */}
      {step === 1 && (
        <Card>
          <Card.Body className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Employés file upload */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-800">1. Fichier Employés (Feuille 1)</label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOverEmp(true); }}
                  onDragLeave={() => setIsDragOverEmp(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOverEmp(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleEmployeesLoad(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => empInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[180px] ${isDragOverEmp ? 'border-black bg-neutral-50' : employeesFile ? 'border-emerald-500 bg-emerald-50/20' : 'border-neutral-200 hover:border-neutral-400'
                    }`}
                >
                  <input
                    type="file"
                    ref={empInputRef}
                    onChange={(e) => handleEmployeesLoad(e.target.files?.[0])}
                    accept=".csv"
                    className="hidden"
                  />
                  <ImportIcon className={`w-8 h-8 mb-2 ${employeesFile ? 'text-emerald-500 animate-pulse' : 'text-neutral-400'}`} />
                  {employeesFile ? (
                    <div>
                      <p className="text-sm font-semibold text-emerald-700">Fichier Employés chargé</p>
                      <p className="text-xs text-neutral-500 mt-1">{employeesFile.name} ({(employeesFile.size / 1024).toFixed(2)} KB)</p>
                      <p className="text-[10px] text-neutral-400 mt-2">{employeesData.length} employés détectés</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-neutral-850">Glissez le CSV des Employés ici</p>
                      <p className="text-xs text-neutral-400 mt-1">Modèle attendu : ref_employe, nom, genre...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Salaires file upload */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-800">2. Fichier Salaires (Feuille 2)</label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOverSal(true); }}
                  onDragLeave={() => setIsDragOverSal(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOverSal(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleSalariesLoad(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => salInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[180px] ${isDragOverSal ? 'border-black bg-neutral-50' : salariesFile ? 'border-emerald-500 bg-emerald-50/20' : 'border-neutral-200 hover:border-neutral-400'
                    }`}
                >
                  <input
                    type="file"
                    ref={salInputRef}
                    onChange={(e) => handleSalariesLoad(e.target.files?.[0])}
                    accept=".csv"
                    className="hidden"
                  />
                  <ImportIcon className={`w-8 h-8 mb-2 ${salariesFile ? 'text-emerald-500 animate-pulse' : 'text-neutral-400'}`} />
                  {salariesFile ? (
                    <div>
                      <p className="text-sm font-semibold text-emerald-700">Fichier Salaires chargé</p>
                      <p className="text-xs text-neutral-500 mt-1">{salariesFile.name} ({(salariesFile.size / 1024).toFixed(2)} KB)</p>
                      <p className="text-[10px] text-neutral-400 mt-2">{salariesData.length} salaires détectés</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-neutral-850">Glissez le CSV des Salaires ici</p>
                      <p className="text-xs text-neutral-400 mt-1">Modèle attendu : ref_salaire, ref_employe...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Photos ZIP upload */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-800">3. Photos des Employés (.zip - Optionnel)</label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOverPhotos(true); }}
                  onDragLeave={() => setIsDragOverPhotos(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOverPhotos(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handlePhotosLoad(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => photosInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[180px] ${isDragOverPhotos ? 'border-black bg-neutral-50' : photosFile ? 'border-emerald-500 bg-emerald-50/20' : 'border-neutral-200 hover:border-neutral-400'
                    }`}
                >
                  <input
                    type="file"
                    ref={photosInputRef}
                    onChange={(e) => handlePhotosLoad(e.target.files?.[0])}
                    accept=".zip"
                    className="hidden"
                  />
                  <ImportIcon className={`w-8 h-8 mb-2 ${photosFile ? 'text-emerald-500 animate-pulse' : 'text-neutral-400'}`} />
                  {photosFile ? (
                    <div>
                      <p className="text-sm font-semibold text-emerald-700">Fichier ZIP chargé</p>
                      <p className="text-xs text-neutral-500 mt-1">{photosFile.name} ({(photosFile.size / 1024).toFixed(2)} KB)</p>
                      <p className="text-[10px] text-neutral-400 mt-2">{Object.keys(photosData).length} photos détectées</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-neutral-850">Glissez le ZIP des Photos ici</p>
                      <p className="text-xs text-neutral-400 mt-1">Images nommées par ID (ex: 1.png, 2.png)</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {uploadError && <Alert variant="danger">{uploadError}</Alert>}

            <Divider />

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={resetAll} disabled={!employeesFile && !salariesFile && !photosFile}>Réinitialiser</Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!employeesFile || !salariesFile}
              >
                Suivant : Aperçu →
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* STEP 2: PREVIEW BOTH CSVs AND SUMMARY */}
      {step === 2 && (
        <div className="space-y-6">
          <Card>
            <Card.Body className="space-y-4">
              <div className="flex items-center justify-between">
                <H3>Validation & Liaison automatique</H3>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setStep(1)}>← Retour</Button>
                  <Button size="sm" variant="success" onClick={executeDoubleImport}>Lancer l'importation globale ✓</Button>
                </div>
              </div>
              <Alert>
                <strong>Liaison Détectée :</strong> Les salaires de la Feuille 2 seront liés automatiquement aux nouveaux employés créés de la Feuille 1 via le champ commun <code>ref_employe</code>.
              </Alert>
            </Card.Body>
          </Card>

          {/* Employees Preview */}
          <Card>
            <Card.Body className="space-y-3">
              <H3>Aperçu : Fichier Employés ({employeesData.length} lignes)</H3>
              <div className="overflow-x-auto">
                <Table striped>
                  <thead>
                    <Tr>
                      <Th>Photo</Th>
                      <Th>Civilité (Déduite)</Th>
                      {employeesHeaders.map(h => <Th key={h}>{h}</Th>)}
                    </Tr>
                  </thead>
                  <tbody>
                    {(showAllEmployees ? employeesData : employeesData.slice(0, 10)).map((row, idx) => {
                      const refEmp = row['ref_employe'];
                      const photoInfo = photosData[idx + 1];
                      const rawGender = (row['genre'] || '').toLowerCase();
                      const deducedCivility = (rawGender === 'homme' || rawGender === 'man') ? 'MR' : 
                                              (rawGender === 'femme' || rawGender === 'woman') ? 'MME' : 'N/A';

                      return (
                        <Tr key={idx}>
                          <Td>
                            {photoInfo ? (
                              <img 
                                src={`data:image/png;base64,${photoInfo.filecontent}`} 
                                alt="Avatar" 
                                className="w-8 h-8 rounded-full object-cover border border-neutral-200" 
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 text-xs font-semibold">
                                ?
                              </div>
                            )}
                          </Td>
                          <Td>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              deducedCivility === 'MR' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                              deducedCivility === 'MME' ? 'bg-pink-50 text-pink-700 border border-pink-100' :
                              'bg-neutral-50 text-neutral-500'
                            }`}>
                              {deducedCivility}
                            </span>
                          </Td>
                          {employeesHeaders.map(h => <Td key={h}>{row[h]}</Td>)}
                        </Tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
              {employeesData.length > 10 && (
                <div className="flex justify-between items-center pt-2 text-xs border-t border-neutral-150">
                  <span className="text-neutral-500">
                    Affichage des {showAllEmployees ? employeesData.length : 10} premières lignes sur {employeesData.length}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => setShowAllEmployees(!showAllEmployees)}>
                    {showAllEmployees ? "Réduire l'aperçu" : "Afficher toutes les lignes"}
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Salaries Preview */}
          <Card>
            <Card.Body className="space-y-3">
              <H3>Aperçu : Fichier Salaires ({salariesData.length} lignes)</H3>
              <Table striped>
                <thead>
                  <Tr>
                    {salariesHeaders.map(h => <Th key={h}>{h}</Th>)}
                  </Tr>
                </thead>
                <tbody>
                  {(showAllSalaries ? salariesData : salariesData.slice(0, 10)).map((row, idx) => (
                    <Tr key={idx}>
                      {salariesHeaders.map(h => <Td key={h}>{row[h]}</Td>)}
                    </Tr>
                  ))}
                </tbody>
              </Table>
              {salariesData.length > 10 && (
                <div className="flex justify-between items-center pt-2 text-xs border-t border-neutral-150">
                  <span className="text-neutral-500">
                    Affichage des {showAllSalaries ? salariesData.length : 10} premières lignes sur {salariesData.length}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => setShowAllSalaries(!showAllSalaries)}>
                    {showAllSalaries ? "Réduire l'aperçu" : "Afficher toutes les lignes"}
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </div>
      )}

      {/* STEP 3: DUAL EXECUTION PROGRESS & CONSOLE */}
      {step === 3 && (
        <Card>
          <Card.Body className="space-y-6">
            <div className="flex items-center justify-between">
              <H3>Progression de l'importation globale</H3>
              {!isImporting ? (
                <Button size="sm" variant="secondary" onClick={resetAll}>Faire un nouvel import</Button>
              ) : (
                <Button size="sm" variant="danger" onClick={handleStopImport}>Interrompre</Button>
              )}
            </div>

            {/* Two Column progress */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Employees progress */}
              <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/50 space-y-3">
                <h4 className="font-semibold text-sm text-neutral-800">Étape 1 : Employés (Feuille 1)</h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-lg border border-neutral-200">
                    <span className="text-neutral-400 uppercase font-semibold">Total</span>
                    <p className="text-lg font-bold text-neutral-800">{progress.empTotal}</p>
                  </div>
                  <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                    <span className="text-emerald-600 uppercase font-semibold">Succès</span>
                    <p className="text-lg font-bold text-emerald-700">{progress.empSuccess}</p>
                  </div>
                  <div className="bg-red-50/50 p-2 rounded-lg border border-red-100">
                    <span className="text-red-600 uppercase font-semibold">Échecs</span>
                    <p className="text-lg font-bold text-red-700">{progress.empFail}</p>
                  </div>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-black h-full transition-all"
                    style={{ width: `${progress.empTotal > 0 ? (progress.empCurrent / progress.empTotal) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Salaries progress */}
              <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/50 space-y-3">
                <h4 className="font-semibold text-sm text-neutral-800">Étape 2 : Salaires (Feuille 2)</h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-lg border border-neutral-200">
                    <span className="text-neutral-400 uppercase font-semibold">Total</span>
                    <p className="text-lg font-bold text-neutral-800">{progress.salTotal}</p>
                  </div>
                  <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                    <span className="text-emerald-600 uppercase font-semibold">Succès</span>
                    <p className="text-lg font-bold text-emerald-700">{progress.salSuccess}</p>
                  </div>
                  <div className="bg-red-50/50 p-2 rounded-lg border border-red-100">
                    <span className="text-red-600 uppercase font-semibold">Échecs</span>
                    <p className="text-lg font-bold text-red-700">{progress.salFail}</p>
                  </div>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-black h-full transition-all"
                    style={{ width: `${progress.salTotal > 0 ? (progress.salCurrent / progress.salTotal) * 100 : 0}%` }}
                  />
                </div>
              </div>

            </div>

            {isImporting ? (
              <div className="flex items-center gap-3 bg-neutral-50 border border-neutral-200 p-4 rounded-xl">
                <Spinner />
                <span className="text-sm text-neutral-600 font-medium">Importation combinée en cours. Veuillez patienter...</span>
              </div>
            ) : (
              <Alert variant={progress.empFail === 0 && progress.salFail === 0 ? 'success' : 'warning'}>
                Importation terminée ! {progress.empSuccess} employés et {progress.salSuccess} salaires importés. (Échecs employés: {progress.empFail}, salaires: {progress.salFail})
              </Alert>
            )}

            {/* Console logs */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-neutral-800 font-mono">Console d'exécution :</h4>
              <div className="bg-black text-neutral-200 font-mono text-xs p-4 rounded-xl h-72 overflow-y-auto flex flex-col gap-1">
                {logs.length === 0 && <span className="text-neutral-500 italic">Prêt à démarrer.</span>}
                {logs.map((log, index) => (
                  <div key={index} className={`flex items-start gap-2 ${log.type === 'success' ? 'text-emerald-400' :
                    log.type === 'error' ? 'text-red-400' :
                      log.type === 'warning' ? 'text-amber-400' : 'text-neutral-300'
                    }`}>
                    <span className="text-neutral-500 shrink-0 font-sans">[{log.time}]</span>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}