import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ServeurService } from '../../services/serveur.service';
import { ReservationService } from '../../services/reservation.service';
import { environment } from '../../environments/environment.development';
import { apiFetch } from '../../interceptors/jwt.interceptor';
import './Paiement.css';
import { type Stripe, type StripeElements, loadStripe } from '@stripe/stripe-js';

// 👉 CORRECTION 1 : On charge Stripe UNE SEULE FOIS en dehors du composant
const stripePromise = loadStripe('pk_test_51TSDQQ233VR20pvSSLzE8e6TDSvgE8UyawtC93zOX8P0rajCT4cfmgdgNUQzrNMw3IzhMTUrbJzdqXR5SxULS1iF00DNWsnDdi');

export const PaiementComponent = () => {
  const { reservationId, prix } = useParams<{ reservationId: string, prix: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [ticketRecu, setTicketRecu] = useState(false);
  
  const [stripeObj, setStripeObj] = useState<Stripe | null>(null);
  const [elementsObj, setElementsObj] = useState<StripeElements | null>(null);

  useEffect(() => {
    const initStripe = async () => {
      // 👉 On attend la promesse globale
      const stripeInstance = await stripePromise;
      setStripeObj(stripeInstance);

      const backend = ServeurService.getBackend();
      const url = backend === 'spring' 
        ? `${environment.urls[backend]}/paiement/create-intent`
        : `${environment.urls[backend]}/paiement/create-intent/`;

      apiFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prixTotal: Number(prix) })
      })
        .then(res => res.json())
        .then(res => {
          if (res && res.clientSecret && stripeInstance) {
            const elems = stripeInstance.elements({
              clientSecret: res.clientSecret,
              locale: 'fr',
              appearance: { theme: 'stripe' }
            });
            setElementsObj(elems);
            
            const paymentElement = elems.create('payment', { layout: 'tabs' });
            setTicketRecu(true);
            
            setTimeout(() => {
              paymentElement.mount('#payment-element-div');
            }, 0);
          } else {
            setMessage("Erreur : Ticket secret non reçu.");
          }
        })
        .catch(() => {
          setMessage("Échec de la communication avec l'API de paiement.");
        });
    };

    initStripe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prix]);

  const payer = async () => {
    if (isLoading || !stripeObj || !elementsObj) return;
    
    setIsLoading(true);
    setMessage("Traitement du paiement en cours...");

    try {
      // 👉 CORRECTION 2 : On sécurise le paiement avec un try/catch
      const { error, paymentIntent } = await stripeObj.confirmPayment({
        elements: elementsObj,
        redirect: 'if_required' 
      });

      if (error) {
        setIsLoading(false);
        setMessage("❌ Paiement refusé : " + error.message);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setMessage("✅ Paiement Stripe validé ! Mise à jour de votre billet...");

        ReservationService.confirmerPaiement(Number(reservationId), paymentIntent.id)
          .then(() => {
            setIsLoading(false);
            setMessage("✅ Billet confirmé ! Bon voyage !");
            setTimeout(() => navigate('/historique'), 2000);
          })
          .catch(() => {
            setIsLoading(false);
            setMessage("⚠️ Paiement accepté, mais erreur de confirmation côté serveur.");
          });
      } else {
        setIsLoading(false);
        setMessage("Erreur inattendue.");
      }
    } catch (err: any) {
      setIsLoading(false);
      setMessage("❌ Erreur d'intégration Stripe : " + err.message);
    }
  };

  return (
    <div className="paiement-container">
      <div className="header">
        <h2>Paiement Sécurisé</h2>
        <p>Validation de la réservation N°{reservationId}</p>
      </div>

      <div className="montant-box">
        <span>Montant à régler :</span>
        <strong>{prix} €</strong>
      </div>

      {ticketRecu ? (
        <div className="stripe-zone">
          <div id="payment-element-div"></div>

          <button className="btn-payer" onClick={payer} disabled={isLoading}>
            {isLoading ? (
              <><span className="spinner">⏳</span> Traitement...</>
            ) : (
              `🔒 Payer ${prix} €`
            )}
          </button>

          {message && (
            <div className={`message-alerte ${message.includes('✅') ? 'success' : message.includes('❌') || message.includes('Erreur') || message.includes('Échec') ? 'error' : ''}`}>
              {message}
            </div>
          )}
        </div>
      ) : !message ? (
        <div className="loading-zone">
          <span className="spinner">⏳</span> Connexion à la banque...
        </div>
      ) : (
        <div className="message-alerte error">{message}</div>
      )}
    </div>
  );
};