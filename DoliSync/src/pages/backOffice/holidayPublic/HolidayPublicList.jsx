import { useState, useEffect } from 'react';
import { useUsers } from '../../../hooks/useUser';
import { HolidaysPublicService } from '../../../services/holidayPublicService';
import HolidayPublicModal from './HolidayPublicModal';


import {
  H1, P, Button, Table, Th, Tr, Td, Badge, Alert, Spinner, Divider, Card,
} from '../../../components/templates';

export default function HolidayPublicList() {
const [loadingExtra, setLoadingExtra] = useState(true);
const [holidays , setHolidays]=useState([]);
const [error, setError] = useState("");

const loadData = async (isReload = false) => {   
    if (isReload) {
      setLoadingExtra(true); 
    }
    try {
      const holidaysPublic = await HolidaysPublicService.getAll();
      setHolidays(holidaysPublic);
    } catch (err) {
      console.error('Erreur chargement données:', err);
      setError(err.message);
    } finally {
      setLoadingExtra(false); 
    }
  };
  useEffect(() => {
    loadData(); 
  }, []);
   

  const { users } = useUsers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentHoliday, setCurrentHoliday] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const totalPages = Math.ceil(holidays.length / itemsPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const currentHolidays = holidays.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);


  const openModalForCreate = () => {
    setCurrentHoliday(null);
    setIsModalOpen(true);
  };
  const handleDelete = async (holiday) => {
    if (window.confirm(`Voulez-vous vraiment supprimer le jour férié "${holiday.label || 'Sans titre'}" ?`)) {
      try {
        await HolidaysPublicService.delete(holiday.id);
        loadData(true);
      } catch (err) {
        alert("Erreur lors de la suppression : " + err.message);
      }
    }
  };

  const openModalForEdit = (holiday) => {
    setCurrentHoliday(holiday);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <H1>Gestion des jours fériés</H1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={openModalForCreate}>
            Ajouter un jour férié
          </Button>
        </div>
      </div>

      {loadingExtra && <Spinner size="lg" label="Chargement en cours..." />}

      {error && <Alert>Erreur : {error}</Alert>}

      {!loadingExtra && !error && (
        <>
          <Table>
            <thead>
              <Tr>
                <Th>ID</Th>
                <Th>Date</Th>
                <Th>Période</Th>
                <Th>Label</Th>       
                <Th>Action</Th>         
              </Tr>
            </thead>
            <tbody>
              {currentHolidays.length > 0 ? (
                currentHolidays.map((holiday) => {
                  const formatPeriode = (type) => {
                    switch (type) {
                      case 'MATIN': return 'Matin';
                      case 'APRES_MIDI': return 'Après-midi';
                      case 'JOURNEE_ENTIERE': default: return 'Journée entière';
                    }
                  };
                  return (
                    <Tr key={holiday.id}>
                      <Td>{holiday.id}</Td>
                      <Td className="font-medium text-black">{holiday.dateHoliday }</Td>
                      <Td>{formatPeriode(holiday.typePeriode)}</Td>
                      <Td>{holiday.label || 'Sans titre' }</Td>
                      <Td>
                        <div className="flex gap-2">
                          <Button size="sm" variant="success" onClick={() => openModalForEdit(holiday)}>
                           Modifier
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => handleDelete(holiday)}>
                             Supprimer
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  );
                })
              ) : (
                <Tr>
                  <Td colSpan="9" className="text-center py-8 text-neutral-400">
                    Aucun jour ferié trouvé.
                  </Td>
                </Tr>
              )}
            </tbody>
          </Table>


          <div className="flex items-center justify-between mt-4 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-sm text-neutral-500">
              Affichage de <strong>{holidays.length > 0 ? (activePage - 1) * itemsPerPage + 1 : 0}</strong> à <strong>{Math.min(activePage * itemsPerPage, holidays.length)}</strong> sur <strong>{holidays.length}</strong> jours feriés
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={activePage === 1}
                onClick={() => setCurrentPage(Math.max(activePage - 1, 1))}
              >
                Précédent
              </Button>
              <span className="text-sm font-medium text-black px-3 py-1 bg-neutral-100 rounded-md border border-neutral-200">
                Page {activePage} sur {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={activePage === totalPages}
                onClick={() => setCurrentPage(Math.min(activePage + 1, totalPages))}
              >
                Suivant
              </Button>
            </div>
          </div>
        </>
      )}

      {isModalOpen && (
        <HolidayPublicModal
          holiday={currentHoliday}
          users={users}
          onClose={() => setIsModalOpen(false)}
          onSaved={() => loadData(true)}
          onClick={()=> console.log("jour ferié modal cliqueee")}
        />
      )}
      <Divider />
    </div>
  );
}