import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UtilisateurService } from '../../services/utilisateur.service';
import '../admin-voyages/AdminVoyages.css';

export const AdminUtilisateurFormComponent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formUtilisateur, setFormUtilisateur] = useState({ role: 'ROLE_USER' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    UtilisateurService.getUn(Number(id)).then(data => {
      setFormUtilisateur({ role: data.role || 'ROLE_USER' });
      setIsLoading(false);
    }).catch(() => {
      alert("Erreur lors de la récupération de l'utilisateur.");
      navigate(-1);
    });
  }, [id, navigate]);

  const sauvegarder = () => {
    UtilisateurService.modifier(Number(id), formUtilisateur).then(() => {
      alert("✅ Utilisateur modifié avec succès.");
      navigate(-1);
    }).catch(() => alert("Erreur lors de la modification."));
  };

  const retour = () => navigate(-1);

  // 👉 CORRECTION : Structure HTML strictement identique à l'Angular pour appliquer le CSS
  return (
    <div className="crud-section">
      <div className="section-header" style={{ justifyContent: 'flex-start', gap: '20px' }}>
        <button className="btn-action" style={{ padding: '10px', borderRadius: '5px', fontWeight: 'bold' }} onClick={retour}>⬅ Retour</button>
        <h3>Modification Utilisateur #{id}</h3>
      </div>

      {isLoading ? (
        <p>Chargement des données de l'utilisateur...</p>
      ) : (
        <div style={{ maxWidth: '500px', background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          
          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Rôle d'accès :</label>
            <select 
              value={formUtilisateur.role} 
              onChange={e => setFormUtilisateur({ role: e.target.value })} 
              style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            >
              <option value="ROLE_USER">Utilisateur Simple (ROLE_USER)</option>
              <option value="ROLE_ADMIN">Administrateur (ROLE_ADMIN)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn-action btn-delete" onClick={retour}>Annuler</button>
            <button className="btn-add" onClick={sauvegarder}>💾 Sauvegarder</button>
          </div>

        </div>
      )}
    </div>
  );
};