import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { ReservationService } from '../../services/reservation.service';
import { VoyageService } from '../../services/voyage.service';
import { AuthService } from '../../services/auth.service';
import type { Reservation } from '../../models/reservation';
import './Historique.css';
import { AvisFormComponent } from '../avis-form/AvisForm';


export const HistoriqueComponent = () => {
  const navigate = useNavigate();

  const utilisateurConnecte = AuthService.getUserId();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [erreur, setErreur] = useState('');

  const [afficherModalAvis, setAfficherModalAvis] = useState(false);
  const [reservationSelectionneeId, setReservationSelectionneeId] = useState<number | undefined>();
  const [avisSelectionne, setAvisSelectionne] = useState<any>(null);

  const [afficherModalBillet, setAfficherModalBillet] = useState(false);
  const [reservationBillet, setReservationBillet] = useState<Reservation | null>(null);

  const chargerHistorique = () => {
    setIsLoading(true);
    setErreur('');

    ReservationService.getHistoriqueUtilisateur(utilisateurConnecte)
      .then((data: any) => {
        if (!data) {
          setReservations([]);
        } else {
          const donneesBrutes = data?.results || data?.content || data?._embedded?.reservations || data;
          setReservations(Array.isArray(donneesBrutes) ? donneesBrutes : []);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        setIsLoading(false);
        if (err.status === 404 || err.status === 204) {
          setReservations([]);
        } else {
          setErreur("Impossible de récupérer votre historique pour le moment.");
        }
      });
  };

  useEffect(() => {
    chargerHistorique();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allerAuPaiement = (reservation: Reservation) => {
    if (!reservation.id) return;
    const prix = getPrixPaye(reservation);
    navigate(`/paiement/${reservation.id}/${prix}`);
  };

  const annulerReservation = (id: number | undefined) => {
    if (!id) return;
    if (window.confirm('Êtes-vous sûr de vouloir annuler cette réservation ? Un remboursement automatique sera déclenché.')) {
      ReservationService.annulerReservation(id)
        .then(() => chargerHistorique())
        .catch(() => alert('Une erreur est survenue lors de l\'annulation.'));
    }
  };

  const getStatutVoyage = (reservation: Reservation): string => {
    const v = getVoyage(reservation);
    return v.statut || 'A_VENIR';
  };

  // ==========================================
  // 👉 GESTION DU BILLET ET PDF
  // ==========================================

  const getSieges = (reservation: Reservation): string => {
    if (!reservation.billets || reservation.billets.length === 0) return 'En attente';
    return reservation.billets.map(b => b.siege).join(', ');
  };

  const ouvrirBillet = (res: Reservation) => {
    setReservationBillet(res);
    setAfficherModalBillet(true);
  };

  const fermerBillet = () => {
    setAfficherModalBillet(false);
    setReservationBillet(null);
  };

  const telechargerPDF = () => {
    if (!reservationBillet) return;
    
    const res = reservationBillet;
    const doc = new jsPDF();
    
    doc.setFillColor(15, 23, 42); 
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('CARTE D\'EMBARQUEMENT', 105, 25, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    
    doc.text(`N° de Réservation : #${res.id}`, 20, 60);
    const dateC = getDateConfirmation(res);
    doc.text(`Date d'achat : ${dateC ? new Date(dateC).toLocaleDateString('fr-FR') : 'N/A'}`, 140, 60);

    doc.setLineWidth(0.5);
    doc.rect(20, 75, 170, 35);
    doc.setFontSize(16);
    doc.text(`${getVilleDepart(res)}`, 30, 95);
    doc.text(`➔`, 100, 95);
    doc.text(`${getVilleArrivee(res)}`, 120, 95);

    doc.setFontSize(12);
    doc.text('INFORMATIONS VOYAGEUR', 20, 130);
    doc.setFontSize(10);
    doc.text(`Propriétaire : Compte Client N°${utilisateurConnecte}`, 20, 140);
    doc.text(`Siège(s) assigné(s) : ${getSieges(res)}`, 20, 150);
    doc.text(`Montant réglé : ${getPrixPaye(res)} EUR`, 20, 160);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Merci de voyager avec nous. Présentez ce document à la porte d\'embarquement.', 105, 280, { align: 'center' });

    doc.save(`Billet_Voyage_${res.id}.pdf`);
  };

  // 🛡️ --- MÉTHODES DE LECTURE UNIVERSELLES --- 🛡️
  const getVoyage = (reservation: Reservation): any => reservation.voyage || {};
  const getVilleDepart = (reservation: Reservation): string => { const v = getVoyage(reservation); return v.villeDepart || v.ville_depart || 'Inconnu'; };
  const getVilleArrivee = (reservation: Reservation): string => { const v = getVoyage(reservation); return v.villeArrivee || v.ville_arrivee || 'Inconnu'; };
  const getPrixPaye = (reservation: Reservation): number => reservation.prixPaye || (reservation as any).prix_paye || 0;
  const getDateConfirmation = (reservation: Reservation): string => reservation.dateConfirmation || (reservation as any).date_confirmation || '';
  
  const getMonAvis = (reservation: Reservation): any => {
    const voyage = getVoyage(reservation);
    if (voyage && voyage.avis && Array.isArray(voyage.avis)) {
      return voyage.avis.find((a: any) => {
        const auteurId = a.utilisateur?.id || a.utilisateur_id || a.utilisateur;
        return auteurId === utilisateurConnecte;
      });
    }
    return null;
  };

  const ouvrirFormulaireAvis = (idReservation: number | undefined, avisExistant: any = null) => {
    if (!idReservation) return;
    setReservationSelectionneeId(idReservation);
    setAvisSelectionne(avisExistant);
    setAfficherModalAvis(true);
  };

  const fermerFormulaire = (doitRafraichir: boolean = false) => {
    setAfficherModalAvis(false);
    setAvisSelectionne(null);
    if (doitRafraichir) chargerHistorique();
  };

  const supprimerAvis = (idAvis: number) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cet avis ?")) {
      setIsLoading(true);
      VoyageService.supprimerAvisBase(idAvis)
        .then(() => chargerHistorique())
        .catch(() => {
          setIsLoading(false);
          alert("Erreur lors de la suppression de l'avis.");
        });
    }
  };

  // Fonction pour recréer le filtre CurrencyPipe d'Angular
  const formatCurrency = (value: number, minFrac = 0, maxFrac = 0) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: minFrac, maximumFractionDigits: maxFrac }).format(value);
  };

  // Fonction pour recréer le filtre DatePipe d'Angular
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="historique-container">
      <h2>Mon Tableau de Bord</h2>
      <p className="subtitle">Retrouvez ici toutes vos réservations passées et à venir.</p>

      {isLoading ? (
        <div className="loading-state">
          <div className="spinner">⏳</div>
          <p>Chargement de vos voyages...</p>
        </div>
      ) : erreur ? (
        <div className="error-state">
          ⚠️ {erreur}
        </div>
      ) : reservations.length === 0 ? (
        <div className="empty-state">
          <h3>Aucune réservation</h3>
          <p>Vous n'avez pas encore réservé de voyage avec nous. C'est le moment de partir !</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="voyage-table">
            <thead>
              <tr>
                <th>N° Commande</th>
                <th>Trajet</th>
                <th>Places</th> 
                <th>Prix Payé</th>
                <th>Date</th>
                <th>Statut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map(res => (
                <tr key={res.id}>
                  <td><strong>#{res.id}</strong></td>
                  
                  <td>
                    <div className="trajet-info">
                      <span className="ville">{getVilleDepart(res)}</span>
                      <span className="fleche">➔</span>
                      <span className="ville">{getVilleArrivee(res)}</span>
                    </div>
                  </td>
                  
                  <td>
                    <span className="badge-siege">{getSieges(res)}</span>
                  </td>

                  <td className="prix">{formatCurrency(getPrixPaye(res), 2, 2)}</td>
                  
                  <td>
                    {getDateConfirmation(res) ? (
                      formatDate(getDateConfirmation(res))
                    ) : (
                      <span className="text-muted">Non définie</span>
                    )}
                  </td>
                  
                  <td>
                    {res.statut === 'CONFIRME' && getStatutVoyage(res) === 'ANNULE' ? (
                      <span className="badge badge-alerte">VOL ANNULÉ</span>
                    ) : (
                      <span className={`badge ${res.statut === 'CONFIRME' ? 'confirme' : res.statut === 'EN_ATTENTE' ? 'attente' : 'annule'}`}>
                        {res.statut}
                      </span>
                    )}
                  </td>
                  
                  <td>
                    {res.statut === 'ANNULE' || res.statut === 'REMBOURSE' || getStatutVoyage(res) === 'ANNULE' ? (
                      <span className="no-action">-</span>
                    ) : res.statut === 'EN_ATTENTE' ? (
                      <div className="actions-groupe">
                        <button className="btn-payer-historique" onClick={() => allerAuPaiement(res)}>💳 Payer</button>
                        <button className="btn-annuler" onClick={() => annulerReservation(res.id)}>Annuler</button>
                      </div>
                    ) : res.statut === 'CONFIRME' ? (
                      <div className="actions-avis">
                        
                        <button className="btn-action-avis btn-billet" onClick={() => ouvrirBillet(res)}>🎟️ Mon Billet</button>

                        {(() => {
                          const monAvis = getMonAvis(res);
                          return monAvis ? (
                            <>
                              <span className="badge-note">⭐ {monAvis.note}/5</span>
                              <button className="btn-action-avis edit-texte" onClick={() => ouvrirFormulaireAvis(res.id, monAvis)} title="Modifier">✏️</button>
                              <button className="btn-action-avis btn-supprimer" onClick={() => supprimerAvis(monAvis.id)} title="Supprimer">🗑️</button>
                            </>
                          ) : (
                            <button className="btn-action-avis add-texte" onClick={() => ouvrirFormulaireAvis(res.id)}>⭐ Avis</button>
                          );
                        })()}
                        
                        <button className="btn-annuler" style={{ width: '100%', marginTop: '8px' }} onClick={() => annulerReservation(res.id)}>Annuler le vol</button>

                      </div>
                    ) : (
                      <span className="no-action">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {afficherModalAvis && (
        <AvisFormComponent 
          reservationId={reservationSelectionneeId}
          avisExistant={avisSelectionne}
          fermer={() => fermerFormulaire(false)}
          avisSoumis={() => fermerFormulaire(true)}
        />
      )}

      {afficherModalBillet && reservationBillet && (
        <div className="modal-overlay" onClick={fermerBillet}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            
            <div className="ticket-header">
              <h3>CARTE D'EMBARQUEMENT</h3>
              <button className="btn-close-ticket" onClick={fermerBillet}>✖</button>
            </div>

            <div className="ticket-body">
              <div className="ticket-trajet">
                <span className="t-ville">{getVilleDepart(reservationBillet)}</span>
                <span className="t-fleche">✈️</span>
                <span className="t-ville">{getVilleArrivee(reservationBillet)}</span>
              </div>

              <div className="ticket-details">
                <div className="ticket-info">
                  <span className="t-label">N° Commande</span>
                  <span className="t-valeur">#{reservationBillet.id}</span>
                </div>
                <div className="ticket-info">
                  <span className="t-label">Date d'achat</span>
                  <span className="t-valeur">{formatDate(getDateConfirmation(reservationBillet))}</span>
                </div>
                <div className="ticket-info">
                  <span className="t-label">Prix Total</span>
                  <span className="t-valeur">{formatCurrency(getPrixPaye(reservationBillet), 0, 0)}</span>
                </div>
                <div className="ticket-info siege-info">
                  <span className="t-label">SIÈGE(S)</span>
                  <span className="t-valeur t-siege">{getSieges(reservationBillet)}</span>
                </div>
              </div>
            </div>

            <div className="ticket-footer">
              <button className="btn-telecharger-pdf" onClick={telechargerPDF}>
                📄 Télécharger au format PDF
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};