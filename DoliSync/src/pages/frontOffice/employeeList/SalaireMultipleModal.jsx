import { useState } from 'react';
import { fetchDolData } from '../../../services/apiClient';
import { useNavigate } from 'react-router-dom';
import {
  H2, H3, Card, Alert,  Button, Spinner,
  FormGroup, Input, Modal
} from '../../../components/templates';

const EMPTY_FORM = {  amount: '', datesp: '', dateep: '' };

export default function SalaireMultipleModal({users,onClose,onSaved}){
    const navigate = useNavigate();
    const [salaryId,       setSalaryId]       = useState(null);
    const [saving,         setSaving]         = useState(false);
    const [error,          setError]          = useState('');
    const [form,           setForm]           = useState(EMPTY_FORM);
    
    const handleSubmit = async(e)=>{
        e.preventDefault();
        if(saving) return;
        setSaving(true);
        try{
           
            const result = await Promise.all(
                users.map((u)=>
                fetchDolData(`/salaries`,{
                method: 'POST',
                body: {
                fk_user: u.id,
                amount:  +form.amount,
                datesp:  form.datesp,
                dateep:  form.dateep,
                label:   `Salaire ${form.datesp} — ${form.dateep}`,
                paye: 0,
                }
                })
            )
        )
        const id = (result && typeof result === 'object') ? (result[0]?.id || result[0]?.rowid) : result;
        setSalaryId(parseInt(id));
        onSaved();
        }catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
    };

    return(
        <Modal
        onClose={onClose}
        open={true}
        >
       
       <div className="p-6 space-y-6">
             <div className="flex items-center justify-between">
               <H2>Gestion des salaires</H2>
               <Button variant="outline" onClick={() => navigate('/employee')}>Retour</Button>
             </div> 
        {error && <Alert variant="danger">{error}</Alert>}     
        {users.length > 0 && (
          <Card>
                   <Card.Body className="space-y-4">
                      <H3>Paiment salaire multiple</H3>
                      
                      <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-100 max-h-36 overflow-y-auto">
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-2">
                          Employés concernés ({users.length}) :
                        </span>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-neutral-700">
                          {users.map((u) => (
                            <li key={u.id} className="truncate flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
                              {u.firstname || ''} {u.lastname || ''}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       
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
                       <Button onClick={handleSubmit} disabled={saving}>{saving ? <Spinner size="sm" /> : 'Créer le salaire'}</Button>
                     ) : (
                       <Alert variant="success">Salaire #{salaryId} créé.</Alert>
                     )}
                   </Card.Body>
                 </Card>
               )}
                 
        </div>    
             
        </Modal> 
    );
}