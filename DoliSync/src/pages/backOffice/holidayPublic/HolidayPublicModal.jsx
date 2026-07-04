import HolidayPublicForm from './HolidayPublicForm';
import { HolidaysPublicService } from '../../../services/holidayPublicService';
import { useState } from 'react';
import { Modal, Button } from '../../../components/templates';

const initialFormData = {
  dateHoliday: '',
  label: '',
  fkUser: '',
  typePeriode: 'JOURNEE_ENTIERE'
};

export default function HolidaysPublicModal({ holiday, users, onClose, onSaved }) {
  const [formData, setFormData] = useState({
    ...initialFormData,
    ...(holiday || {})
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'dateHoliday' && (!prev.dateFin || prev.dateFin === prev.dateHoliday)) {
        next.dateFin = value;
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const payload = {
        dateHoliday: formData.dateHoliday || null,
        label: formData.label || '',
        fkUser: formData.fkUser ? parseInt(formData.fkUser) : null,
        typePeriode: formData.typePeriode || 'JOURNEE_ENTIERE'
      };

      if (holiday && holiday.id) {
        await HolidaysPublicService.update(holiday.id, payload);
      } else {
        await HolidaysPublicService.create(payload);
      }
      
      onSaved();
      onClose();
    } catch (err) {
      alert("Erreur : " + err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title={holiday ? `Modifier le jour férié #${holiday.id}` : 'Créer un jour férié'}
      open={true}
      onClose={onClose}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit}>
        <Modal.Body className="max-h-[70vh] overflow-y-auto">
          <HolidayPublicForm formData={formData} onChange={handleChange} users={users} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}