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
  private cdr = inject(ChangeDetectorRef); // 👉 Le marteau pour forcer l'affichage

  idActuel = this.authService.getUserId();
  monProfil: any = { email: '', motDePasse: '' };
  message: string = '';
  isLoading: boolean = true;

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
        this.cdr.detectChanges(); // Force la disparition du "Chargement..."
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
    
    // On n'envoie que ce qui a été modifié pour éviter l'erreur 400 (Bad Request)
    const payload: any = { email: this.monProfil.email };
    if (this.monProfil.motDePasse && this.monProfil.motDePasse.trim() !== '') {
       payload.motDePasse = this.monProfil.motDePasse;
    }

    // 👉 On utilise PATCH au lieu de PUT !
    this.http.patch(this.getUrl(), payload).subscribe({
      next: () => {
        this.message = "✅ Profil mis à jour !";
        this.isLoading = false;
        this.monProfil.motDePasse = ''; // On vide le champ par sécurité
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