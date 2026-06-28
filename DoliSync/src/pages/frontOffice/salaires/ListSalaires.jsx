import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDolData } from '../../../services/apiClient';
import {
  H2, Card, Table, Th, Tr, Td,
  Badge, Input, Select, Button, Spinner, FormGroup
} from '../../../components/templates';

const euro   = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(+n || 0);
const tsDate = (ts) => ts ? new Date(+ts * 1000).toLocaleDateString('fr-FR', { timeZone: 'Indian/Antananarivo' }) : '—';

export default function ListSalaires() {
  const navigate = useNavigate();
  const [salaries, setSalaries] = useState([]);
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);

  const [search,     setSearch]     = useState('');
  const [filterPaye, setFilterPaye] = useState('all');
  const [filterMois, setFilterMois] = useState('all');

  useEffect(() => {
    Promise.all([
      fetchDolData('/salaries?limit=500'),
      fetchDolData('/users?limit=200'),
      fetchDolData('/salaries/payments?limit=1000'),
    ]).then(([s, u, p]) => {
      const salariesData = Array.isArray(s) ? s : [];
      const usersData = Array.isArray(u) ? u : [];
      const paymentsData = Array.isArray(p) ? p : [];

      const processedSalaries = salariesData.map(sal => {
        const salPayments = paymentsData.filter(pay => String(pay.fk_salary) === String(sal.id));
        const totalPaid = salPayments.reduce((a, pay) => a + parseFloat(pay.amount || 0), 0);
        let latestDatep = null;
        if (salPayments.length > 0) {
          const timestamps = salPayments
            .map(pay => {
              const val = pay.datepaye || pay.date || pay.datep;
              if (!val) return null;
              if (typeof val === 'number') return val;
              if (typeof val === 'string') {
                if (/^\d+$/.test(val)) return parseInt(val);
                const d = new Date(val);
                return isNaN(d.getTime()) ? null : Math.floor(d.getTime() / 1000);
              }
              return null;
            })
            .filter(t => t !== null && !isNaN(t) && t > 0);
          if (timestamps.length > 0) {
            latestDatep = Math.max(...timestamps);
          }
        }
        return {
          ...sal,
          totalPaid,
          datep: latestDatep || sal.datep || null
        };
      });

      setSalaries(processedSalaries);
      setUsers(usersData);
    }).finally(() => setLoading(false));
  }, []);

  const userName = (fk_user) => {
    const u = users.find(u => String(u.id) === String(fk_user));
    return u ? `${u.lastname || ''} ${u.firstname || ''}`.trim() : `#${fk_user}`;
  };

  const availableMonths = useMemo(() => {
    const set = new Set();
    salaries.forEach(s => {
      const ts = s.datep;
      if (ts) { const d = new Date(+ts*1000); set.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`); }
    });
    return [...set].sort().reverse();
  }, [salaries]);

  const filtered = useMemo(() => salaries.filter(s => {
    const name = userName(s.fk_user).toLowerCase();
    if (search && !name.includes(search.toLowerCase()) && !String(s.id).includes(search)) return false;
    if (filterPaye !== 'all' && String(s.paye) !== filterPaye) return false;
    if (filterMois !== 'all') {
      const ts = s.datep;
      if (!ts) return false;
      const d = new Date(+ts*1000);
      const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (ym !== filterMois) return false;
    }
    return true;
  }), [salaries, users, search, filterPaye, filterMois]);

  if (loading) return <Spinner />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <H2>Salaires</H2>
        <Button onClick={() => navigate('/salaires/nouveau')}>Nouveau salaire</Button>
      </div>

      <Card>
        <Card.Body>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormGroup label="Recherche">
              <Input placeholder="Nom ou ID..." value={search} onChange={e => setSearch(e.target.value)} />
            </FormGroup>
            <FormGroup label="Statut">
              <Select value={filterPaye} onChange={e => setFilterPaye(e.target.value)}>
                <option value="all">Tous</option>
                <option value="1">Payé</option>
                <option value="0">Non payé</option>
              </Select>
            </FormGroup>
            <FormGroup label="Mois de règlement">
              <Select value={filterMois} onChange={e => setFilterMois(e.target.value)}>
                <option value="all">Tous</option>
                {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
              </Select>
            </FormGroup>
          </div>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          <Table striped>
            <thead>
              <Tr>
                <Th>ID</Th><Th>Employé</Th><Th>Période</Th><Th>Montant Brut</Th><Th>Reste à payer</Th><Th>Règlement</Th><Th>Statut</Th><Th></Th>
              </Tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <Tr><Td colSpan={8} className="text-center text-neutral-400">Aucun résultat</Td></Tr>
              ) : filtered.map(s => {
                const reste = Math.max(0, parseFloat(s.amount || 0) - (s.totalPaid || 0));
                return (
                  <Tr key={s.id}>
                    <Td>{s.id}</Td>
                    <Td>{userName(s.fk_user)}</Td>
                    <Td>{tsDate(s.datesp)} — {tsDate(s.dateep)}</Td>
                    <Td>{euro(s.amount)}</Td>
                    <Td className="font-semibold text-neutral-600">
                      {euro(reste)}
                    </Td>
                    <Td>{tsDate(s.datep)}</Td>
                    <Td>
                      <Badge variant={s.paye == 1 ? 'success' : 'warning'}>
                        {s.paye == 1 ? 'Payé' : 'En attente'}
                      </Badge>
                    </Td>
                    <Td>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/salaires/${s.id}`)}>
                        Détail
                      </Button>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
}
