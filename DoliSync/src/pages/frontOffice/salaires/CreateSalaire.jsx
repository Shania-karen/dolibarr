import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDolData } from '../../../services/apiClient';
import {
  H2, H3, Card, Alert, Badge, Button, Spinner,
  FormGroup, Input, Select
} from '../../../components/templates';

const euro   = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(+n || 0);
const today  = () => new Date().toISOString().slice(0, 10);

const EMPTY_FORM = { fk_user: '', amount: '', datesp: '', dateep: '' };
const EMPTY_PAY  = { date: today(), amount: '' };

export default function CreateSalaire() {
  const navigate = useNavigate();
  const [users,          setUsers]          = useState([]);
  const [bankAccounts,   setBankAccounts]   = useState([]);
  const [unpaidSalaries, setUnpaidSalaries] = useState([]);
  
  const [form,           setForm]           = useState(EMPTY_FORM);
  const [payments,       setPayments]       = useState([]);
  const [newPay,         setNewPay]         = useState(EMPTY_PAY);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState('');
  
  const [salaryId,       setSalaryId]       = useState(null);
  const [selectedSalId,  setSelectedSalId]  = useState('');
  const [selectedSal,    setSelectedSal]    = useState(null);

  useEffect(() => {
    Promise.all([
      fetchDolData('/users?limit=200'),
      fetchDolData('/bankaccounts?limit=50'),
      fetchDolData('/salaries?limit=500'),
      fetchDolData('/salaries/payments?limit=1000'),
    ]).then(([u, b, s, p]) => {
      setUsers(Array.isArray(u) ? u : []);
      setBankAccounts(Array.isArray(b) ? b : []);
      
      const salariesData = Array.isArray(s) ? s : [];
      const paymentsData = Array.isArray(p) ? p : [];
      
      const unpaid = salariesData.map(sal => {
        const salPayments = paymentsData.filter(pay => String(pay.fk_salary) === String(sal.id));
        const totalPaid = salPayments.reduce((a, pay) => a + parseFloat(pay.amount || 0), 0);
        const reste = Math.max(0, parseFloat(sal.amount || 0) - totalPaid);
        return { ...sal, totalPaid, reste };
      }).filter(sal => sal.reste > 0.01);
      
      setUnpaidSalaries(unpaid);
    });
  }, []);

  const totalPaid   = payments.reduce((a, p) => a + +p.amount, 0);
  const isFullyPaid = form.amount && Math.abs(totalPaid - +form.amount) < 0.01;
  const chid        = bankAccounts[0]?.id;

  const handleCreate = async () => {
    if (!form.fk_user || !form.amount || !form.datesp || !form.dateep) {
      setError('Tous les champs obligatoires doivent être remplis.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const toTs = (d) => Math.floor(new Date(`${d}T00:00:00+03:00`).getTime() / 1000);
      const res = await fetchDolData('/salaries', {
        method: 'POST',
        body: {
          fk_user: +form.fk_user,
          amount:  +form.amount,
          datesp:  toTs(form.datesp),
          dateep:  toTs(form.dateep),
          label:   `Salaire ${form.datesp} — ${form.dateep}`,
          paye: 0,
        }
      });
      const id = (res && typeof res === 'object') ? (res.id || res.rowid) : res;
      setSalaryId(parseInt(id));
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddPayment = async () => {
    if (!newPay.date || !newPay.amount || !chid) {
      setError(!chid ? 'Aucun compte bancaire disponible.' : 'Date et montant requis.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const toTs = (d) => Math.floor(new Date(`${d}T00:00:00+03:00`).getTime() / 1000);
      await fetchDolData(`/salaries/${salaryId}/payments`, {
        method: 'POST',
        body: {
          datepaye:    toTs(newPay.date),
          amounts:     { [salaryId]: +newPay.amount },
          paiementtype: 0,
          chid,
        }
      });
      const recorded = [...payments, { ...newPay }];
      setPayments(recorded);
      setNewPay({ date: today(), amount: '' });

      const total = recorded.reduce((a, p) => a + +p.amount, 0);
      if (Math.abs(total - +form.amount) < 0.01) {
        const lastDate = [...recorded].sort((a,b) => b.date.localeCompare(a.date))[0].date;
        await fetchDolData(`/salaries/${salaryId}`, {
          method: 'PUT',
          body: { paye: 1, datep: toTs(lastDate) }
        });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectUnpaid = (id) => {
    setSelectedSalId(id);
    const sal = unpaidSalaries.find(s => String(s.id) === String(id));
    setSelectedSal(sal || null);
  };

  const handlePayUnpaid = async () => {
    if (!newPay.date || !newPay.amount || !chid || !selectedSal) return;
    setError('');
    setSaving(true);
    try {
      const toTs = (d) => Math.floor(new Date(`${d}T00:00:00+03:00`).getTime() / 1000);
      const pAmount = parseFloat(newPay.amount);
      
      await fetchDolData(`/salaries/${selectedSal.id}/payments`, {
        method: 'POST',
        body: {
          datepaye:    toTs(newPay.date),
          amounts:     { [selectedSal.id]: pAmount },
          paiementtype: 0,
          chid,
        }
      });

      const newTotalPaid = selectedSal.totalPaid + pAmount;
      const newReste = Math.max(0, parseFloat(selectedSal.amount || 0) - newTotalPaid);
      
      await fetchDolData(`/salaries/${selectedSal.id}`, {
        method: 'PUT',
        body: { 
          paye: newReste < 0.01 ? 1 : 0, 
          datep: toTs(newPay.date) 
        }
      });

      alert("Versement enregistré !");
      window.location.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <H2>Gestion des salaires</H2>
        <Button variant="outline" onClick={() => navigate('/salaires')}>Retour</Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Étape 1 : Création de salaire */}
      {!selectedSal && (
        <Card>
          <Card.Body className="space-y-4">
            <H3>Nouveau salaire</H3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormGroup label="Employé" required>
                <Select value={form.fk_user} onChange={e => setForm({...form, fk_user: e.target.value})} disabled={!!salaryId}>
                  <option value="">Sélectionner...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.lastname} {u.firstname}</option>
                  ))}
                </Select>
              </FormGroup>
              <FormGroup label="Montant brut (€)" required>
                <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} disabled={!!salaryId} />
              </FormGroup>
              <FormGroup label="Date début" required>
                <Input type="date" value={form.datesp} onChange={e => setForm({...form, datesp: e.target.value})} disabled={!!salaryId} />
              </FormGroup>
              <FormGroup label="Date fin" required>
                <Input type="date" value={form.dateep} onChange={e => setForm({...form, dateep: e.target.value})} disabled={!!salaryId} />
              </FormGroup>
            </div>

            {!salaryId ? (
              <Button onClick={handleCreate} disabled={saving}>{saving ? <Spinner size="sm" /> : 'Créer le salaire'}</Button>
            ) : (
              <Alert variant="success">Salaire #{salaryId} créé. Enregistrez les versements ci-dessous.</Alert>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Étape 2 : Paiements pour nouveau salaire */}
      {salaryId && (
        <Card>
          <Card.Body className="space-y-4">
            <div className="flex items-center justify-between">
              <H3>Versements pour le salaire #{salaryId}</H3>
              <Badge variant={isFullyPaid ? 'success' : 'warning'}>
                {euro(totalPaid)} / {euro(form.amount)}
              </Badge>
            </div>

            {payments.length > 0 && (
              <ul className="divide-y divide-neutral-100 text-sm">
                {payments.map((p, i) => (
                  <li key={i} className="flex justify-between py-2">
                    <span>{p.date}</span>
                    <span className="font-medium">{euro(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}

            {!isFullyPaid && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <FormGroup label="Date du versement">
                  <Input type="date" value={newPay.date} onChange={e => setNewPay({...newPay, date: e.target.value})} />
                </FormGroup>
                <FormGroup label="Montant (€)">
                  <Input type="number" step="0.01" value={newPay.amount} onChange={e => setNewPay({...newPay, amount: e.target.value})} />
                </FormGroup>
                <Button onClick={handleAddPayment} disabled={saving}>
                  {saving ? <Spinner size="sm" /> : 'Enregistrer le versement'}
                </Button>
              </div>
            )}

            {isFullyPaid && <Alert variant="success">Salaire entièrement payé.</Alert>}

            <div className="flex justify-end">
              <Button onClick={() => navigate('/salaires')}>Terminer</Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Section versements pour salaire existant impayé */}
      {!salaryId && unpaidSalaries.length > 0 && (
        <Card>
          <Card.Body className="space-y-4">
            <H3>Enregistrer un versement sur un salaire impayé existant</H3>
            <FormGroup label="Sélectionner le salaire impayé">
              <Select value={selectedSalId} onChange={e => handleSelectUnpaid(e.target.value)}>
                <option value="">Sélectionner...</option>
                {unpaidSalaries.map(sal => {
                  const u = users.find(usr => String(usr.id) === String(sal.fk_user));
                  const name = u ? `${u.lastname} ${u.firstname}` : `#${sal.fk_user}`;
                  return (
                    <option key={sal.id} value={sal.id}>
                      #{sal.id} — {name} — Brut: {euro(sal.amount)} (Reste: {euro(sal.reste)})
                    </option>
                  );
                })}
              </Select>
            </FormGroup>

            {selectedSal && (
              <div className="p-4 bg-neutral-50 rounded-lg space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Montant brut : <strong>{euro(selectedSal.amount)}</strong></span>
                  <span>Déjà payé : <strong>{euro(selectedSal.totalPaid)}</strong></span>
                  <span className="text-red-600 font-bold">Reste à payer : {euro(selectedSal.reste)}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <FormGroup label="Date du versement">
                    <Input type="date" value={newPay.date} onChange={e => setNewPay({...newPay, date: e.target.value})} />
                  </FormGroup>
                  <FormGroup label="Montant (€)">
                    <Input type="number" step="0.01" max={selectedSal.reste} value={newPay.amount} onChange={e => setNewPay({...newPay, amount: e.target.value})} />
                  </FormGroup>
                  <Button onClick={handlePayUnpaid} disabled={saving}>
                    {saving ? <Spinner size="sm" /> : 'Enregistrer le versement'}
                  </Button>
                </div>
              </div>
            )}
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
