import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ServeurService } from '../../services/serveur.service'; 

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  public authService = inject(AuthService);
  public serveurService = inject(ServeurService);
  private router = inject(Router);
  public route = inject(ActivatedRoute); 
  private cdr = inject(ChangeDetectorRef);

  isLoginMode = true; 
  hidePassword = true;
  
  formData = {
    pseudo: '',
    email: '',
    motDePasse: ''
  };

  messageErreur = '';
  messageSucces = '';

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['token']) {
        const token = params['token'];
        const id = params['id'] || '0';
        const role = params['role'] || 'ROLE_USER';
        const email = params['email'] || 'social_user@voyage.com';

        this.authService.sauvegarderSession(token, role, email, id);

        // 👉 CORRECTION : Accepte les formats Spring ET Django
        if (role === 'ROLE_ADMIN' || role === 'ADMIN') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/recherche']);
        }
      }
    });
  }

  basculerMode() {
    this.isLoginMode = !this.isLoginMode;
    this.messageErreur = '';
    this.messageSucces = '';
  }

  togglePasswordVisibility() {
    this.hidePassword = !this.hidePassword;
  }

  onSubmit() {
    this.messageErreur = '';
    this.messageSucces = '';

    if (this.isLoginMode) {
      this.authService.login(this.formData.email, this.formData.motDePasse).subscribe({
        next: (res) => {
          // 👉 CORRECTION : Accepte les formats Spring ET Django
          if (res.role === 'ROLE_ADMIN' || res.role === 'ADMIN') {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/recherche']);
          }
        },
        error: () => {
          this.messageErreur = "Identifiants incorrects.";
          this.cdr.detectChanges(); 
        }
      });
    } else {
      this.authService.register(this.formData).subscribe({
        next: () => {
          this.messageSucces = "Inscription réussie ! Vous pouvez vous connecter.";
          this.isLoginMode = true; 
          this.formData.motDePasse = ''; 
        },
        error: (err) => {
          this.messageErreur = err.error?.error || "Erreur lors de l'inscription.";
        }
      });
    }
  }

  loginAsAdmin() {
    this.isLoginMode = true; 
    this.formData.email = 'admin@voyage.com';
    this.formData.motDePasse = 'admin123';
    this.onSubmit();
  }

  connexionSociale(fournisseur: 'google' | 'github') {
    const baseUrl = this.authService.getBaseUrl(); 
    const backend = this.serveurService.getBackend();

    if (backend === 'django') {
      // Pour Django, le paramètre 'state' est géré directement dans views.py
      window.location.href = `${baseUrl}/auth/${fournisseur}/login/?frontend=angular`;
    } else {
      // 👉 MODIFICATION ICI : Angular utilise désormais aussi le contrôleur d'initialisation de Spring
      window.location.href = `${baseUrl}/auth/init-social?fournisseur=${fournisseur}&frontend=angular`;
    }
  }
}