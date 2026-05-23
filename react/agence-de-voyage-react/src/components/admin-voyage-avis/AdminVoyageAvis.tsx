import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AvisService } from '../../services/avis.service';
import '../admin-voyages/AdminVoyages.css';

export const AdminVoyageAvisComponent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [voyageId, setVoyageId] = useState<number | null>(null);
  const [avisList, setAvisList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setVoyageId(Number(id));
      chargerAvisVoyage(Number(id));
    }
  }, [id]);

  const chargerAvisVoyage = (vId: number) => {
    setIsLoading(true);
    AvisService.getTous()
      .then((data: any) => {
        const donneesBrutes = data?.results || data?.content || data?._embedded?.avis || data;
        const tousLesAvis = Array.isArray(donneesBrutes) ? donneesBrutes : [];
        setAvisList(tousLesAvis.filter((a: any) => (a.voyage?.id || a.voyage_id || a.voyage) === vId));
        setIsLoading(false);
      })
      .catch(() => {
        setAvisList([]);
        setIsLoading(false);
      });
  };

  const supprimerAvis = (idAvis: number) => {
    if (window.confirm("Censurer définitivement cet avis ? L'action est irréversible.")) {
      AvisService.supprimer(idAvis)
        .then(() => {
          // 👉 CORRECTION : Voici l'alerte explicite de confirmation !
          alert("✅ Avis supprimé avec succès.");
          chargerAvisVoyage(Number(id));
        })
        .catch(() => alert("Erreur lors de la suppression."));
    }
  };

  return (
    <div className="crud-section">
      <div className="section-header" style={{ justifyContent: 'flex-start', gap: '20px' }}>
        <button className="btn-action" style={{ padding: '10px', borderRadius: '5px', fontWeight: 'bold' }} onClick={() => navigate(-1)}>⬅ Retour</button>
        <h3>Modération des Avis - Voyage #{voyageId}</h3>
      </div>

      {isLoading ? (
        <p>Chargement des avis...</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID Avis</th>
              <th>Auteur (ID Utilisateur)</th>
              <th>Note</th>
              <th>Commentaire</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {avisList.map(a => (
              <tr key={a.id}>
                <td><strong>#{a.id}</strong></td>
                <td>Utilisateur #{a.utilisateur?.id || a.utilisateur_id || a.utilisateur || 'Inconnu'}</td>
                <td><strong>{a.note} / 5 ⭐</strong></td>
                <td style={{ maxWidth: '400px', fontStyle: 'italic' }}>"{a.commentaire}"</td>
                <td className="action-cells">
                  <button className="btn-action btn-delete" onClick={() => supprimerAvis(a.id)}>🗑️ Censurer</button>
                </td>
              </tr>
            ))}
            {avisList.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '25px' }}>
                  Aucun avis n'a encore été publié pour ce voyage.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};