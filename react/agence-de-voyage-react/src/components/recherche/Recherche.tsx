import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { VoyageService } from '../../services/voyage.service';
import { ReservationService } from '../../services/reservation.service';
import { AudioRecorderService } from '../../services/audio-recorder.service';
import { AuthService } from '../../services/auth.service';
import { ServeurService } from '../../services/serveur.service';
import { CatalogueComponent } from '../catalogue/Catalogue';
import type { Voyage } from '../../models/voyage';
import './Recherche.css'; 

export const RechercheComponent = () => {
  const navigate = useNavigate();

  const [catalogueComplet, setCatalogueComplet] = useState<Voyage[]>([]);
  const [voyagesA_Afficher, setVoyagesA_Afficher] = useState<Voyage[]>([]);

  const [texteRecherche, setTexteRecherche] = useState('');
  const [villeDepart, setVilleDepart] = useState('');
  const [villeArrivee, setVilleArrivee] = useState('');
  const [dateDepart, setDateDepart] = useState('');
  const [dureeMaxHeures, setDureeMaxHeures] = useState<number | ''>('');

  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [phraseReconnue, setPhraseReconnue] = useState('');
  const [erreur, setErreur] = useState('');
  const [texteIA, setTexteIA] = useState('');
  const [estAdmin, setEstAdmin] = useState(false);

  // Équivalent du ngOnInit() d'Angular
  useEffect(() => {
    const admin = AuthService.isAdmin();
    setEstAdmin(admin);

    VoyageService.getTousLesVoyages()
      .then((data: any) => {
        // 👉 CORRECTION 1 : Gère à la fois Spring (Array) et Django (data.results)
        const donneesBrutes = Array.isArray(data) ? data : (data.results || data.content || []);
        const filtres = appliquerFiltreRole(donneesBrutes, admin);
        setCatalogueComplet(filtres);
        setVoyagesA_Afficher(filtres);
      })
      .catch((err) => console.error("Erreur de chargement du catalogue", err));
  }, []);

  const appliquerFiltreRole = (resultatsBruts: any[], adminStatus: boolean): Voyage[] => {
    if (adminStatus) return resultatsBruts; 
    
    return resultatsBruts.filter(v => {
      const statut = v.statut || v.statut || 'A_VENIR';
      const capacite = v.nombrePlacesTotal || v.nombre_places_total || 0;
      let placesRestantes = capacite;

      if (v.placesRestantes !== undefined && v.placesRestantes !== null) {
          placesRestantes = v.placesRestantes;
      } else if (v.places_restantes !== undefined && v.places_restantes !== null) {
          placesRestantes = v.places_restantes;
      }
      return statut === 'A_VENIR' && placesRestantes > 0; 
    });
  };

  const calculerDureeMinutes = (v: any): number => {
    if (!v.segments || v.segments.length === 0) return 0;
    const d1 = new Date(v.segments[0].heureDepart || v.segments[0].heure_depart).getTime();
    const d2 = new Date(v.segments[v.segments.length - 1].heureArrivee || v.segments[v.segments.length - 1].heure_arrivee).getTime();
    return (d2 - d1) / 60000;
  };

  const permuterVilles = () => {
    setVilleDepart(villeArrivee);
    setVilleArrivee(villeDepart);
  };

  // Équivalent strict du (ngModelChange)="rechercheManuelle()"
  useEffect(() => {
    setErreur('');
    setPhraseReconnue(''); 
    
    let resultatsFiltres = [...catalogueComplet];

    if (texteRecherche) {
      const recherche = texteRecherche.toLowerCase();
      resultatsFiltres = resultatsFiltres.filter((v: any) => {
        const depart = (v.villeDepart || v.ville_depart || '').toLowerCase();
        const arrivee = (v.villeArrivee || v.ville_arrivee || '').toLowerCase();
        return depart.includes(recherche) || arrivee.includes(recherche);
      });
    }

    if (villeDepart) {
      resultatsFiltres = resultatsFiltres.filter((v: any) => {
        const nomVille = v.villeDepart || v.ville_depart || '';
        return nomVille.toLowerCase().includes(villeDepart.toLowerCase());
      });
    }

    if (villeArrivee) {
      resultatsFiltres = resultatsFiltres.filter((v: any) => {
        const nomVille = v.villeArrivee || v.ville_arrivee || '';
        return nomVille.toLowerCase().includes(villeArrivee.toLowerCase());
      });
    }

    if (dateDepart) {
      resultatsFiltres = resultatsFiltres.filter((v: any) => {
        if (!v.segments || v.segments.length === 0) return false;
        const heureDep = v.segments[0].heureDepart || v.segments[0].heure_depart || '';
        return heureDep.startsWith(dateDepart);
      });
    }

    if (dureeMaxHeures !== '') {
      const maxMinutes = Number(dureeMaxHeures) * 60;
      resultatsFiltres = resultatsFiltres.filter(v => calculerDureeMinutes(v) <= maxMinutes);
    }

    setVoyagesA_Afficher(resultatsFiltres);
  }, [texteRecherche, villeDepart, villeArrivee, dateDepart, dureeMaxHeures, catalogueComplet]);

  const toggleRecording = async () => {
    setErreur('');
    
    if (isRecording) {
      setIsRecording(false);
      setIsLoading(true);

      try {
        const audioBlob = await AudioRecorderService.stopRecording();
        VoyageService.rechercheVocaleIA(audioBlob)
          .then((response: any) => {
            setIsLoading(false);
            const texteIA = response.texteReconnu || response.texte_reconnu || "Recherche incomprise";
            setPhraseReconnue(`L'IA a compris : "${texteIA}"`);
            
            // 👉 CORRECTION 2 : On ajoute 'response.results' pour Django
            const resultatsBruts = Array.isArray(response) ? response : (response.results || response.resultats || []);
            setVoyagesA_Afficher(appliquerFiltreRole(resultatsBruts, estAdmin));
          })
          .catch((err) => {
            setIsLoading(false);
            setErreur("Erreur IA : " + (err.error?.detail || "Impossible de joindre le serveur."));
          });
      } catch (err) {
        setErreur("Erreur lors de l'arrêt de l'enregistrement.");
        setIsLoading(false);
      }
    } else {
      try {
        await AudioRecorderService.startRecording();
        setIsRecording(true);
      } catch (err) {
        setErreur("Impossible d'accéder au micro.");
      }
    }
  };

  const rechercheTexteIA = () => {
    if (!texteIA.trim()) return;
    
    setIsLoading(true);
    setErreur('');

    VoyageService.rechercheTexteIA(texteIA)
      .then((response: any) => {
        setIsLoading(false);
        const texteCompris = response.texteReconnu || response.texte_reconnu || "Analyse terminée";
        setPhraseReconnue(`L'IA a analysé : "${texteCompris}"`);
        
        // 👉 CORRECTION 3 : On ajoute 'response.results' pour Django
        const resultatsBruts = Array.isArray(response) ? response : (response.results || response.resultats || []);
        setVoyagesA_Afficher(appliquerFiltreRole(resultatsBruts, estAdmin));
      })
      .catch((err) => {
        setIsLoading(false);
        setErreur("Erreur IA : " + (err.error?.detail || "Impossible de joindre le serveur."));
      });
  };

  const declencherReservation = (event: { voyage: Voyage, nbPlaces: number }) => {
    const voyage = event.voyage;
    const nbPlaces = event.nbPlaces;
    const prixUnitaire = voyage.prixTotal || (voyage as any).prix_total;
    const prixTotalPaiement = prixUnitaire * nbPlaces; 
    const userId = AuthService.getUserId();
    
    let nouvelleResa: any = {};
    if (ServeurService.getBackend() === 'spring') {
      nouvelleResa = { utilisateur: { id: userId }, voyage: { id: voyage.id }, nbPlacesDemandees: nbPlaces };
    } else {
      nouvelleResa = { utilisateur_id: userId, voyage_id: voyage.id, nbPlacesDemandees: nbPlaces };
    }

    ReservationService.creerReservation(nouvelleResa)
      .then((resa) => navigate(`/paiement/${resa.id}/${prixTotalPaiement}`))
      .catch(() => alert('Erreur : Impossible de créer la réservation.'));
  };

  return (
    <div className="recherche-container">
      <h2>Où souhaitez-vous aller ?</h2>
      
      <div className="search-panel">
        
        <div className="manual-search-row">
          <div className="input-group">
            <label>Départ</label>
            <input type="text" value={villeDepart} onChange={e => setVilleDepart(e.target.value)} placeholder="De quelle ville ?" />
          </div>

          <button className="btn-swap" onClick={permuterVilles} title="Inverser les villes">⇄</button>

          <div className="input-group">
            <label>Destination</label>
            <input type="text" value={villeArrivee} onChange={e => setVilleArrivee(e.target.value)} placeholder="Vers où ?" />
          </div>

          <div className="input-group">
            <label>Date</label>
            <input type="date" value={dateDepart} onChange={e => setDateDepart(e.target.value)} />
          </div>

          <div className="input-group">
            <label>Durée Max (h)</label>
            <input type="number" value={dureeMaxHeures} onChange={e => setDureeMaxHeures(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ex: 5" style={{ width: '80px' }} />
          </div>

          <div className="input-group">
            <label>Recherche Rapide</label>
            <input type="text" value={texteRecherche} onChange={e => setTexteRecherche(e.target.value)} placeholder="Mot clé..." />
          </div>
        </div>

        <div className="divider">
          <span>OU</span>
        </div>

        <div className="ia-search-zone">
          <p className="ia-label">Demandez à l'IA</p>
          
          <div className="ia-text-box">
            <input 
              type="text" 
              value={texteIA}
              onChange={e => setTexteIA(e.target.value)}
              placeholder="Ex: les voyage de moins de 500 €"
              onKeyDown={e => e.key === 'Enter' && rechercheTexteIA()}
              disabled={isLoading}
            />
            <button className="btn-ia-text" onClick={rechercheTexteIA} disabled={isLoading || !texteIA} title="Envoyer à l'IA">✨</button>
          </div>

          <p className="ia-ou">ou parlez-lui</p>

          <button className={`btn-mic ${isRecording ? 'recording' : ''}`} onClick={toggleRecording} disabled={isLoading} title="Maintenez pour parler">
            {!isRecording && !isLoading && <span>🎤</span>}
            {isRecording && <span>🛑</span>}
            {isLoading && <span className="spinner">⏳</span>}
          </button>
        </div>

      </div>

      {(phraseReconnue || erreur) && (
        <div className="feedback-zone">
          {phraseReconnue && !erreur && <div className="success-msg">{phraseReconnue}</div>}
          {erreur && <div className="error-msg">⚠️ {erreur}</div>}
        </div>
      )}

      {!isLoading && !erreur && voyagesA_Afficher.length === 0 && (
        <div className="no-results-zone">
          <h3>Aucun voyage trouvé 🏜️</h3>
          <p>
            Votre recherche 
            <strong>"{phraseReconnue || villeDepart || villeArrivee || dateDepart || texteRecherche || 'actuelle'}"</strong> 
            n'a donné aucun résultat.
          </p>
        </div>
      )}

      <CatalogueComponent voyages={voyagesA_Afficher} onReserver={declencherReservation} />
    </div>
  );
};