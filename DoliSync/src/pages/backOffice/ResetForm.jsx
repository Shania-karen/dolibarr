import { useState } from 'react';
import { purgeSelectedTables } from '../../utils/resetHelper';
import { H3, P, Button, Card, Alert } from '../../components/templates';

export default function ResetForm({ onResetComplete }) {
  const tableGroups = [
    {
      category: "Ressources Humaines (GRH)",
      tables: [
        { label: "Salaires (Feuille 2)", endpoint: "salaries" },
        { label: "Salaires paiement", endpoint: "salaries/payments" },
        { label: "Demandes de Congés", endpoint: "holidays" },
        { label: "Jours Fériés", endpoint: "holidayPublic" },
        { label: "Notes de Frais", endpoint: "expensereports" },
        { label: "Employés / Utilisateurs (Feuille 1)", endpoint: "users" },
      ]
    },
    {
      category: "Produits & Stocks",
      tables: [
        { label: "Produits", endpoint: "products" },
        { label: "Entrepôts", endpoint: "warehouses" },
      ]
    }
  ];

  const [selectedTables, setSelectedTables] = useState([]);
  const [isPurging, setIsPurging] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleCheckboxChange = (endpoint) => {
    setSelectedTables(prev =>
      prev.includes(endpoint)
        ? prev.filter(t => t !== endpoint)
        : [...prev, endpoint]
    );
  };

  const handleGroupCheckboxChange = (group, isChecked) => {
    const groupEndpoints = group.tables.map(t => t.endpoint);
    if (isChecked) {
      setSelectedTables(prev => {
        const newSelection = [...prev];
        groupEndpoints.forEach(ep => {
          if (!newSelection.includes(ep)) newSelection.push(ep);
        });
        return newSelection;
      });
    } else {
      setSelectedTables(prev => prev.filter(ep => !groupEndpoints.includes(ep)));
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();

    if (selectedTables.length === 0) {
      alert("Veuillez selectionner au moins une table a reinitialiser.");
      return;
    }
    const confirm = window.confirm(
      "ATTENTION : Vous etes sur le point de supprimer DEFINITIVEMENT toutes les donnees des tables selectionnees. Cette action est irreversible. Voulez-vous continuer ?"
    );
    if (!confirm) return;

    setIsPurging(true);
    setStatusMessage('Demarrage de la purge...');

    try {
      let deletedCount = 0;

      // 1. Purge tables GLPI
      if (selectedTables.length > 0) {
        deletedCount += await purgeSelectedTables(selectedTables, (message, current, total) => {
          setStatusMessage(`${message} (${current}/${total})`);
        });
      }

      // 2. Purge tables SQLite (Spring Boot) — table unifiée "couts"


      alert(`Reinitialisation terminee.\n${deletedCount} element(s) supprime(s).`);
      if (onResetComplete) onResetComplete();
      setSelectedTables([]);


    } catch (error) {
      alert(`Erreur lors de la reinitialisation : ${error.message}`);
    } finally {
      setIsPurging(false);
      setStatusMessage('');
    }
  };

  return (
    <Card>
      <Card.Body>
        <H3 className="mb-4">Reinitialisation des donnees</H3>
        <form onSubmit={handleResetSubmit}>
          <P className="mb-3">Selectionnez les tables a vider via l'API :</P>

          <div className="flex flex-col gap-6 mb-6">
            {tableGroups.map((group) => {
              const isGroupFullySelected = group.tables.length > 0 && group.tables.every(t => selectedTables.includes(t.endpoint));

              return (
                <div key={group.category} className="border border-neutral-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3 border-b border-neutral-100 pb-2">
                    <h4 className="font-semibold text-neutral-800">{group.category}</h4>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-500 hover:text-black font-medium">
                      <input
                        type="checkbox"
                        checked={isGroupFullySelected}
                        onChange={(e) => handleGroupCheckboxChange(group, e.target.checked)}
                        disabled={isPurging}
                        className="accent-black"
                      />
                      Tout sélectionner
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {group.tables.map((table) => (
                      <label key={table.endpoint} className="flex items-center gap-2 cursor-pointer text-sm text-neutral-700">
                        <input
                          type="checkbox"
                          value={table.endpoint}
                          checked={selectedTables.includes(table.endpoint)}
                          onChange={() => handleCheckboxChange(table.endpoint)}
                          disabled={isPurging}
                          className="accent-black"
                        />
                        {table.label}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>


          <Button
            type="submit"
            disabled={isPurging || (selectedTables.length === 0)}
          >
            {isPurging ? 'Purge en cours...' : 'Vider les tables selectionnees'}
          </Button>

          {statusMessage && (
            <Alert className="mt-4">{statusMessage}</Alert>
          )}
        </form>
      </Card.Body>
    </Card>
  );
}