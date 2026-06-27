import { useState } from 'react';
import { ProductService } from '../../services/produitService'; 
import { H2, Input, Select, Textarea, FormGroup, Divider } from '../../components/templates';

export default function CreateProductForm() {

  const [formData, setFormData] = useState({
    ref: '',
    label: '',
    status: 1 
  });

  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setIsLoading(true);
    setFeedbackMsg('');

    try {

      await ProductService.create(formData);
      
      setFeedbackMsg(' Produit créé avec succès dans Dolibarr !');

      setFormData({ ref: '', label: '', status: 1 });
      
    } catch (error) {
 
      setFeedbackMsg(` Échec : ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div >
      <H2>Créer un nouveau produit</H2>
      
      {feedbackMsg && <p><strong>{feedbackMsg}</strong></p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        <div>
          <label>Référence du produit :</label>
          <br />
          <input 
            type="text" 
            name="ref" 
            value={formData.ref} 
            onChange={handleChange} 
            required 
            placeholder="Ex: PROD-001"
          />
        </div>

        <div>
          <label>Nom (Label) :</label>
          <br />
          <input 
            type="text" 
            name="label" 
            value={formData.label} 
            onChange={handleChange} 
            required 
            placeholder="Ex: Ordinateur MSI"
          />
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Création en cours...' : 'Créer le produit'}
        </button>
        
      </form>
    </div>
  );
}