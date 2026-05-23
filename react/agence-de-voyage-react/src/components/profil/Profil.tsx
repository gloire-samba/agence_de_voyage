import React, { useState, useEffect } from 'react';
import { AuthService } from '../../services/auth.service';
import { apiFetch } from '../../interceptors/jwt.interceptor';
import './Profil.css';

export const ProfilComponent = () => {
  const idActuel = AuthService.getUserId();
  const [monProfil, setMonProfil] = useState({ email: '', motDePasse: '' });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hidePassword, setHidePassword] = useState(true);

  const togglePasswordVisibility = () => {
    setHidePassword(!hidePassword);
  };

  const getUrl = (): string => {
    const baseUrl = AuthService.getBaseUrl();
    const isDjango = baseUrl.includes('8000');
    return `${baseUrl}/utilisateurs/${idActuel}${isDjango ? '/' : ''}`;
  };

  const chargerMonProfil = () => {
    setIsLoading(true);
    apiFetch(getUrl())
      .then(res => {
        if (!res.ok) throw res;
        return res.json();
      })
      .then(data => {
        setMonProfil({ email: data.email, motDePasse: '' });
        setIsLoading(false);
      })
      .catch(() => {
        setMessage("❌ Impossible de charger vos informations.");
        setIsLoading(false);
      });
  };

  useEffect(() => {
    chargerMonProfil();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sauvegarder = () => {
    setIsLoading(true);
    setMessage('');
    
    const payload: any = { email: monProfil.email };
    if (monProfil.motDePasse && monProfil.motDePasse.trim() !== '') {
       payload.motDePasse = monProfil.motDePasse;
    }

    apiFetch(getUrl(), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) throw res;
        setMessage("✅ Profil mis à jour !");
        setIsLoading(false);
        setMonProfil(prev => ({ ...prev, motDePasse: '' }));
      })
      .catch(() => {
        setMessage("❌ Erreur lors de la mise à jour.");
        setIsLoading(false);
      });
  };

  return (
    <div className="profil-container">
      <h2>👤 Mon Profil</h2>
      <p className="subtitle">Gérez vos informations personnelles (ID: {idActuel})</p>

      {isLoading && !message && (
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <p>⏳ Chargement de vos données...</p>
        </div>
      )}

      {(!isLoading || message) && (
        <div className="form-card">
          {message && (
            <div className={`alert ${message.includes('✅') ? 'success' : ''}`}>
              {message}
            </div>
          )}

          <div className="form-group">
            <label>Adresse Email</label>
            <input 
              type="email" 
              value={monProfil.email} 
              onChange={e => setMonProfil({ ...monProfil, email: e.target.value })} 
              placeholder="votre@email.com" 
            />
          </div>

          <div className="form-group">
            <label>Nouveau mot de passe</label>
            <div className="password-wrapper">
              <input 
                type={hidePassword ? 'password' : 'text'} 
                value={monProfil.motDePasse} 
                onChange={e => setMonProfil({ ...monProfil, motDePasse: e.target.value })} 
                placeholder="Laissez vide pour conserver l'actuel" 
              />
              <button type="button" className="btn-eye" onClick={togglePasswordVisibility}>
                {hidePassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          <button className="btn-save" onClick={sauvegarder} disabled={isLoading}>
            💾 Mettre à jour mon profil
          </button>
        </div>
      )}
    </div>
  );
};