import { Routes } from '@angular/router';
import { RechercheComponent } from './components/recherche/recherche.component';
import { HistoriqueComponent } from './components/historique/historique.component';
import { PaiementComponent } from './components/paiement/paiement.component';
import { LoginComponent } from './components/login/login.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
// 👉 NOUVEAU : Import du profil
import { ProfilComponent } from './components/profil/profil.component';

export const routes: Routes = [
  // Redirection par défaut vers le login
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  
  // Interface Client (Invité)
  { path: 'recherche', component: RechercheComponent },
  { path: 'historique', component: HistoriqueComponent },
  { path: 'profil', component: ProfilComponent }, // 👉 NOUVEAU : Route pour le profil
  
  // La route de paiement
  { path: 'paiement/:reservationId/:prix', component: PaiementComponent },
  
  // Interface Administrateur
  { path: 'admin/dashboard', component: AdminDashboardComponent },

  // 👉 CORRECTION : La sécurité Catch-All doit TOUJOURS être à la fin
  { path: '**', redirectTo: 'login' },
];