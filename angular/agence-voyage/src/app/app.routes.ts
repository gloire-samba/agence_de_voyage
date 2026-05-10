import { Routes } from '@angular/router';
import { RechercheComponent } from './components/recherche/recherche.component';
import { HistoriqueComponent } from './components/historique/historique.component';
import { PaiementComponent } from './components/paiement/paiement.component';
import { LoginComponent } from './components/login/login.component';
import { InscriptionComponent } from './components/inscription/inscription.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { ProfilComponent } from './components/profil/profil.component';
import { adminGuard, authGuard } from './guards/auth.guard';
import { AdminVoyagesComponent } from './components/admin-voyages/admin-voyages.component';
import { AdminVoyageFormComponent } from './components/admin-voyage-form/admin-voyage-form.component';
import { AdminUtilisateurAvisComponent } from './components/admin-utilisateur-avis/admin-utilisateur-avis.component';
import { AdminUtilisateursComponent } from './components/admin-utilisateurs/admin-utilisateurs.component';
import { AdminUtilisateurReservationsComponent } from './components/admin-utilisateur-reservations/admin-utilisateur-reservations.component';
import { AdminUtilisateurFormComponent } from './components/admin-utilisateur-form/admin-utilisateur-form.component';
import { AdminVoyageAvisComponent } from './components/admin-voyage-avis/admin-voyage-avis.component';
import { AdminRecherchePlaceComponent } from './components/admin-recherche-place/admin-recherche-place.component';
import { PasswordResetComponent } from './components/password-reset/password-reset.component';


export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'inscription', component: InscriptionComponent },
  
  // 🔒 On verrouille l'accès aux visiteur normaux
  { path: 'recherche', component: RechercheComponent, canActivate: [authGuard] },
  { path: 'historique', component: HistoriqueComponent, canActivate: [authGuard] },
  { path: 'profil', component: ProfilComponent, canActivate: [authGuard] },
  { path: 'paiement/:reservationId/:prix', component: PaiementComponent, canActivate: [authGuard] },
  // 👉 NOUVELLE ROUTE POUR LE MOT DE PASSE OUBLIÉ (Accessible sans être connecté)
  { path: 'password-reset', component: PasswordResetComponent },
  
  { 
    path: 'admin', 
    component: AdminDashboardComponent, 
    children: [
      { path: '', redirectTo: 'voyages', pathMatch: 'full' },
      { path: 'voyages', component: AdminVoyagesComponent },
      { path: 'voyages/nouveau', component: AdminVoyageFormComponent },
      { path: 'voyages/:id', component: AdminVoyageFormComponent },
      { path: 'utilisateurs', component: AdminUtilisateursComponent },
      { path: 'utilisateurs/:id/avis', component: AdminUtilisateurAvisComponent },
      { path: 'voyages/:id/avis', component: AdminVoyageAvisComponent },
      { path: 'utilisateurs/:id/modifier', component: AdminUtilisateurFormComponent },
      // 👉 NOUVELLE ROUTE DE L'ÉTAPE D
      { path: 'utilisateurs/:id/reservations', component: AdminUtilisateurReservationsComponent },
      // 👉 NOUVELLE ROUTE : Recherche de passager par siège
      { path: 'recherche-place', component: AdminRecherchePlaceComponent }
    ]
  },
  
  { path: '**', redirectTo: 'login' },
];