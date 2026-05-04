import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  seConnecterEnTantQue(role: 'INVITE' | 'ADMIN') {
    if (role === 'INVITE') {
      this.authService.connexionInvite();
      // On le renvoie vers l'interface actuelle
      this.router.navigate(['/recherche']); 
    } else {
      this.authService.connexionAdmin();
      // On le renvoie vers le futur back-office admin
      this.router.navigate(['/admin/dashboard']); 
    }
  }
}