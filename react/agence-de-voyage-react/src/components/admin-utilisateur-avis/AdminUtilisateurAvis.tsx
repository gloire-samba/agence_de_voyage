import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AvisService } from '../../services/avis.service';
import '../admin-voyages/AdminVoyages.css';

export const AdminUtilisateurAvisComponent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [avisList, setAvisList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) chargerAvis(Number(id));
  }, [id]);

  const chargerAvis = (uid: number) => {
    setIsLoading(true);
    AvisService.getTous().then((data: any) => {
      const tousLesAvis = Array.isArray(data?.results || data?.content || data?._embedded?.avis || data) 
        ? (data?.results || data?.content || data?._embedded?.avis || data) : [];
      setAvisList(tousLesAvis.filter((a: any) => Number(a.utilisateur?.id || a.utilisateur_id || a.utilisateur) === uid));
      setIsLoading(false);
    }).catch(() => { setAvisList([]); setIsLoading(false); });
  };

  const supprimerAvis = (idAvis: number) => {
    if (window.confirm("Supprimer définitivement cet avis pour non-respect des règles ?")) {
      AvisService.supprimer(idAvis).then(() => {
        // 👉 CORRECTION : Popup ajouté
        alert('✅ Avis censuré.');
        chargerAvis(Number(id));
      }).catch(() => alert('Erreur'));
    }
  };

  return (
    <div className="crud-section">
      <div className="section-header" style={{ justifyContent: 'flex-start', gap: '20px' }}>
        <button className="btn-action" style={{ padding: '10px', borderRadius: '5px', fontWeight: 'bold' }} onClick={() => navigate(-1)}>⬅ Retour</button>
        <h3>Modération des Avis - Utilisateur #{id}</h3>
      </div>
      {isLoading ? <p>Chargement des avis...</p> : (
        <table className="admin-table">
          <thead><tr><th>ID Avis</th><th>ID Voyage</th><th>Note</th><th>Commentaire</th><th>Action</th></tr></thead>
          <tbody>
            {avisList.map(a => (
              <tr key={a.id}>
                <td><strong>#{a.id}</strong></td>
                <td>Voyage #{a.voyage?.id || a.voyage_id || a.voyage}</td>
                <td><strong>{a.note} / 5 ⭐</strong></td>
                <td style={{ maxWidth: '400px', fontStyle: 'italic' }}>"{a.commentaire || 'Avis note seule'}"</td>
                <td className="action-cells"><button className="btn-action btn-delete" onClick={() => supprimerAvis(a.id)}>🗑️ Censurer</button></td>
              </tr>
            ))}
            {avisList.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '25px' }}>Aucun avis pour cet utilisateur.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};