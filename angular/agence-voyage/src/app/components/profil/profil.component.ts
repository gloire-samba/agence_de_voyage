import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.css']
})
export class ProfilComponent implements OnInit {
  private http = inject(HttpClient);
  public authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  idActuel = this.authService.getUserId();
  monProfil: any = { email: '', motDePasse: '' };
  message: string = '';
  isLoading: boolean = true;
  
  // 👉 NOUVEAU : Gestion du petit oeil
  hidePassword = true; 
  togglePasswordVisibility() {
    this.hidePassword = !this.hidePassword;
  }

  ngOnInit() {
    this.chargerMonProfil();
  }

  private getUrl(): string {
    const baseUrl = this.authService.getBaseUrl(); 
    const isDjango = baseUrl.includes('8000');
    return `${baseUrl}/utilisateurs/${this.idActuel}${isDjango ? '/' : ''}`;
  }

  chargerMonProfil() {
    this.isLoading = true;
    this.http.get<any>(this.getUrl()).subscribe({
      next: (data) => {
        this.monProfil = { email: data.email, motDePasse: '' };
        this.isLoading = false;
        this.cdr.detectChanges(); 
      },
      error: (err) => {
        this.message = "❌ Impossible de charger vos informations.";
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  sauvegarder() {
    this.isLoading = true;
    this.message = '';
    
    const payload: any = { email: this.monProfil.email };
    if (this.monProfil.motDePasse && this.monProfil.motDePasse.trim() !== '') {
       payload.motDePasse = this.monProfil.motDePasse;
    }

    this.http.patch(this.getUrl(), payload).subscribe({
      next: () => {
        this.message = "✅ Profil mis à jour !";
        this.isLoading = false;
        this.monProfil.motDePasse = ''; 
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.message = "❌ Erreur lors de la mise à jour.";
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }
}