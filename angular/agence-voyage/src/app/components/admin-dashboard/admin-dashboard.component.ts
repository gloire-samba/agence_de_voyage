import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router'; // NOUVEAUX IMPORTS
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet], // On importe le routeur ici
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Plus de variables "ongletActif" ou de tableaux de données ici ! 

  deconnexion() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}