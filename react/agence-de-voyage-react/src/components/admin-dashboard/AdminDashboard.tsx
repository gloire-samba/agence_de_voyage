import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AuthService } from '../../services/auth.service';
import './AdminDashboard.css';

export const AdminDashboardComponent = () => {
  const navigate = useNavigate();

  const deconnexion = () => {
    AuthService.logout();
    navigate('/login');
  };

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <h2>🛡️ Espace Admin</h2>
        </div>

        <nav className="sidebar-nav">
          <NavLink 
            to="/admin/voyages" 
            className={({ isActive }) => isActive ? "nav-item actif" : "nav-item"}
          >
            ✈️ Liste des Voyages
          </NavLink>
          <NavLink 
            to="/admin/utilisateurs" 
            className={({ isActive }) => isActive ? "nav-item actif" : "nav-item"}
          >
            👥 Liste Utilisateurs
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button className="btn-deconnexion" onClick={deconnexion}>Déconnexion</button>
        </div>
      </aside>

      <main className="admin-content">
        {/* L'équivalent de <router-outlet></router-outlet> */}
        <Outlet />
      </main>
    </div>
  );
};