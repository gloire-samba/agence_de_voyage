import React, { useState, useEffect } from 'react';

import './Catalogue.css';
import type { Voyage } from '../../models/voyage';


interface CatalogueProps {
  voyages: Voyage[];
  onReserver: (event: { voyage: Voyage, nbPlaces: number }) => void;
}

export const CatalogueComponent: React.FC<CatalogueProps> = ({ voyages: initialVoyages, onReserver }) => {
  const [voyages, setVoyages] = useState<Voyage[]>([...initialVoyages]);
  const [placesSelectionnees, setPlacesSelectionnees] = useState<{ [voyageId: number]: number }>({});
  const [critereTri, setCritereTri] = useState<string>('');
  
  const [modalActive, setModalActive] = useState<'SEGMENTS' | 'AVIS' | null>(null);
  const [voyageSelectionne, setVoyageSelectionne] = useState<Voyage | null>(null);

  useEffect(() => {
    setVoyages([...initialVoyages]);
    const initPlaces: { [id: number]: number } = { ...placesSelectionnees };
    initialVoyages.forEach(v => {
      if (!initPlaces[v.id]) {
        initPlaces[v.id] = 1;
      }
    });
    setPlacesSelectionnees(initPlaces);
  }, [initialVoyages]);

  // Tri automatique lorsque le critère change
  useEffect(() => {
    if (!critereTri) {
      setVoyages([...initialVoyages]);
      return;
    }
    
    const sorted = [...initialVoyages].sort((a, b) => {
      let valA: any, valB: any;

      if (critereTri.startsWith('prix')) {
        valA = getPrix(a);
        valB = getPrix(b);
      } else if (critereTri.startsWith('date')) {
        valA = new Date(getDateDepartStr(a)).getTime();
        valB = new Date(getDateDepartStr(b)).getTime();
      } else if (critereTri.startsWith('escales')) {
        valA = getNbEscales(a);
        valB = getNbEscales(b);
      } else if (critereTri.startsWith('note')) {
        valA = parseFloat(getNoteMoyenne(a)) || 0;
        valB = parseFloat(getNoteMoyenne(b)) || 0;
      } else if (critereTri.startsWith('duree')) {
        valA = getDureeMinutes(a);
        valB = getDureeMinutes(b);
      }

      if (critereTri.endsWith('_desc')) return valB > valA ? 1 : valB < valA ? -1 : 0;
      else return valA > valB ? 1 : valA < valB ? -1 : 0;
    });
    setVoyages(sorted);
  }, [critereTri, initialVoyages]);

  const getPlacesDisponibles = (v: any): number => {
    const capacite = v.nombrePlacesTotal || v.nombre_places_total || 0;
    if (v.placesRestantes !== undefined && v.placesRestantes !== null) return v.placesRestantes;
    if (v.places_restantes !== undefined && v.places_restantes !== null) return v.places_restantes;
    return capacite;
  };

  const incrementerPlace = (v: Voyage) => {
    const max = getPlacesDisponibles(v);
    setPlacesSelectionnees(prev => {
      const actuel = prev[v.id] || 1;
      return { ...prev, [v.id]: actuel < max ? actuel + 1 : actuel };
    });
  };

  const decrementerPlace = (v: Voyage) => {
    setPlacesSelectionnees(prev => {
      const actuel = prev[v.id] || 1;
      return { ...prev, [v.id]: actuel > 1 ? actuel - 1 : 1 };
    });
  };

  const handleReserver = (voyage: Voyage) => {
    const nbPlaces = placesSelectionnees[voyage.id] || 1;
    onReserver({ voyage, nbPlaces });
  };

  const ouvrirModal = (type: 'SEGMENTS' | 'AVIS', voyage: Voyage) => { 
    setVoyageSelectionne(voyage); 
    setModalActive(type); 
  };
  
  const fermerModal = () => { 
    setModalActive(null); 
    setVoyageSelectionne(null); 
  };

  const getVilleDepart = (v: any): string => v.villeDepart || v.ville_depart || 'Inconnu';
  const getVilleArrivee = (v: any): string => v.villeArrivee || v.ville_arrivee || 'Inconnu';
  const getPrix = (v: any): number => v.prixTotal || v.prix_total || 0;
  
  const getDateDepartStr = (v: any): string => {
    if (v.segments && v.segments.length > 0) return v.segments[0].heureDepart || v.segments[0].heure_depart || '';
    return '';
  };
  
  const getNbEscales = (v: Voyage): number => (v.segments && v.segments.length > 0) ? v.segments.length - 1 : 0;
  
  const getNoteMoyenne = (v: any): string => {
    const note = v.noteMoyenne || v.note_moyenne;
    return note !== undefined && note !== null ? Number(note).toFixed(1) : 'N/A';
  };
  
  const getNombreAvis = (v: Voyage): number => v.avis && Array.isArray(v.avis) ? v.avis.length : 0;
  
  const getDureeMinutes = (v: any): number => {
    if (!v.segments || v.segments.length === 0) return 0;
    const datesDep = v.segments.map((s: any) => new Date(s.heureDepart || s.heure_depart).getTime());
    const datesArr = v.segments.map((s: any) => new Date(s.heureArrivee || s.heure_arrivee).getTime());
    const minDep = Math.min(...datesDep);
    const maxArr = Math.max(...datesArr);
    return Math.floor((maxArr - minDep) / (1000 * 60)); 
  };

  const getDureeFormattee = (v: Voyage): string => {
    const totalMinutes = getDureeMinutes(v);
    if (totalMinutes <= 0) return 'N/A';
    
    const jours = Math.floor(totalMinutes / 1440);
    const heures = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    
    let result = '';
    if (jours > 0) result += `${jours}j `;
    if (heures > 0 || jours > 0) result += `${heures}h `;
    result += `${minutes}m`;
    
    return result.trim();
  };

  // Helper pour le pipe Angular `date:'dd MMM yyyy à HH:mm'`
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' à');
  };

  // Helper pour le pipe Angular `date:'dd/MM/yyyy HH:mm'`
  const formatDateTimeShort = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
  };

  // Helper pour `date:'dd/MM/yyyy'`
  const formatDateOnly = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="catalogue-wrapper">
      {voyages.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🌍</div>
          <h3>Prêt à décoller ?</h3>
          <p>Faites une recherche textuelle ou vocale pour afficher les voyages disponibles.</p>
        </div>
      ) : (
        <>
          <div className="catalogue-header">
            <div className="resultats-compte">
              {voyages.length} voyage(s) trouvé(s)
            </div>
            <div className="tri-container">
              <label htmlFor="tri">Trier par :</label>
              <select id="tri" value={critereTri} onChange={(e) => setCritereTri(e.target.value)}>
                <option value="">-- Par défaut --</option>
                <option value="prix_asc">💰 Prix : Croissant</option>
                <option value="prix_desc">💰 Prix : Décroissant</option>
                <option value="date_asc">📅 Date : Du plus proche au plus lointain</option>
                <option value="date_desc">📅 Date : Du plus lointain au plus proche</option>
                <option value="duree_asc">⏳ Durée : Du plus court au plus long</option>
                <option value="duree_desc">⏳ Durée : Du plus long au plus court</option>
                <option value="escales_asc">✈️ Trajet : Du plus direct au plus long</option>
                <option value="escales_desc">✈️ Trajet : Du plus long au plus direct</option>
                <option value="note_desc">⭐ Note : Les mieux notés en premier</option>
                <option value="note_asc">⭐ Note : Les moins bien notés en premier</option>
              </select>
            </div>
          </div>

          <div className="voyages-grid">
            {voyages.map((v) => (
              <div className="voyage-card" key={v.id}>
                
                <div className="card-header">
                  <div className="trajet-villes">
                    <span className="ville">{getVilleDepart(v)}</span>
                    <span className="fleche">➔</span>
                    <span className="ville">{getVilleArrivee(v)}</span>
                  </div>
                  
                  <button className="btn-avis" onClick={() => ouvrirModal('AVIS', v)} title="Voir les avis">
                    ⭐ {getNoteMoyenne(v)} ({getNombreAvis(v)} avis)
                  </button>
                </div>

                <div className="card-body">
                  <div className="voyage-info">
                    <p className="info-item">
                      📅 Départ : <strong>{formatDateTime(getDateDepartStr(v))}</strong>
                    </p>
                    
                    <p className="info-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      ✈️ Trajet : 
                      {getNbEscales(v) === 0 ? (
                        <span className="badge-direct" onClick={() => ouvrirModal('SEGMENTS', v)}>Direct</span>
                      ) : (
                        <button className="badge-escales" onClick={() => ouvrirModal('SEGMENTS', v)}>{getNbEscales(v)} escale(s)</button>
                      )}
                    </p>
                    
                    <p className="info-item">
                      ⏱️ Durée : <strong>{getDureeFormattee(v)}</strong>
                    </p>
                  </div>

                  <div className="prix-block">
                    <span className="prix-label">À partir de </span>
                    <span className="prix-valeur">{getPrix(v) * (placesSelectionnees[v.id] || 1)} €</span>
                  </div>
                </div>

                <div className="card-footer">
                  <div className="places-infos">
                    {getPlacesDisponibles(v) <= 5 ? (
                      <span className="badge-place dernieres-places">🔥 Plus que {getPlacesDisponibles(v)} place(s) !</span>
                    ) : (
                      <span className="badge-place">🟢 {getPlacesDisponibles(v)} places dispo</span>
                    )}
                  </div>

                  <div className="reservation-actions">
                    <div className="compteur-places">
                      <button className="btn-compteur" 
                              onClick={() => decrementerPlace(v)} 
                              disabled={(placesSelectionnees[v.id] || 1) <= 1}>
                        -
                      </button>
                      
                      <span className="valeur-compteur">{placesSelectionnees[v.id] || 1}</span>
                      
                      <button className="btn-compteur" 
                              onClick={() => incrementerPlace(v)} 
                              disabled={(placesSelectionnees[v.id] || 1) >= getPlacesDisponibles(v)}>
                        +
                      </button>
                    </div>
                    
                    <button className="btn-reserver" onClick={() => handleReserver(v)}>
                      Réserver
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {modalActive && voyageSelectionne && (
            <div className="modal-overlay" onClick={fermerModal}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                
                <div className="modal-header">
                  <h3>{modalActive === 'SEGMENTS' ? "Détails de l'itinéraire" : "Avis des voyageurs"}</h3>
                  <button className="btn-close" onClick={fermerModal}>✖</button>
                </div>

                {modalActive === 'SEGMENTS' && (
                  <div className="segments-list">
                    {voyageSelectionne.segments.map((segment: any) => (
                      <div className="segment-item" key={segment.id}>
                        <div className="segment-icon">📍</div>
                        <div className="segment-details">
                          <strong>{segment.villeDepart || segment.ville_depart} ➔ {segment.villeArrivee || segment.ville_arrivee}</strong>
                          <div className="segment-dates">
                            Départ : {formatDateTimeShort(segment.heureDepart || segment.heure_depart)} <br/>
                            Arrivée : {formatDateTimeShort(segment.heureArrivee || segment.heure_arrivee)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {modalActive === 'AVIS' && (
                  <>
                    {getNombreAvis(voyageSelectionne) === 0 ? (
                      <div className="alert-info">Aucun avis n'a encore été laissé pour ce voyage.</div>
                    ) : (
                      <div className="avis-list">
                        {voyageSelectionne.avis.map((avis: any) => (
                          <div className="avis-card" key={avis.id}>
                            <div className="avis-header">
                              <span className="avis-auteur">{avis.utilisateur?.email || avis.email_auteur || 'Utilisateur anonyme'}</span>
                              <span className="avis-date">{formatDateOnly(avis.dateCreation || avis.date_creation)}</span>
                            </div>
                            <div className="avis-note">
                              {[1, 2, 3, 4, 5].map(star => (
                                <span key={star} style={{ color: star <= avis.note ? '#f59e0b' : '#e2e8f0' }}>★</span>
                              ))}
                            </div>
                            <div className="avis-commentaire">
                              {avis.commentaire || 'Aucun commentaire texte.'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};