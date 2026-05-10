import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { ServeurService } from '../../services/serveur.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-password-reset',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './password-reset.component.html',
  styleUrls: ['./password-reset.component.css']
})
export class PasswordResetComponent {
  private http = inject(HttpClient);
  private serveurService = inject(ServeurService);
  private authService = inject(AuthService); // Pour récupérer l'URL de base proprement
  private cdr = inject(ChangeDetectorRef); // 👉 Le "marteau" pour forcer l'affichage

  email = '';
  messageErreur = '';
  messageSucces = '';
  isLoading = false;
  afficherBoutonInscription = false;

  demanderMotDePasse() {
    if (!this.email) return;
    
    this.isLoading = true;
    this.messageErreur = '';
    this.messageSucces = '';
    this.afficherBoutonInscription = false;

    // Récupération propre de l'URL (ex: http://localhost:8080/api)
    const baseUrl = this.authService.getBaseUrl(); 
    const isDjango = baseUrl.includes('8000');
    
    // 👉 CORRECTION : On évite de doubler le "/api/" qui causait l'erreur 401 sur Spring !
    const url = isDjango ? `${baseUrl}/auth/check-email/` : `${baseUrl}/auth/check-email`;
    
    this.http.post(url, { email: this.email }).subscribe({
      next: () => {
        this.isLoading = false;
        // Le message s'affichera dans l'encadré vert grâce à la classe .success de ton CSS
        this.messageSucces = "✅ Un e-mail contenant votre mot de passe vient de vous être envoyé ! Vérifiez votre boîte de réception.";
        this.cdr.detectChanges(); // 👉 Force Angular à afficher le message vert immédiatement
      },
      error: () => {
        this.isLoading = false;
        this.messageErreur = "Cette adresse e-mail n'est pas reconnue dans notre base de données.";
        this.afficherBoutonInscription = true;
        this.cdr.detectChanges(); // 👉 Force Angular à afficher l'erreur immédiatement
      }
    });
  }

  reessayer() {
    this.afficherBoutonInscription = false;
    this.messageErreur = '';
    this.email = '';
    this.cdr.detectChanges();
  }
}