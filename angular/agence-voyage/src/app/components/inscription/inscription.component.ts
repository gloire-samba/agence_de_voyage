import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-inscription',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './inscription.component.html',
  styleUrls: ['./inscription.component.css']
})
export class InscriptionComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // On a viré le pseudo, plus que l'email et le mot de passe !
  formData = {
    email: '',
    motDePasse: ''
  };

  messageErreur = '';

  onSubmit() {
    this.messageErreur = '';
    
    this.authService.register(this.formData).subscribe({
      next: () => {
        this.authService.login(this.formData.email, this.formData.motDePasse).subscribe({
          next: () => {
            this.router.navigate(['/recherche']);
          },
          error: () => {
            this.router.navigate(['/login']);
          }
        });
      },
      error: (err) => {
        this.messageErreur = err.error?.error || "Erreur lors de l'inscription. Vérifiez vos informations.";
      }
    });
  }
}