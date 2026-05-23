import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReservationService } from '../../services/reservation.service';
import { VoyageService } from '../../services/voyage.service';
import { ServeurService } from '../../services/serveur.service';
import { AuthService } from '../../services/auth.service';
import '../admin-voyages/AdminVoyages.css';

export const AdminUtilisateurReservationsComponent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [reservationAEchanger, setReservationAEchanger] = useState<any>(null);
  const [voyagesDisponibles, setVoyagesDisponibles] = useState<any[]>([]);
  
  const [texteRecherche, setTexteRecherche] = useState('');
  const [filtreDepart, setFiltreDepart] = useState('');
  const [filtreArrivee, setFiltreArrivee] = useState('');
  const [filtreDate, setFiltreDate] = useState('');
  const [filtrePlaces, setFiltrePlaces] = useState<number | null>(null);

  useEffect(() => {
    chargerReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const chargerReservations = () => {
    setIsLoading(true);
    ReservationService.getHistoriqueUtilisateur(Number(id)).then((data: any) => {
      const resas = Array.isArray(data?.results || data?.content || data) ? (data?.results || data?.content || data) : [];
      setReservations(resas);
      setIsLoading(false);
    }).catch(() => { setReservations([]); setIsLoading(false); });
  };

  const annulerReservation = (idResa: number) => {
    if (window.confirm("Êtes-vous sûr de vouloir annuler cette réservation ? Le client sera remboursé.")) {
      ReservationService.annulerReservation(idResa)
        .then(() => {
          alert("✅ Réservation annulée.");
          chargerReservations();
        })
        .catch(() => alert("Erreur lors de l'annulation."));
    }
  };

  const preparerEchange = (reservation: any) => {
    setReservationAEchanger(reservation);
    VoyageService.getTousLesVoyages().then((data: any) => {
      const voyagesBruts = Array.isArray(data?.results || data?.content || data) ? (data?.results || data?.content || data) : [];
      setVoyagesDisponibles(voyagesBruts);
    });
  };

  const annulerEchange = () => {
    setReservationAEchanger(null);
    setFiltrePlaces(null);
  };

  const getNbPlacesAEchanger = (): number => {
    if (!reservationAEchanger) return 0;
    return reservationAEchanger.billets ? reservationAEchanger.billets.length : (reservationAEchanger.nbPlacesDemandees || 1);
  };

  // 👉 CORRECTION : Méthode POST stricte, exactement comme dans Angular !
  const validerEchange = async (nouveauVoyageId: number) => {
    if (!reservationAEchanger) return;
    if (window.confirm("Confirmer le transfert de ce client vers ce nouveau vol ?")) {
      const baseUrl = AuthService.getBaseUrl();
      const isDjango = ServeurService.getBackend() === 'django';
      const url = `${baseUrl}/reservations/${reservationAEchanger.id}/echanger${isDjango ? '/' : ''}`;
      
      const payload = { nouveauVoyageId: Number(nouveauVoyageId) };

      try {
        const token = AuthService.getToken();
        const response = await fetch(url, {
          method: 'POST', // <-- Le POST qui manquait !
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw err;
        }

        alert("✅ Échange effectué avec succès ! Un nouveau billet a été généré.");
        setReservationAEchanger(null);
        setFiltrePlaces(null);
        chargerReservations();
      } catch (err: any) {
        const message = err?.erreur || err?.error || "Erreur serveur";
        alert("❌ Échec de l'échange : " + message);
      }
    }
  };

  const getVoyagesFiltres = () => {
    return voyagesDisponibles.filter(v => {
      const statut = (v.statut || v.statut || 'A_VENIR').toUpperCase();
      if (statut !== 'A_VENIR') return false;
      const places = (v.placesRestantes !== undefined) ? v.placesRestantes : v.places_restantes;
      if (places <= 0 || (filtrePlaces !== null && places < filtrePlaces)) return false;

      const depart = (v.villeDepart || v.ville_depart || '').toLowerCase();
      const arrivee = (v.villeArrivee || v.ville_arrivee || '').toLowerCase();
      const globale = texteRecherche.toLowerCase();

      const matchGlobal = !texteRecherche || depart.includes(globale) || arrivee.includes(globale) || v.id.toString() === globale;
      const matchDepart = !filtreDepart || depart.includes(filtreDepart.toLowerCase());
      const matchArrivee = !filtreArrivee || arrivee.includes(filtreArrivee.toLowerCase());
      
      let matchDate = true;
      if (filtreDate && v.segments && v.segments.length > 0) {
        matchDate = (v.segments[0].heureDepart || v.segments[0].heure_depart || '').startsWith(filtreDate);
      }
      return matchGlobal && matchDepart && matchArrivee && matchDate;
    });
  };

  const retour = () => {
    if (reservationAEchanger) annulerEchange();
    else navigate(-1);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="crud-section">
      <div className="section-header" style={{ justifyContent: 'flex-start', gap: '20px' }}>
        <button className="btn-action" style={{ padding: '10px', borderRadius: '5px', fontWeight: 'bold' }} onClick={retour}>⬅ Retour</button>
        <h3>Billetterie Client - Utilisateur #{id}</h3>
      </div>

      {isLoading ? <p>Chargement des billets...</p> : !reservationAEchanger ? (
        <table className="admin-table">
          <thead>
            <tr>
              <th>N° Résa</th>
              <th>Trajet actuel</th>
              <th>Date Résa</th>
              <th>Places</th>
              <th>Statut</th>
              <th>Actions Administrateur</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map(r => (
              <tr key={r.id} style={{ opacity: r.statut === 'ANNULE' ? '0.6' : '1' }}>
                <td><strong>#{r.id}</strong></td>
                <td>{r.voyage?.villeDepart || r.voyage?.ville_depart} ➔ {r.voyage?.villeArrivee || r.voyage?.ville_arrivee}</td>
                <td>{formatDate(r.dateReservation || r.date_confirmation || r.date_reservation)}</td>
                <td>
                  <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold' }}>
                    {r.billets ? r.billets.length : (r.nbPlacesDemandees || 1)}
                  </span>
                </td>
                <td><span className={`badge-statut ${r.statut}`}>{r.statut}</span></td>
                <td className="action-cells">
                  {r.statut === 'ANNULE' || r.statut === 'REMBOURSE' ? (
                    <span style={{ color: '#ef4444', fontWeight: 'bold', background: '#fee2e2', padding: '6px 10px', borderRadius: '6px', display: 'inline-block' }}>
                      🚫 Client déjà remboursé
                    </span>
                  ) : r.statut === 'CONFIRME' ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-action btn-view" onClick={() => preparerEchange(r)}>🔄 Échanger</button>
                      <button className="btn-action btn-delete" onClick={() => annulerReservation(r.id)}>💸 Annuler & Rembourser</button>
                    </div>
                  ) : (
                    <span style={{ color: '#64748b', fontStyle: 'italic' }}>En attente de paiement</span>
                  )}
                </td>
              </tr>
            ))}
            {reservations.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '25px', color: '#64748b' }}>Aucune réservation pour ce client.</td></tr>
            )}
          </tbody>
        </table>
      ) : (
        <div style={{ marginTop: '50px', padding: '30px', background: '#f8fafc', border: '2px dashed #3b82f6', borderRadius: '12px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: '#1e293b', margin: 0 }}>
              🔄 Reloger le billet #{reservationAEchanger.id}
            </h3>
            <button className="btn-action" style={{ color: '#ef4444' }} onClick={annulerEchange}>✖ Annuler l'échange</button>
          </div>

          <div style={{ backgroundColor: '#fef08a', color: '#854d0e', padding: '12px 15px', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold', border: '1px solid #fde047', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.2rem' }}>💡</span>
            <span>Le dossier de ce client contient <strong>{getNbPlacesAEchanger()} place(s)</strong>. Il est conseillé de filtrer les vols ayant au moins cette capacité.</span>
          </div>
          
          <div className="filter-row">
            <div className="filter-group"><label>Départ</label><input type="text" value={filtreDepart} onChange={e => setFiltreDepart(e.target.value)} /></div>
            <div className="filter-group"><label>Arrivée</label><input type="text" value={filtreArrivee} onChange={e => setFiltreArrivee(e.target.value)} /></div>
            <div className="filter-group"><label>Date précise</label><input type="date" value={filtreDate} onChange={e => setFiltreDate(e.target.value)} /></div>
            <div className="filter-group"><label>Places Minimum</label><input type="number" value={filtrePlaces || ''} onChange={e => setFiltrePlaces(e.target.value === '' ? null : Number(e.target.value))} placeholder={`Ex: ${getNbPlacesAEchanger()}`} /></div>
          </div>

          <table className="admin-table">
            <thead><tr><th>ID Vol</th><th>Itinéraire</th><th>Places restantes</th><th>Action</th></tr></thead>
            <tbody>
              {getVoyagesFiltres().map(v => (
                <tr key={v.id}>
                  <td>#{v.id}</td>
                  <td>{v.villeDepart || v.ville_depart} ➔ {v.villeArrivee || v.ville_arrivee}</td>
                  <td><strong>{v.placesRestantes !== undefined ? v.placesRestantes : v.places_restantes}</strong></td>
                  <td>
                    {(v.placesRestantes !== undefined ? v.placesRestantes : v.places_restantes) < getNbPlacesAEchanger() ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <span style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 'bold' }}>❌ Pas assez de places</span>
                        <button className="btn-action" style={{ background: '#e2e8f0', color: '#94a3b8', border: 'none', cursor: 'not-allowed' }} disabled>Transfert impossible</button>
                      </div>
                    ) : (
                      <button className="btn-action" style={{ background: '#10b981', color: 'white', border: 'none' }} onClick={() => validerEchange(v.id)}>✅ Transférer sur ce vol</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};