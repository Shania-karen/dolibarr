# Roadmap : 15 Fonctionnalités Futures pour DoliSync

Ce document détaille la logique de conception, le flux de données et les modifications requises pour 15 évolutions majeures et probables de DoliSync (Frontend React & Backend Express).

---

## Sommaire
1. [Importation en Masse des Jours Fériés (CSV)](#1-importation-en-masse-des-jours-fériés-csv)
2. [Gestion des Demandes de Congés (Absences)](#2-gestion-des-demandes-de-congés-absences)
3. [Authentification et Contrôle d'Accès (RBAC)](#3-authentification-et-contrôle-daccès-rbac)
4. [Génération Automatique de Fiches de Paie en PDF](#4-génération-automatique-de-fiches-de-paie-en-pdf)
5. [Suivi et Calcul des Heures Supplémentaires](#5-suivi-et-calcul-des-heures-supplémentaires)
6. [Gestion des Contrats de Travail (CDI, CDD, Stages)](#6-gestion-des-contrats-de-travail-cdi-cdd-stages)
7. [Intégration et Synchronisation des Notes de Frais](#7-intégration-et-synchronisation-des-notes-de-frais)
8. [Calcul des Cotisations Sociales et Passage du Brut au Net](#8-calcul-des-cotisations-sociales-et-passage-du-brut-au-net)
9. [Graphiques Analytiques et Exportations du Dashboard](#9-graphiques-analytiques-et-exportations-du-dashboard)
10. [Gestion des Primes, Bonus et Indemnités Exceptionnelles](#10-gestion-des-primes-bonus-et-indemnités-exceptionnelles)
11. [Journal d'Audit et Historique des Actions (Logs)](#11-journal-daudit-et-historique-des-actions-logs)
12. [Calendrier d'Équipe Interactif (Planning)](#12-calendrier-déquipe-interactif-planning)
13. [Archivage et Gestion des Départs d'Employés (Soft Delete)](#13-archivage-et-gestion-des-départs-demployés-soft-delete)
14. [Système d'Alertes et Notifications pour Salaires Impayés](#14-système-dalertes-et-notifications-pour-salaires-impayés)
15. [Synchronisation Bidirectionnelle Automatique (Worker en tâche de fond)](#15-synchronisation-bidirectionnelle-automatique-worker-en-tâche-de-fond)

---

### 1. Importation en Masse des Jours Fériés (CSV)
* **Objectif** : Permettre aux administrateurs de charger le calendrier annuel des jours fériés depuis un fichier CSV au lieu de les insérer individuellement.
* **Modifications Frontend** :
  * Dans `Import.jsx`, ajouter une troisième zone de dépôt (Drag & Drop) pour le fichier des jours fériés (`holidays.csv`).
  * Mettre à jour l'interface pour afficher un aperçu sous forme de tableau avant de lancer l'import.
* **Modifications Backend & Base de données** :
  * `server/database.js` : S'assurer que la table `holiday_public` intègre une colonne `nombreJours REAL` (pour gérer les demi-journées).
  * `server/routes/holidayPublic.js` : Le endpoint `POST /` accepte un tableau d'éléments pour permettre les insertions en lot (`bulk insert`).
* **Flux de données** :
  ```
  [Fichier CSV] ➔ [FileReader en JS] ➔ [Validation colonnes obligatoires]
      ➔ [Fetch POST /api/holidayPublic/bulk] ➔ [Insertion SQLite] ➔ [Statut UI]
  ```

### 2. Gestion des Demandes de Congés (Absences)
* **Objectif** : Permettre aux employés de soumettre des demandes de congés et aux managers de les valider ou rejeter.
* **Modifications Frontend** :
  * Créer une page "Demande de congés" (formulaire avec date début, date fin, type : payé, maladie, etc.).
  * Créer un tableau de bord manager pour approuver/refuser avec un simple bouton.
* **Modifications Backend & Base de données** :
  * Créer une table SQLite `leave_requests` :
    ```sql
    CREATE TABLE leave_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fkUser INTEGER NOT NULL,
      dateStart TEXT NOT NULL,
      dateEnd TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
      comment TEXT
    );
    ```
  * Créer des routes d'API Express : `GET /api/leaves`, `POST /api/leaves`, `PUT /api/leaves/:id/status`.
* **Flux de données** : L'employé soumet la requête ➔ SQLite enregistre en `'PENDING'`. Le manager valide ➔ statut passe à `'APPROVED'`. Une requête peut également être envoyée à Dolibarr via son API de congés (`/leaves`) pour centraliser les compteurs de congés.

### 3. Authentification et Contrôle d'Accès (RBAC)
* **Objectif** : Sécuriser l'application en distinguant les comptes administrateurs (accès au BackOffice et imports) et employés (FrontOffice, vue personnelle).
* **Modifications Frontend** :
  * Formulaire de login.
  * Stockage du jeton JWT dans le `localStorage` ou `sessionStorage`.
  * Utilisation d'un `ProtectedRoute` vérifiant le rôle (Admin ou Employé) présent dans le jeton.
* **Modifications Backend & Base de données** :
  * Ajouter une table SQLite `app_users` ou mapper directement sur les comptes utilisateurs Dolibarr en vérifiant le mot de passe hashé lors du login via l'API Dolibarr `/login`.
  * Middleware Express `authenticateToken` pour vérifier la signature des requêtes API vers le serveur local.

### 4. Génération Automatique de Fiches de Paie en PDF
* **Objectif** : Fournir un bouton "Télécharger la fiche de paie" pour chaque salaire payé, générant un PDF conforme aux normes.
* **Modifications Frontend** :
  * Dans `EmployeDetailModal.jsx`, à côté de chaque salaire avec le statut "Payé", ajouter un bouton "Télécharger PDF".
* **Modifications Backend & Base de données** :
  * Installer `pdfkit` ou `puppeteer` sur le serveur Express.
  * Créer une route `GET /api/salaries/:id/pdf`. Cette route rassemble les données de l'employé (nom, poste, heures), du salaire brut, des cotisations, et génère le fichier PDF à la volée.
* **Flux de données** : Le client appelle l'URL de téléchargement ➔ Express génère le flux binaire PDF ➔ Le navigateur déclenche le téléchargement du fichier.

### 5. Suivi et Calcul des Heures Supplémentaires
* **Objectif** : Comparer les heures contractuelles déclarées (`weeklyhours`) avec les feuilles de temps réelles pour calculer le coût des heures supplémentaires.
* **Modifications Frontend** :
  * Formulaire de saisie hebdomadaire des heures pour chaque employé.
* **Modifications Backend & Base de données** :
  * Table SQLite `timesheets` :
    ```sql
    CREATE TABLE timesheets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fkUser INTEGER NOT NULL,
      weekNumber INTEGER NOT NULL,
      year INTEGER NOT NULL,
      hoursWorked REAL NOT NULL
    );
    ```
  * Logique de calcul : `Heures Supp = Max(0, hoursWorked - weeklyhours)`. Appliquer un taux majoré (ex. +25%) sur le montant horaire de base dans le calcul du salaire.

### 6. Gestion des Contrats de Travail (CDI, CDD, Stages)
* **Objectif** : Associer chaque employé à un contrat actif définissant son salaire de base, sa date d'embauche et le type de contrat.
* **Modifications Frontend** :
  * Onglet "Contrats" dans le profil employé pour visualiser l'historique et charger les pièces jointes (fichiers de contrats).
* **Modifications Backend & Base de données** :
  * Table SQLite `contracts` :
    ```sql
    CREATE TABLE contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fkUser INTEGER NOT NULL,
      type TEXT NOT NULL, -- CDI, CDD, Alternance
      dateStart TEXT NOT NULL,
      dateEnd TEXT,
      baseSalary REAL NOT NULL,
      documentPath TEXT
    );
    ```

### 7. Intégration et Synchronisation des Notes de Frais
* **Objectif** : Suivre et rembourser les frais professionnels des employés (déplacements, repas) et les comptabiliser à côté du salaire.
* **Modifications Frontend** :
  * Formulaire de soumission de note de frais avec upload de reçu (image/PDF).
* **Modifications Backend & Base de données** :
  * Synchronisation avec le module Dolibarr `/expensereports`.
  * La route `POST /api/expenses` crée la note de frais localement pour approbation puis l'envoie à l'API Dolibarr.

### 8. Calcul des Cotisations Sociales et Passage du Brut au Net
* **Objectif** : Calculer automatiquement les charges salariales et patronales pour n'avoir à saisir que le montant brut dans le CSV d'import.
* **Modifications Frontend** :
  * Affichage détaillé du Brut, des cotisations et du Net à payer dans les modals.
* **Modifications Backend & Base de données** :
  * Fichier de configuration des taux de cotisation (ex: retraite 6.9%, santé 13%, etc.).
  * Lors de la création d'un salaire, calculer et stocker les parts patronales et salariales.

### 9. Graphiques Analytiques et Exportations du Dashboard
* **Objectif** : Permettre au management de visualiser l'évolution temporelle de la masse salariale et d'exporter des rapports de synthèse.
* **Modifications Frontend** :
  * Intégration de `recharts` ou `chart.js` sur le `Dashboard.jsx`.
  * Boutons "Exporter Excel" (génération d'un fichier `.xlsx` via la bibliothèque `xlsx`).
* **Modifications Backend & Base de données** :
  * Point de terminaison dédié `GET /api/reports/salary-evolution` agrégeant les salaires par mois sur l'année sélectionnée.

### 10. Gestion des Primes, Bonus et Indemnités Exceptionnelles
* **Objectif** : Ajouter des composants variables au salaire mensuel (primes d'objectifs, indemnités de transport).
* **Modifications Frontend** :
  * Ajout de champs "Primes" et "Retenues" lors de la création d'un salaire unitaire ou lors de l'import CSV.
* **Modifications Backend & Base de données** :
  * Modification de la structure de stockage (localement et dans le champ `note_private` ou les lignes de détails Dolibarr) pour ventiler le salaire de base et les variables.

### 11. Journal d'Audit et Historique des Actions (Logs)
* **Objectif** : Enregistrer toutes les actions critiques (création de salaire, import de CSV, modification de jour férié) à des fins de traçabilité.
* **Modifications Backend & Base de données** :
  * Table SQLite `audit_logs` :
    ```sql
    CREATE TABLE audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      username TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      details TEXT
    );
    ```
  * Middleware ou helper de log appelé sur chaque route d'écriture (`POST`, `PUT`, `DELETE`).

### 12. Calendrier d'Équipe Interactif (Planning)
* **Objectif** : Afficher dans une vue mensuelle unifiée les jours fériés, les congés des collaborateurs et les dates importantes.
* **Modifications Frontend** :
  * Composant Calendrier (ex. `FullCalendar` ou implémentation sur-mesure en React).
  * Récupération conjointe de `GET /api/holidayPublic` et `GET /api/leaves` pour peupler le calendrier.

### 13. Archivage et Gestion des Départs d'Employés (Soft Delete)
* **Objectif** : Désactiver un employé qui quitte l'entreprise sans supprimer ses données de paie historiques.
* **Modifications Frontend** :
  * Bouton "Archiver l'employé" dans l'UI. Les employés archivés n'apparaissent plus par défaut mais restent accessibles via un filtre "Membres archivés".
* **Modifications Backend & Base de données** :
  * Ajout d'un statut logique aux requêtes ou mise à jour de l'état utilisateur (`statut = 0` dans Dolibarr).

### 14. Système d'Alertes et Notifications pour Salaires Impayés
* **Objectif** : Signaler visuellement et par email les salaires en retard de paiement.
* **Modifications Frontend** :
  * Badge clignotant ou bandeau d'alerte en haut du tableau de bord indiquant le nombre de salaires "En attente" dont la date d'échéance est dépassée.
* **Modifications Backend & Base de données** :
  * Script Node.js de vérification journalière (Cron / Interval) envoyant un mail de rappel aux gestionnaires de paie si des salaires restent dus après le 5 du mois suivant.

### 15. Synchronisation Bidirectionnelle Automatique (Worker en tâche de fond)
* **Objectif** : Éviter les actions manuelles d'import/export en maintenant la base locale SQLite et Dolibarr synchronisées en temps réel.
* **Modifications Backend & Base de données** :
  * Utilisation d'un ordonnanceur comme `node-cron`.
  * Lancer toutes les heures une routine qui interroge l'API Dolibarr (`/users`, `/salaries`), compare avec les enregistrements SQLite locaux, et applique les deltas nécessaires (ajout de nouveaux utilisateurs, mise à jour des statuts de paiement).
