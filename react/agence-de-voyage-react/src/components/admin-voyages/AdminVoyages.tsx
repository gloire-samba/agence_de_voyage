import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { VoyageService } from '../../services/voyage.service';
import './AdminVoyages.css';

export const AdminVoyagesComponent = () => {
  const navigate = useNavigate();
  const [voyages, setVoyages] = useState<any[]>([]);
  
  // Outils de filtrage
  const [texteRecherche, setTexteRecherche] = useState('');
  const [filtreDepart, setFiltreDepart] = useState('');
  const [filtreArrivee, setFiltreArrivee] = useState('');
  const [filtreDate, setFiltreDate] = useState('');
  const [filtreDureeMax, setFiltreDureeMax] = useState<number | ''>('');
  const [filtreEscales, setFiltreEscales] = useState<number | ''>('');
  const [filtreNoteMin, setFiltreNoteMin] = useState<number | ''>('');
  const [filtreDureeExacte, setFiltreDureeExacte] = useState<number | ''>('');
  const [filtreStatut, setFiltreStatut] = useState('');

  const [critereTri, setCritereTri] = useState('id');
  const [triAscendant, setTriAscendant] = useState(true);

  useEffect(() => {
    chargerVoyages();
  }, []);

  const chargerVoyages = () => {
    VoyageService.getTousLesVoyages()
      .then((data: any) => {
        const donneesBrutes = data?.results || data?.content || data?._embedded?.voyages || data;
        setVoyages(Array.isArray(donneesBrutes) ? donneesBrutes : []);
      })
      .catch((err) => {
        if (err.status === 404 || err.status === 204) setVoyages([]);
        else alert('Erreur lors du chargement des voyages.');
      });
  };

  const supprimerOuAnnulerVoyage = (voyage: any) => {
    if (window.confirm("Attention : Cette action annulera le voyage et remboursera tous les passagers. Êtes-vous sûr ?")) {
      // 👉 CORRECTION : On ne supprime pas (DELETE), on change le statut (PUT) comme dans Angular
      const voyageAnnule = { ...voyage, statut: 'ANNULE' };
      
      VoyageService.modifierVoyage(voyage.id, voyageAnnule)
        .then(() => {
          // 👉 CORRECTION : Popup de succès ajouté
          alert("✅ Voyage annulé avec succès. Les clients ont été notifiés.");
          chargerVoyages();
        })
        .catch(() => alert("❌ Erreur lors de l'annulation."));
    }
  };

  const allerVersFormulaire = (id?: number) => {
    if (id) navigate(`/admin/voyages/${id}`);
    else navigate('/admin/voyages/nouveau');
  };

  const voirAvisVoyage = (id: number) => {
    navigate(`/admin/voyages/${id}/avis`);
  };

  const getDureeMinutes = (v: any): number => {
    if (!v.segments || v.segments.length === 0) return 0;
    const datesDep = v.segments.map((s: any) => new Date(s.heureDepart || s.heure_depart).getTime());
    const datesArr = v.segments.map((s: any) => new Date(s.heureArrivee || s.heure_arrivee).getTime());
    return Math.floor((Math.max(...datesArr) - Math.min(...datesDep)) / 60000);
  };

  const getDureeFormattee = (v: any): string => {
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

  const changerTri = (critere: string) => {
    if (critereTri === critere) {
      setTriAscendant(!triAscendant);
    } else {
      setCritereTri(critere);
      setTriAscendant(true);
    }
  };

  const getVoyagesFiltres = () => {
    let resultats = voyages.filter(v => {
      const dep = (v.villeDepart || v.ville_depart || '').toLowerCase();
      const arr = (v.villeArrivee || v.ville_arrivee || '').toLowerCase();
      const rechercheGlobale = texteRecherche.toLowerCase();

      // 👉 CORRECTION : Ajout de la recherche stricte par ID (v.id.toString() === rechercheGlobale)
      const matchGlobal = !texteRecherche || dep.includes(rechercheGlobale) || arr.includes(rechercheGlobale) || v.id.toString() === rechercheGlobale;
      
      const matchDepart = !filtreDepart || dep.includes(filtreDepart.toLowerCase());
      const matchArrivee = !filtreArrivee || arr.includes(filtreArrivee.toLowerCase());
      
      let matchDate = true;
      if (filtreDate && v.segments && v.segments.length > 0) {
        const dateDep = v.segments[0].heureDepart || v.segments[0].heure_depart || '';
        matchDate = dateDep.startsWith(filtreDate);
      } else if (filtreDate) {
        matchDate = false;
      }

      let matchDureeMax = true;
      if (filtreDureeMax !== '') {
        const heuresTotales = Math.floor(getDureeMinutes(v) / 60);
        matchDureeMax = heuresTotales <= Number(filtreDureeMax);
      }

      let matchEscales = true;
      if (filtreEscales !== '') {
        const nbEscales = v.segments ? v.segments.length - 1 : 0;
        matchEscales = nbEscales === Number(filtreEscales);
      }

      let matchNote = true;
      if (filtreNoteMin !== '') {
        const note = parseFloat(v.noteMoyenne || v.note_moyenne || '0');
        matchNote = note >= Number(filtreNoteMin);
      }

      let matchDureeExacte = true;
      if (filtreDureeExacte !== '') {
        const heuresTotales = Math.floor(getDureeMinutes(v) / 60);
        matchDureeExacte = heuresTotales === Number(filtreDureeExacte);
      }

      let matchStatutFiltre = true;
      if (filtreStatut !== '') {
        const statutDuVoyage = (v.statut || 'A_VENIR').toUpperCase();
        matchStatutFiltre = statutDuVoyage === filtreStatut;
      }

      return matchGlobal && matchDepart && matchArrivee && matchDate && matchDureeMax && matchEscales && matchNote && matchDureeExacte && matchStatutFiltre;
    });

    resultats.sort((a, b) => {
      let valA: any, valB: any;
      if (critereTri === 'duree') {
        valA = getDureeMinutes(a);
        valB = getDureeMinutes(b);
      } else {
        valA = a[critereTri] || a['villeDepart'] || '';
        valB = b[critereTri] || b['villeDepart'] || '';
      }

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      
      if (valA < valB) return triAscendant ? -1 : 1;
      if (valA > valB) return triAscendant ? 1 : -1;
      return 0;
    });

    return resultats;
  };

  const voyagesFiltres = getVoyagesFiltres();

  return (
    <div className="crud-section">
      <div className="section-header">
        <h3>Catalogue des Voyages</h3>
        <button className="btn-add" onClick={() => allerVersFormulaire()}>+ Nouveau Voyage</button>
      </div>

      <div className="filter-row">
        <div className="filter-group">
          <label>Ville de Départ</label>
          <input type="text" value={filtreDepart} onChange={e => setFiltreDepart(e.target.value)} placeholder="Ex: Paris..." />
        </div>
        <div className="filter-group">
          <label>Ville d'Arrivée</label>
          <input type="text" value={filtreArrivee} onChange={e => setFiltreArrivee(e.target.value)} placeholder="Ex: Lyon..." />
        </div>
        <div className="filter-group">
          <label>Date du départ</label>
          <input type="date" value={filtreDate} onChange={e => setFiltreDate(e.target.value)} />
        </div>
        
        <div className="filter-group">
          <label>Statut</label>
          <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}>
            <option value="">Tous</option>
            <option value="A_VENIR">À venir</option>
            <option value="EN_COURS">En cours</option>
            <option value="TERMINE">Terminé</option>
            <option value="ANNULE">Annulé</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Durée Max (h)</label>
          <input type="number" value={filtreDureeMax} onChange={e => setFiltreDureeMax(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ex: 12" />
        </div>
        
        <div className="filter-group">
          <label>Nb Escales Exact</label>
          <input type="number" value={filtreEscales} onChange={e => setFiltreEscales(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ex: 0 pour Direct" />
        </div>

        <div className="filter-group">
          <label>Note Minimum</label>
          <input type="number" step="0.5" value={filtreNoteMin} onChange={e => setFiltreNoteMin(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ex: 4.5" />
        </div>
        
        <div className="filter-group">
          <label>Recherche Rapide</label>
          <input type="text" value={texteRecherche} onChange={e => setTexteRecherche(e.target.value)} placeholder="Mots clés ou ID..." />
        </div>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th onClick={() => changerTri('id')} style={{ cursor: 'pointer' }} title="Trier par ID">ID ↕️</th>
            <th onClick={() => changerTri('villeDepart')} style={{ cursor: 'pointer' }} title="Trier par Trajet">Trajet ↕️</th>
            <th onClick={() => changerTri('duree')} style={{ cursor: 'pointer' }} title="Trier par durée">Durée ↕️</th>
            <th onClick={() => changerTri('prixTotal')} style={{ cursor: 'pointer' }} title="Trier par prix">Prix ↕️</th>
            <th onClick={() => changerTri('statut')} style={{ cursor: 'pointer' }} title="Trier par statut">Statut ↕️</th>
            <th>Actions Administrateur</th>
          </tr>
        </thead>
        <tbody>
          {voyagesFiltres.map((v) => (
            <tr key={v.id}>
              <td><strong>#{v.id}</strong></td>
              <td>{v.villeDepart || v.ville_depart} ➔ {v.villeArrivee || v.ville_arrivee}</td>
              <td><strong>{getDureeFormattee(v)}</strong></td>
              <td>{v.prixTotal || v.prix_total} €</td>
              <td>
                <span className={`badge-statut ${(v.statut || 'A_VENIR').toUpperCase()}`}>
                  {v.statut || 'A_VENIR'}
                </span>
              </td>
              <td className="action-cells">
                <button className="btn-action btn-edit" onClick={() => allerVersFormulaire(v.id)}>✏️ Modifier</button>
                <button className="btn-action btn-view" onClick={() => voirAvisVoyage(v.id)}>⭐ Avis</button>
                
                {v.statut !== 'TERMINE' && v.statut !== 'ANNULE' && (
                  <button className="btn-action btn-delete" onClick={() => supprimerOuAnnulerVoyage(v)}>🚫 Annuler / Suppr.</button>
                )}
              </td>
            </tr>
          ))}
          
          {voyagesFiltres.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                Aucun voyage ne correspond à vos critères de recherche.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};