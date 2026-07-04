import { useState, useEffect } from 'react';
import { fetchDolData } from '../../../services/apiClient';
import { useNavigate } from 'react-router-dom';
import {
  H2, H3, Card, Button, Modal, Table, Td, Tr, Th
} from '../../../components/templates';

const tsDate = (ts) => (ts && ts !== "") ? new Date(+ts * 1000).toLocaleDateString('fr-FR', { timeZone: 'Indian/Antananarivo' }) : '—';
const euro = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(+n || 0);

export default function SalaireMultipleModal({ user, onClose }) {
  const [salarieUser, setSalarieUser] = useState([]);
  const [payments, setPayments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      fetchDolData('/salaries?limit=1000'),
      fetchDolData('/salaries/payments?limit=1000'),
    ]).then(([s, p]) => {
      const salariesData = Array.isArray(s) ? s : [];
      const paymentsData = Array.isArray(p) ? p : [];

      const filtered = salariesData.filter(sal => sal.fk_user === user.id);
      setSalarieUser(filtered);
      console.log("Salaires récupérés:", filtered);

      const userSalaryIds = filtered.map(sal => sal.id);
      const filteredPayments = paymentsData.filter(pay => userSalaryIds.includes(pay.fk_salary));
      setPayments(filteredPayments);
      console.log("Paiements récupérés:", filteredPayments);
    });
  }, [user.id]);

  return (
    <Modal onClose={onClose} open={true}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <H2>Détail de l'employé</H2>
          <Button variant="outline" onClick={() => navigate('/employee')}>Retour</Button>
        </div>
        {!user && <p>Chargement...</p>}
        {user && (
          <Card>
            <Card.Body className="space-y-4">
              <H3>Information Personnelle</H3>
              <div><span>Nom: {user.firstname || "Sans Nom"}</span></div>
              <div><span>Prénom: {user.lastname || "Sans Prénom"}</span></div>
              <div><span>Heures de travail: {user.weeklyhours || "0"}h</span></div>
              <div><span>Poste: {user.job || "Aucun"}</span></div>
            </Card.Body>

            <H3>Historique des salaires</H3>
            <Table striped>
              <thead>
                <Tr>
                  <Th>Réf</Th>
                  <Th>Date début</Th>
                  <Th>Date Fin</Th>
                  <Th>Montant</Th>
                </Tr>
              </thead>
              <tbody>
                {salarieUser.length === 0 ? (
                  <Tr><Td colSpan={4} className="text-center text-neutral-400">Aucun résultat</Td></Tr>
                ) : salarieUser.map(sal => (
                  <Tr key={sal.id}>
                    <Td>#{sal.id}</Td>
                    <Td>{tsDate(sal.datesp)}</Td>
                    <Td>{tsDate(sal.dateep)}</Td>
                    <Td>{euro(sal.amount)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>

            <H3>Historique des paiements</H3>
            <Table striped>
              <thead>
                <Tr>
                  <Th>Lié au salaire</Th>
                  <Th>Date Paiement</Th>
                  <Th>Montant Payé</Th>
                  <Th>Reste à payer</Th>
                </Tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <Tr><Td colSpan={4} className="text-center text-neutral-400">Aucun résultat</Td></Tr>
                ) : payments.map(pay => {

                  const montantVerse = parseFloat(pay.amount || 0);

                  const salaireLie = salarieUser.find(s => s.id === pay.fk_salary);
                  const totalSalaire = parseFloat(salaireLie?.amount || 0);
                  const totalVerseSurCeSalaire = payments
                    .filter(pp => pp.fk_salary === pay.fk_salary)
                    .reduce((acc, pp) => acc + parseFloat(pp.amount || 0), 0);
                  const reste = Math.max(0, totalSalaire - totalVerseSurCeSalaire);

                  return (
                    <Tr key={pay.id}>
                      <Td>#{pay.fk_salary}</Td>
                      <Td>{tsDate(pay.datep)}</Td>
                      <Td>{euro(montantVerse)}</Td>
                      <Td>{euro(reste)}</Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </Card>
        )}
      </div>
    </Modal>
  );
}