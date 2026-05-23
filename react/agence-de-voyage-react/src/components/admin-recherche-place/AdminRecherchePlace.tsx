import React, { useState, useEffect } from 'react';
import { VoyageService } from '../../services/voyage.service';
import { BilletService } from '../../services/billet.service';
import './AdminRecherchePlace.css';

export const AdminRecherchePlaceComponent = () => {
  const [voyages, setVoyages] = useState<any[]>([]);
  const [voyageIdSelectionne, setVoyageIdSelectionne] = useState('');
  const [siegeSaisi, setSiegeSaisi] = useState('');
  const [resultat, setResultat] = useState<any>(null);
  const [erreur, setErreur] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    VoyageService.getTousLesVoyages().then(setVoyages);
  }, []);

  const lancerRecherche = () => {
    setIsLoading(true);
    setErreur('');
    BilletService.trouverReservationParSiege(Number(voyageIdSelectionne), siegeSaisi.toUpperCase())
      .then(setResultat)
      .catch(() => setErreur("Passager introuvable."))
      .finally(() => setIsLoading(false));
  };

  return (
    <div className="admin-recherche-container">
      <h2>🕵️ Contrôle des Passagers</h2>
      <div className="search-box">
        <select value={voyageIdSelectionne} onChange={e => setVoyageIdSelectionne(e.target.value)}>
          <option value="">Choisir un vol</option>
          {voyages.map(v => <option key={v.id} value={v.id}>Vol #{v.id}</option>)}
        </select>
        <input value={siegeSaisi} onChange={e => setSiegeSaisi(e.target.value)} placeholder="12A" />
        <button onClick={lancerRecherche} disabled={isLoading}>🔍 Rechercher</button>
      </div>
      {erreur && <div className="alert-error">{erreur}</div>}
      {resultat && <div>Passager trouvé : {resultat.id}</div>}
    </div>
  );
};