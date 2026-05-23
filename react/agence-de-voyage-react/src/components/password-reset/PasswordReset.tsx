import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthService } from '../../services/auth.service';
import './PasswordReset.css';

export const PasswordResetComponent = () => {
  const [email, setEmail] = useState('');
  const [messageErreur, setMessageErreur] = useState('');
  const [messageSucces, setMessageSucces] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [afficherBoutonInscription, setAfficherBoutonInscription] = useState(false);

  const demanderMotDePasse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    setMessageErreur('');
    setMessageSucces('');
    setAfficherBoutonInscription(false);

    const baseUrl = AuthService.getBaseUrl(); 
    const isDjango = baseUrl.includes('8000');
    
    const url = isDjango ? `${baseUrl}/auth/check-email/` : `${baseUrl}/auth/check-email`;
    
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    .then(res => {
      if (!res.ok) throw res;
      setIsLoading(false);
      setMessageSucces("✅ Un e-mail contenant votre mot de passe vient de vous être envoyé ! Vérifiez votre boîte de réception.");
    })
    .catch(() => {
      setIsLoading(false);
      setMessageErreur("Cette adresse e-mail n'est pas reconnue dans notre base de données.");
      setAfficherBoutonInscription(true);
    });
  };

  const reessayer = () => {
    setAfficherBoutonInscription(false);
    setMessageErreur('');
    setEmail('');
  };

  return (
    <div className="reset-container">
      <div className="reset-box">
        <h2>Mot de passe oublié</h2>

        {messageErreur && <div className="alert error">{messageErreur}</div>}
        {messageSucces && <div className="alert success">{messageSucces}</div>}

        {!messageSucces && !afficherBoutonInscription && (
          <form onSubmit={demanderMotDePasse}>
            <p className="description">Entrez votre adresse e-mail. Si elle est reconnue, nous vous enverrons votre mot de passe actuel.</p>
            
            <div className="form-group">
              <label>Adresse Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                name="email" 
                placeholder="votre@email.com" 
                required 
                disabled={isLoading} 
              />
            </div>
            
            <button type="submit" className="btn-submit" disabled={isLoading}>
              {isLoading ? 'Recherche en cours...' : 'Recevoir mon mot de passe'}
            </button>
            
            <div className="links">
              <Link to="/login">Retour à la connexion</Link>
            </div>
          </form>
        )}

        {afficherBoutonInscription && (
          <div className="not-found-zone">
            <p className="description" style={{ color: '#ef4444', fontWeight: 'bold' }}>Souhaitez-vous créer un compte ?</p>
            <Link to="/inscription">
              <button className="btn-submit btn-register">Aller à l'inscription</button>
            </Link>
            <div className="links"><a onClick={reessayer}>Réessayer avec une autre adresse</a></div>
          </div>
        )}

        {messageSucces && (
          <div className="links" style={{ marginTop: '25px' }}>
            <Link to="/login">
              <button className="btn-submit">Retourner à la page de connexion</button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};