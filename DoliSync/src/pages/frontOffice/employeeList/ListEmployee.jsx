import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDolData } from '../../../services/apiClient';
import {
  H2, Card, Table, Th, Tr, Td,
   Input, Select, Button, Spinner, FormGroup
} from '../../../components/templates';
import SalaireMultipleModal from './SalaireMultipleModal';

export default function ListEmployee() {
  const navigate = useNavigate();
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ userSelected,setUserSelected]=useState("");

  const[ filters,  setFilters]=useState({
        genre: 'tous',
        poste:'tous',
        heuremin:'',
        heuremax:'',
    });

    useEffect(() => {
    fetchDolData('/users?limit=200').then((u) => {
    const usersData = Array.isArray(u) ? u : [];
      setUsers(usersData);
    }).finally(() => setLoading(false));
    }, []);
    
    const updateFilter=(key,value)=>{
        setFilters((prev)=>({...prev,[key]:value}));
    };

    const openModalForCreate = (employee) => {
    setUserSelected(employee);    
    setIsModalOpen(true);
  };


    const genres = useMemo(()=>{
    const uniques = new Set(users.map((c)=> c.gender));
    return [ 'tous', ...uniques];
    },[users]);

    const postes=useMemo(()=>{
        return['tous',...new Set(users.map((u)=>u.job))];
    },[users]);

    const filteredUsers = useMemo(() =>{
    const min = filters.heuremin !== '' ? parseFloat(filters.heuremin) : -Infinity;
    const max = filters.heuremax !== '' ? parseFloat(filters.heuremax) : Infinity;
    return users.filter((u)=>{
        const matchGenre = filters.genre==='tous' || u.gender === filters.genre;
        const matchPoste = filters.poste=== 'tous' || u.job === filters.poste;
        const matchHour = u.weeklyhours >=min && u.weeklyhours <=max;
        return matchGenre && matchPoste && matchHour;
    });
    }, [users, filters]);
  if (loading) return <Spinner />;
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <H2>Salariés</H2>
      </div>

      <Card>
        <Card.Body>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormGroup label="Poste">
              <Select value={filters.poste} onChange={e => updateFilter('poste', e.target.value)}>
                 {postes.map((p) => (
                    <option key={p} value={p}>{p === 'tous' ? 'Tous les postes' : p}</option>
                ))}
              </Select>
            </FormGroup>
            <FormGroup label="Genre">
              <Select value={filters.genre} onChange={e => updateFilter('genre', e.target.value)}>
                 {genres.map((g) => (
                    <option key={g} value={g}>{g === 'tous' ? 'Tous les genres' : g}</option>
                ))}
              </Select>
            </FormGroup>
            <Input
            type="number"
            placeholder="Heure min"
            value={filters.heuremin}
            onChange={(e) => updateFilter('heuremin', e.target.value)}
            />
            <Input
            type="number"
            placeholder="Heure max"
            value={filters.heuremax}
            onChange={(e) => updateFilter('heuremax', e.target.value)}
            />
          </div>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          <Table striped>
            <thead>
              <Tr>
                <Th>Genre</Th><Th>Employé</Th><Th>Poste</Th><Th>Heure Travail</Th>
              </Tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <Tr><Td colSpan={8} className="text-center text-neutral-400">Aucun résultat</Td></Tr>
              ) : filteredUsers.map(s => {
                return (
                  <Tr key={s.id}>
                    <Td>{s.gender}</Td>
                    <Td>{s.lastname}</Td>
                    <Td>{s.job}</Td>
                    <Td>{s.weeklyhours}</Td>
                    
                  </Tr>
                );
              })}
            </tbody>
          </Table>
          
        </Card.Body>
      </Card>
       <Button onClick={() => openModalForCreate(filteredUsers)}>Générer Salaire</Button>
        {isModalOpen && (
            <SalaireMultipleModal
              users={userSelected}
              onClose={() => setIsModalOpen(false)}
              onSaved={() => setIsModalOpen(false)}
            />
        )}
    </div>
);
}
