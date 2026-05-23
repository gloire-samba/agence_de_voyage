import React, { useState, useEffect } from 'react';
import { VoyageService } from '../../services/voyage.service';
import { AudioRecorderService } from '../../services/audio-recorder.service';
import './AvisForm.css';

interface AvisFormProps {
  reservationId: number;
  avisExistant?: any;
  fermer: () => void;
  avisSoumis: () => void;
}

export const AvisFormComponent: React.FC<AvisFormProps> = ({ reservationId, avisExistant, fermer, avisSoumis }) => {
  const [note, setNote] = useState(5);
  const [commentaire, setCommentaire] = useState('');
  
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    if (avisExistant) {
      setNote(avisExistant.note);
      setCommentaire(avisExistant.commentaire || '');
    }
  }, [avisExistant]);

  const soumettreTexte = () => {
    if (!commentaire.trim()) return;
    setIsLoadingText(true);
    setErreur('');

    if (avisExistant) {
      VoyageService.modifierAvis(avisExistant.id, note, commentaire)
        .then(() => {
          setIsLoadingText(false);
          avisSoumis();
        })
        .catch(() => {
          setIsLoadingText(false);
          setErreur("Erreur lors de la modification de l'avis.");
        });
    } else {
      VoyageService.creerAvisTexte(reservationId, note, commentaire)
        .then(() => {
          setIsLoadingText(false);
          avisSoumis();
        })
        .catch((err: any) => {
          setIsLoadingText(false);
          if (err.status === 409 || err.status === 400) {
            setErreur("Vous avez déjà laissé un avis pour ce voyage.");
          } else {
            setErreur("Erreur lors de l'enregistrement de l'avis.");
          }
        });
    }
  };

  const toggleEnregistrement = async () => {
    setErreur('');

    if (isRecording) {
      setIsRecording(false);
      setIsLoadingAudio(true);

      try {
        const audioBlob = await AudioRecorderService.stopRecording();
        const idPourModif = avisExistant ? avisExistant.id : undefined;
        
        VoyageService.soumettreAvisVocal(reservationId, audioBlob, note)
          .then(() => {
            setIsLoadingAudio(false);
            avisSoumis();
          })
          .catch((err: any) => {
            setIsLoadingAudio(false);
            gererErreurIA(err);
          });
      } catch (err) {
        setIsLoadingAudio(false);
        setErreur("Erreur lors de l'arrêt du micro.");
      }
    } else {
      try {
        await AudioRecorderService.startRecording();
        setIsRecording(true);
      } catch (err) {
        setErreur("L'accès au microphone a été refusé.");
      }
    }
  };

  const gererErreurIA = (err: any) => {
    if (err.status === 429) {
      setErreur("L'IA est actuellement saturée (trop de requêtes). Veuillez patienter quelques instants.");
    } else if (err.status === 503) {
      setErreur("Le service IA est temporairement indisponible.");
    } else if (err.status === 405) {
      setErreur("Action refusée. Vérifiez que la réservation est confirmée.");
    } else {
      setErreur(err.error?.error || err.error?.detail || "Une erreur est survenue lors du traitement vocal.");
    }
  };

  return (
    <div className="modal-overlay" onClick={fermer}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        
        <div className="modal-header">
          <h3>{avisExistant ? 'Modifier mon avis' : 'Donner mon avis'}</h3>
          <button className="btn-close" onClick={fermer}>✖</button>
        </div>

        <div className="modal-body">
          <div className="rating-section">
            <p className="label">Notez votre voyage :</p>
            <div className="stars">
              {[1, 2, 3, 4, 5].map(star => (
                <span 
                  key={star} 
                  className={`star ${star <= note ? 'active' : ''}`} 
                  onClick={() => setNote(star)}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <p className="label">Votre commentaire (optionnel si vocal) :</p>
            <textarea 
              value={commentaire} 
              onChange={e => setCommentaire(e.target.value)} 
              rows={4} 
              placeholder="Racontez votre expérience..."
              disabled={isRecording || isLoadingAudio || isLoadingText}
            />
          </div>

          {erreur && <div className="error-msg">⚠️ {erreur}</div>}
        </div>

        <div className="modal-footer">
          <p className="helper-text">Choisissez comment valider cet avis :</p>
          
          <div className="action-buttons">
            <button 
              className="btn-submit btn-texte" 
              onClick={soumettreTexte} 
              disabled={isLoadingText || isRecording || isLoadingAudio || !commentaire}
            >
              {isLoadingText ? (
                <><span className="spinner">⏳</span> Envoi...</>
              ) : (
                `📝 ${avisExistant ? 'Modifier' : 'Ajouter'} par écrit`
              )}
            </button>

            <button 
              className={`btn-submit btn-vocal ${isRecording ? 'recording' : ''}`} 
              onClick={toggleEnregistrement}
              disabled={isLoadingText || isLoadingAudio}
            >
              {isLoadingAudio ? (
                <><span className="spinner">⏳</span> Analyse IA...</>
              ) : isRecording ? (
                '🛑 Stopper l\'enregistrement'
              ) : (
                `🎤 ${avisExistant ? 'Modifier' : 'Ajouter'} à l'oral`
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};