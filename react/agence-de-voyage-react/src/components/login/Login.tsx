import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { AuthService } from '../../services/auth.service';
import { ServeurService } from '../../services/serveur.service';
import './Login.css';

export const LoginComponent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [hidePassword, setHidePassword] = useState(true);
  
  const [formData, setFormData] = useState({
    pseudo: '',
    email: '',
    motDePasse: ''
  });

  const [messageErreur, setMessageErreur] = useState('');
  const [messageSucces, setMessageSucces] = useState('');

  // Equivalent du ngOnInit()
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      const id = searchParams.get('id') || '0';
      const role = searchParams.get('role') || 'ROLE_USER';
      const email = searchParams.get('email') || 'social_user@voyage.com';

      AuthService.sauvegarderSession(token, role, email, id);

      if (role === 'ROLE_ADMIN' || role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/recherche');
      }
    }
  }, [searchParams, navigate]);

  const togglePasswordVisibility = () => {
    setHidePassword(!hidePassword);
  };

  const onSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setMessageErreur('');
    setMessageSucces('');

    if (isLoginMode) {
      // En React, nos services renvoient des Promises (via fetch) au lieu d'Observables. 
      // On utilise donc .then() et .catch() au lieu de .subscribe()
      AuthService.login(formData.email, formData.motDePasse)
        .then((res) => {
          if (res.role === 'ROLE_ADMIN' || res.role === 'ADMIN') {
            navigate('/admin');
          } else {
            navigate('/recherche');
          }
        })
        .catch(() => {
          setMessageErreur("Identifiants incorrects.");
        });
    } else {
      AuthService.register(formData)
        .then(() => {
          setMessageSucces("Inscription réussie ! Vous pouvez vous connecter.");
          setIsLoginMode(true);
          setFormData(prev => ({ ...prev, motDePasse: '' }));
        })
        .catch((err) => {
          setMessageErreur(err.error?.error || "Erreur lors de l'inscription.");
        });
    }
  };

  const loginAsAdmin = () => {
    setIsLoginMode(true);
    setFormData({ pseudo: '', email: 'admin@voyage.com', motDePasse: 'admin123' });
    // On doit utiliser setTimeout pour simuler la mise à jour asynchrone du state React avant de soumettre
    setTimeout(() => {
      AuthService.login('admin@voyage.com', 'admin123')
        .then((res) => {
          if (res.role === 'ROLE_ADMIN' || res.role === 'ADMIN') navigate('/admin');
          else navigate('/recherche');
        })
        .catch(() => setMessageErreur("Identifiants incorrects."));
    }, 0);
  };

  const connexionSociale = (fournisseur: 'google' | 'github') => {
    const baseUrl = AuthService.getBaseUrl(); 
    const backend = ServeurService.getBackend();

    if (backend === 'django') {
      window.location.href = `${baseUrl}/auth/${fournisseur}/login/?frontend=react`;
    } else {
      // 👉 CORRECTION ICI : On pointe vers notre nouveau contrôleur Spring !
      window.location.href = `${baseUrl}/auth/init-social?fournisseur=${fournisseur}&frontend=react`;
    }
  };
  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Connexion</h2>

        {messageErreur && <div className="alert error">{messageErreur}</div>}
        {messageSucces && <div className="alert success">{messageSucces}</div>}

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="email">Adresse Email</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              value={formData.email} 
              onChange={e => setFormData({...formData, email: e.target.value})} 
              placeholder="admin@voyage.com" 
              required 
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <div className="password-wrapper">
              <input 
                type={hidePassword ? 'password' : 'text'} 
                id="password" 
                name="password" 
                value={formData.motDePasse} 
                onChange={e => setFormData({...formData, motDePasse: e.target.value})} 
                placeholder="••••••••" 
                required
              />
              <button type="button" className="btn-eye" onClick={togglePasswordVisibility}>
                {hidePassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'right', marginBottom: '15px' }}>
            <Link to="/password-reset" style={{ fontSize: '0.85rem', color: '#3b82f6', textDecoration: 'none' }}>Mot de passe oublié ?</Link>
          </div>

          <button type="submit" className="btn-submit">Se Connecter</button>

          <div className="toggle-mode">
            Pas encore inscrit ? <Link to="/inscription">Créer un compte ici</Link>
          </div>
        </form>

        <div className="divider">
          <span>OU</span>
        </div>

        <div className="social-login">
          <div className="social-buttons">
            <button type="button" className="btn-social google" onClick={() => connexionSociale('google')}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" />
              Google
            </button>
            <button type="button" className="btn-social github" onClick={() => connexionSociale('github')}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg" alt="GitHub" />
              GitHub
            </button>
          </div>

          <button type="button" className="btn-admin" onClick={loginAsAdmin}>
            🛡️ Connexion rapide Administrateur
          </button>
        </div>
      </div>
    </div>
  );
};