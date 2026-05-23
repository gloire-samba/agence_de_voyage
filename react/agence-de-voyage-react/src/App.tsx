import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';

// --- SERVICES & GUARDS ---
import { ServeurService, type BackendType } from './services/serveur.service';
import { AuthService } from './services/auth.service';
import { AuthGuard } from './guards/AuthGuard';

// --- COMPOSANTS PUBLICS ---
import { LoginComponent } from './components/login/Login';
import { InscriptionComponent } from './components/inscription/Inscription';
import { PasswordResetComponent } from './components/password-reset/PasswordReset';

// --- COMPOSANTS CLIENTS ---
import { RechercheComponent } from './components/recherche/Recherche';
import { HistoriqueComponent } from './components/historique/Historique';
import { ProfilComponent } from './components/profil/Profil';
import { PaiementComponent } from './components/paiement/Paiement';

// --- COMPOSANTS ADMINISTRATEURS ---
import { AdminDashboardComponent } from './components/admin-dashboard/AdminDashboard';
import { AdminVoyagesComponent } from './components/admin-voyages/AdminVoyages';
import { AdminVoyageFormComponent } from './components/admin-voyage-form/AdminVoyageForm';

import { AdminUtilisateurAvisComponent } from './components/admin-utilisateur-avis/AdminUtilisateurAvis';
import { AdminVoyageAvisComponent } from './components/admin-voyage-avis/AdminVoyageAvis';
import { AdminUtilisateurFormComponent } from './components/admin-utilisateur-form/AdminUtilisateurForm';
import { AdminUtilisateurReservationsComponent } from './components/admin-utilisateur-reservations/AdminUtilisateurReservations';
import { AdminRecherchePlaceComponent } from './components/admin-recherche-place/AdminRecherchePlace';

import './App.css';
import { AdminUtilisateursComponent } from './components/AdminUtilisateurs/AdminUtilisateurs';

function App() {
  const navigate = useNavigate();
  const [serveurActif, setServeurActif] = useState<BackendType>(ServeurService.getBackend());
  
  const [isLoggedIn, setIsLoggedIn] = useState(AuthService.isLoggedIn());
  const [isAdmin, setIsAdmin] = useState(AuthService.isAdmin());

  useEffect(() => {
    const subscription = AuthService.currentUser$.subscribe(() => {
      setIsLoggedIn(AuthService.isLoggedIn());
      setIsAdmin(AuthService.isAdmin());
    });
    return () => subscription.unsubscribe();
  }, []);

  const changerServeur = (backend: BackendType) => {
    AuthService.logout();
    ServeurService.setBackend(backend);
    window.location.href = '/';
  };

  const allerAuDashboard = () => navigate('/admin');
  
  const deconnexion = () => {
    AuthService.logout();
    navigate('/login');
  };

  const basculerVersAngular = () => {
    // 1. Invalidation du token React
    AuthService.logout();
    // 2. Redirection vers le port d'Angular
    window.location.href = 'http://localhost:4200/login';
  };

  return (
    <div className="app-host">
      <div className="app-layout">
        
        <header className="navbar">
          <div className="logo">
            <span className="icon">✈️</span> IA Travel
          </div>

          <div className="status-badge">
            <span style={{ color: '#00d8ff' }}>🖥️ Front: React</span>
            <span className="divider">|</span>
            <span style={{ color: serveurActif === 'spring' ? '#28a745' : '#007bff' }}>
              🗄️ Back: {serveurActif === 'spring' ? 'Spring' : 'Django'}
            </span>
          </div>
          
          <div className="backend-selector">
            <button type="button" style={{ backgroundColor: '#dd0031', color: 'white', fontWeight: 'bold' }} onClick={basculerVersAngular}>🅰️ Vue Angular</button>
            <button 
              className={serveurActif === 'spring' ? 'active-spring' : ''} 
              onClick={() => changerServeur('spring')}>
              ☕ Spring
            </button>
            <button 
              className={serveurActif === 'django' ? 'active-django' : ''} 
              onClick={() => changerServeur('django')}>
              🎸 Django
            </button>
          </div>
          
          <nav className="nav-links">
            {isLoggedIn && (
              <>
                <NavLink to="/recherche" className={({ isActive }) => isActive ? 'active' : ''}>
                  🔍 Rechercher un vol
                </NavLink>
                <NavLink to="/historique" className={({ isActive }) => isActive ? 'active' : ''}>
                  👤 Mon Historique
                </NavLink>
                <NavLink to="/profil" className={({ isActive }) => isActive ? 'active' : ''}>
                  ⚙️ Mon Profil
                </NavLink>

                {isAdmin && (
                  <button className="btn-admin" onClick={allerAuDashboard}>🛡️ Dashboard Admin</button>
                )}

                <button className="btn-logout" onClick={deconnexion}>Déconnexion</button>
              </>
            )}
          </nav>
        </header>

        <main className="main-content">
          <Routes>
            {/* Routes Publiques */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginComponent />} />
            <Route path="/inscription" element={<InscriptionComponent />} />
            <Route path="/password-reset" element={<PasswordResetComponent />} />
            
            {/* Routes protégées "authGuard" (Clients) */}
            <Route element={<AuthGuard />}>
              <Route path="/recherche" element={<RechercheComponent />} />
              <Route path="/historique" element={<HistoriqueComponent />} />
              <Route path="/profil" element={<ProfilComponent />} />
              <Route path="/paiement/:reservationId/:prix" element={<PaiementComponent />} />
            </Route>

            {/* Routes protégées "adminGuard" (Administrateur) */}
            <Route element={<AuthGuard requireAdmin={true} />}>
              {/* C'est ici que l'imbrication des routes enfants (children en Angular) opère ! */}
              <Route path="/admin" element={<AdminDashboardComponent />}>
                <Route index element={<Navigate to="voyages" replace />} />
                
                <Route path="voyages" element={<AdminVoyagesComponent />} />
                <Route path="voyages/nouveau" element={<AdminVoyageFormComponent />} />
                <Route path="voyages/:id" element={<AdminVoyageFormComponent />} />
                <Route path="voyages/:id/avis" element={<AdminVoyageAvisComponent />} />
                
                <Route path="utilisateurs" element={<AdminUtilisateursComponent />} />
                <Route path="utilisateurs/:id/modifier" element={<AdminUtilisateurFormComponent />} />
                <Route path="utilisateurs/:id/avis" element={<AdminUtilisateurAvisComponent />} />
                <Route path="utilisateurs/:id/reservations" element={<AdminUtilisateurReservationsComponent />} />
                
                <Route path="recherche-place" element={<AdminRecherchePlaceComponent />} />
              </Route>
            </Route>

            {/* Catch all (Wildcard) */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </main>
        
      </div>
    </div>
  );
}

export default App;