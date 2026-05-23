import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthService } from '../services/auth.service';

interface AuthGuardProps {
  requireAdmin?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ requireAdmin = false }) => {
  // Équivalent de authGuard : si non connecté, on redirige proprement
  if (!AuthService.isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  // Équivalent de adminGuard : si le rôle admin est requis mais non possédé
  if (requireAdmin && !AuthService.isAdmin()) {
    return <Navigate to="/login" replace />;
  }

  // Si toutes les vérifications passent, on laisse passer vers la route enfant
  return <Outlet />;
};