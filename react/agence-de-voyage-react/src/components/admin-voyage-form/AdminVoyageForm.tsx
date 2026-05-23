import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VoyageService } from '../../services/voyage.service';
import { ServeurService } from '../../services/serveur.service';
import './AdminVoyageForm.css';

export const AdminVoyageFormComponent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [voyageId, setVoyageId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [erreurFormulaire, setErreurFormulaire] = useState('');

  const [formVoyage, setFormVoyage] = useState({
    villeDepart: '',
    villeArrivee: '',
    prixTotal: 0,
    nombrePlacesTotal: 0,
    statut: 'A_VENIR',
    segments: [] as any[]
  });

  useEffect(() => {
    if (id) {
      setVoyageId(Number(id));
      chargerVoyage(Number(id));
    } else {
      setVoyageId(null);
      setIsLoading(false);
      verifierFormulaire({
        villeDepart: '', villeArrivee: '', prixTotal: 0, nombrePlacesTotal: 0, statut: 'A_VENIR', segments: []
      });
    }
  }, [id]);

  const chargerVoyage = (vId: number) => {
    VoyageService.getTousLesVoyages()
      .then((data: any) => {
        const donneesBrutes = data?.results || data?.content || data?._embedded?.voyages || data;
        const liste = Array.isArray(donneesBrutes) ? donneesBrutes : [];
        const trouve = liste.find((v: any) => v.id === vId);

        if (trouve) {
          // On normalise les données pour le formulaire interne React
          const segmentsNormalises = (trouve.segments ? [...trouve.segments] : []).map((s: any) => ({
            villeDepart: s.villeDepart || s.ville_depart || '',
            villeArrivee: s.villeArrivee || s.ville_arrivee || '',
            heureDepart: s.heureDepart || s.heure_depart || '',
            heureArrivee: s.heureArrivee || s.heure_arrivee || ''
          }));

          setFormVoyage({
            villeDepart: trouve.villeDepart || trouve.ville_depart || '',
            villeArrivee: trouve.villeArrivee || trouve.ville_arrivee || '',
            prixTotal: trouve.prixTotal || trouve.prix_total || 0,
            nombrePlacesTotal: trouve.nombrePlacesTotal || trouve.nombre_places_total || 0,
            statut: trouve.statut || 'A_VENIR',
            segments: segmentsNormalises
          });
          setIsLoading(false);
        } else {
          alert("Voyage introuvable.");
          navigate('/admin/voyages');
        }
      })
      .catch(() => {
        alert("Erreur serveur.");
        navigate('/admin/voyages');
      });
  };

  // --- GESTION DES CHANGEMENTS DE CHAMPS ---
  const handleFieldChange = (field: string, value: any) => {
    const updated = { ...formVoyage, [field]: value };
    setFormVoyage(updated);
    verifierFormulaire(updated);
  };

  const handleSegmentChange = (index: number, field: string, value: string) => {
    const newSegments = [...formVoyage.segments];
    newSegments[index] = { ...newSegments[index], [field]: value };
    const updated = { ...formVoyage, segments: newSegments };
    setFormVoyage(updated);
    verifierFormulaire(updated);
  };

  const ajouterSegment = () => {
    const newSegments = [...formVoyage.segments, { villeDepart: '', villeArrivee: '', heureDepart: '', heureArrivee: '' }];
    const updated = { ...formVoyage, segments: newSegments };
    setFormVoyage(updated);
    verifierFormulaire(updated);
  };

  const supprimerSegment = (index: number) => {
    const newSegments = formVoyage.segments.filter((_, i) => i !== index);
    const updated = { ...formVoyage, segments: newSegments };
    setFormVoyage(updated);
    verifierFormulaire(updated);
  };

  // --- LOGIQUE MÉTIER DE VALIDATION ---
  const verifierFormulaire = (state: typeof formVoyage) => {
    let err = '';

    if (!state.villeDepart || !state.villeArrivee) {
      err = "Les villes de départ et d'arrivée globales sont obligatoires.";
    } else if (state.prixTotal <= 0) {
      err = "Le prix total doit être supérieur à 0.";
    } else if (state.nombrePlacesTotal <= 0) {
      err = "Le nombre de places doit être supérieur à 0.";
    } else if (state.segments.length === 0) {
      err = "Vous devez ajouter au moins un segment de vol.";
    } else {
      for (let i = 0; i < state.segments.length; i++) {
        const s = state.segments[i];
        if (!s.villeDepart || !s.villeArrivee || !s.heureDepart || !s.heureArrivee) {
          err = `Le segment ${i + 1} est incomplet.`;
          break;
        }
        if (new Date(s.heureArrivee) <= new Date(s.heureDepart)) {
          err = `Segment ${i + 1} : L'arrivée doit être après le départ.`;
          break;
        }
        if (i > 0) {
          const prev = state.segments[i - 1];
          if (new Date(s.heureDepart) < new Date(prev.heureArrivee)) {
            err = `Erreur chronologique : Le segment ${i + 1} part avant l'arrivée du segment ${i}.`;
            break;
          }
        }
      }
    }
    setErreurFormulaire(err);
  };

  const sauvegarder = () => {
    if (erreurFormulaire) return;
    const backend = ServeurService.getBackend();
    
    // On convertit les clés selon le backend actif (CamelCase vs SnakeCase)
    const segmentsFormates = formVoyage.segments.map((s: any, index: number) => {
      return backend === 'spring' ? {
        ordre: index + 1, villeDepart: s.villeDepart, villeArrivee: s.villeArrivee, heureDepart: s.heureDepart, heureArrivee: s.heureArrivee
      } : {
        ordre: index + 1, ville_depart: s.villeDepart, ville_arrivee: s.villeArrivee, heure_depart: s.heureDepart, heure_arrivee: s.heureArrivee
      };
    });

    const payload = backend === 'spring' ? {
      villeDepart: formVoyage.villeDepart, villeArrivee: formVoyage.villeArrivee,
      prixTotal: Number(formVoyage.prixTotal), nombrePlacesTotal: Number(formVoyage.nombrePlacesTotal),
      statut: formVoyage.statut, segments: segmentsFormates
    } : {
      ville_depart: formVoyage.villeDepart, ville_arrivee: formVoyage.villeArrivee,
      prix_total: Number(formVoyage.prixTotal), nombre_places_total: Number(formVoyage.nombrePlacesTotal),
      statut: formVoyage.statut, segments: segmentsFormates
    };

    const requete = voyageId 
      ? VoyageService.modifierVoyage(voyageId, payload) 
      : VoyageService.creerVoyage(payload);

    requete
      .then(() => {
        alert("✅ Voyage enregistré avec succès !");
        navigate('/admin/voyages');
      })
      .catch(() => alert("❌ Erreur lors de l'enregistrement."));
  };

  const annuler = () => navigate('/admin/voyages');

  return (
    <div className="form-page-container">
      <div className="header-action">
        <h2>{voyageId ? 'Modifier le Voyage' : 'Nouveau Voyage'}</h2>
        <button className="btn-back" onClick={annuler}><span>⬅</span> Retour à la liste</button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p>⏳ Chargement des données techniques...</p>
        </div>
      ) : (
        <div className="card-form">
          <div className="form-row">
            <div className="form-group">
              <label>Ville de Départ</label>
              <input type="text" value={formVoyage.villeDepart} onChange={e => handleFieldChange('villeDepart', e.target.value)} placeholder="Ex: Paris" />
            </div>
            <div className="form-group">
              <label>Ville d'Arrivée</label>
              <input type="text" value={formVoyage.villeArrivee} onChange={e => handleFieldChange('villeArrivee', e.target.value)} placeholder="Ex: New York" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Prix Total (€)</label>
              <input type="number" value={formVoyage.prixTotal} onChange={e => handleFieldChange('prixTotal', e.target.value)} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>Nombre de Places</label>
              <input type="number" value={formVoyage.nombrePlacesTotal} onChange={e => handleFieldChange('nombrePlacesTotal', e.target.value)} placeholder="Capacité de l'avion" />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '35px' }}>
            <label>Statut du Voyage</label>
            <select value={formVoyage.statut} onChange={e => handleFieldChange('statut', e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', maxWidth: '300px' }}>
              <option value="A_VENIR">À Venir (Réservations ouvertes)</option>
              <option value="EN_COURS">En Cours (Vol en cours)</option>
              <option value="TERMINE">Terminé (Vol fini)</option>
              <option value="ANNULE">Annulé (Verrouillé)</option>
            </select>
          </div>

          <div className="segments-section">
            <div className="segments-header">
              <h3>Itinéraire & Vols (Segments)</h3>
              <button className="btn-add-segment" onClick={ajouterSegment}>+ Ajouter une escale/vol</button>
            </div>

            <div className="segments-container">
              {formVoyage.segments.length === 0 && (
                <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Aucun segment défini. Cliquez sur + Ajouter pour commencer.</p>
              )}

              {formVoyage.segments.map((seg, index) => (
                <div className="segment-card" key={index}>
                  <div className="segment-card-header">
                    <span className="segment-number">Vol {index + 1}</span>
                    <button className="btn-delete-segment" onClick={() => supprimerSegment(index)}>🗑️ Supprimer</button>
                  </div>

                  <div className="form-row" style={{ marginBottom: '15px' }}>
                    <div className="form-group">
                      <label>Ville Départ</label>
                      <input type="text" value={seg.villeDepart} onChange={e => handleSegmentChange(index, 'villeDepart', e.target.value)} placeholder="Départ" />
                    </div>
                    <div className="form-group">
                      <label>Date & Heure Départ</label>
                      <input type="datetime-local" value={seg.heureDepart} onChange={e => handleSegmentChange(index, 'heureDepart', e.target.value)} />
                    </div>
                  </div>

                  <div className="form-row" style={{ marginBottom: '0' }}>
                    <div className="form-group">
                      <label>Ville Arrivée</label>
                      <input type="text" value={seg.villeArrivee} onChange={e => handleSegmentChange(index, 'villeArrivee', e.target.value)} placeholder="Arrivée" />
                    </div>
                    <div className="form-group">
                      <label>Date & Heure Arrivée</label>
                      <input type="datetime-local" value={seg.heureArrivee} onChange={e => handleSegmentChange(index, 'heureArrivee', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {erreurFormulaire && (
            <div className="alert-box error"><span>⚠️</span> {erreurFormulaire}</div>
          )}

          <div className="form-actions">
            <button className="btn-cancel" onClick={annuler}>Annuler</button>
            <button className="btn-save" disabled={erreurFormulaire !== ''} onClick={sauvegarder}>
              {voyageId ? '💾 Enregistrer les modifications' : '🚀 Créer le voyage'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};