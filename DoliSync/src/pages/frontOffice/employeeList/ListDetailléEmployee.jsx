import { useEffect, useState } from 'react';

import { fetchDolData } from '../../../services/apiClient';
import {
  H2, Card, Table, Th, Tr, Td, Button, Spinner
} from '../../../components/templates';
import EmployeDetailModal from './EmployeDetailModal';

export default function ListDetailléEmployee() {
  
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ userSelected,setUserSelected]=useState("");
  
    useEffect(() => {
    fetchDolData('/users?limit=200').then((u) => {
    const usersData = Array.isArray(u) ? u : [];
      setUsers(usersData);
    }).finally(() => setLoading(false));
    }, []);
    
    const openModalForDetail = (employee) => {
    setUserSelected(employee);    
    setIsModalOpen(true);
  };

  if (loading) return <Spinner />;
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <H2>Salariés</H2>
      </div>

      <Card>
        <Card.Body>
          <Table striped>
            <thead>
              <Tr>
                <Th>Genre</Th><Th>Employé</Th><Th>Poste</Th><Th>Heure Travail</Th><Th>Action</Th>
              </Tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <Tr><Td colSpan={8} className="text-center text-neutral-400">Aucun résultat</Td></Tr>
              ) : users.map(s => {
                return (
                  <Tr key={s.id}>
                    <Td>{s.gender}</Td>
                    <Td>{s.lastname}</Td>
                    <Td>{s.job}</Td>
                    <Td>{s.weeklyhours}</Td>
                    <Td>
                      <Button size="sm" variant="outline" onClick={() => openModalForDetail(s)}>
                        Voir détail
                      </Button>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
          
        </Card.Body>
      </Card>
        {isModalOpen && (() => {
          console.log("userrrrrr"+ userSelected.lastname);
          return (
            <EmployeDetailModal
              user={userSelected}
              onClose={() => setIsModalOpen(false)}
            />
          );
        })()}
    </div>
);
}
