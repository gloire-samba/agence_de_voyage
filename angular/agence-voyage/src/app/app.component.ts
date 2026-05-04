import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { BackendType, ServeurService } from './services/serveur.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive], 
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private serveurService = inject(ServeurService);
  private router = inject(Router);
  
  // Rendu public pour l'utiliser directement dans le HTML
  authService = inject(AuthService);

  serveurActif: BackendType = this.serveurService.getBackend();

  changerServeur(backend: BackendType) {
    this.serveurService.setBackend(backend);
    window.location.href = '/'; 
  }

  allerAuDashboard() {
    this.router.navigate(['/admin/dashboard']);
  }

  deconnexion() {
    this.authService.deconnexion();
    this.router.navigate(['/login']);
  }
}