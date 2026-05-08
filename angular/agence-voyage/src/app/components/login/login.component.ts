import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ServeurService } from '../../services/serveur.service'; // Indispensable pour le sélecteur HTML

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  // Doivent être "public" pour être utilisés directement dans le HTML
  public authService = inject(AuthService);
  public serveurService = inject(ServeurService);
  private router = inject(Router);
  public route = inject(ActivatedRoute); // 👉 Injection pour lire l'URL

  isLoginMode = true; 
  hidePassword = true;
  
  formData = {
    pseudo: '',
    email: '',
    motDePasse: ''
  };

  messageErreur = '';
  messageSucces = '';

  // 👉 NOUVEAU : Intercepte le retour des serveurs sociaux
  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['token']) {
        const token = params['token'];
        const id = params['id'] || '0';
        const role = params['role'] || 'ROLE_USER';
        const email = params['email'] || 'social_user@voyage.com';

        // On sauvegarde le token et on redirige
        this.authService.sauvegarderSession(token, role, email, id);

        if (role === 'ROLE_ADMIN') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/recherche']);
        }
      }
    });
  }

  // Bascule entre "Se connecter" et "S'inscrire"
  basculerMode() {
    this.isLoginMode = !this.isLoginMode;
    this.messageErreur = '';
    this.messageSucces = '';
  }

  // Affiche ou masque le mot de passe
  togglePasswordVisibility() {
    this.hidePassword = !this.hidePassword;
  }

  onSubmit() {
    this.messageErreur = '';
    this.messageSucces = '';

    if (this.isLoginMode) {
      // --- LOGIQUE DE CONNEXION ---
      this.authService.login(this.formData.email, this.formData.motDePasse).subscribe({
        next: (res) => {
          if (res.role === 'ROLE_ADMIN') {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/recherche']);
          }
        },
        error: () => {
          this.messageErreur = "Identifiants incorrects.";
        }
      });
    } else {
      // --- LOGIQUE D'INSCRIPTION ---
      this.authService.register(this.formData).subscribe({
        next: () => {
          this.messageSucces = "Inscription réussie ! Vous pouvez vous connecter.";
          this.isLoginMode = true; // On repasse sur le formulaire de connexion
          this.formData.motDePasse = ''; // On vide le mot de passe par sécurité
        },
        error: (err) => {
          this.messageErreur = err.error?.error || "Erreur lors de l'inscription.";
        }
      });
    }
  }

  loginAsAdmin() {
    this.isLoginMode = true; // S'assure qu'on est bien en mode connexion
    this.formData.email = 'admin@voyage.com';
    this.formData.motDePasse = 'admin123';
    this.onSubmit();
  }

  connexionSociale(fournisseur: 'google' | 'github') {
    const baseUrl = this.authService.getBaseUrl(); 
    const backend = this.serveurService.getBackend();

    if (backend === 'django') {
      // Pour Django, l'URL est : http://localhost:8000/api/auth/google/login/
      window.location.href = `${baseUrl}/auth/${fournisseur}/login/`;
    } else {
      // Pour Spring, l'URL est : http://localhost:8080/oauth2/authorization/google (sans le /api)
      const springBaseUrl = baseUrl.replace('/api', '');
      window.location.href = `${springBaseUrl}/oauth2/authorization/${fournisseur}`;
    }
  }
}