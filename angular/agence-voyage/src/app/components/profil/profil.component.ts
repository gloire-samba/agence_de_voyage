import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UtilisateurService } from '../../services/utilisateur.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.css']
})
export class ProfilComponent implements OnInit {
  private utilisateurService = inject(UtilisateurService);
  private authService = inject(AuthService);

  // On récupère strictement l'ID de l'utilisateur connecté (1 pour l'invité)
  idActuel = this.authService.getUtilisateurActuel()?.id || 1;
  
  monProfil: any = { nom: '', email: '', motDePasse: '' };
  message: string = '';
  isLoading: boolean = true;

  ngOnInit() {
    this.chargerMonProfil();
  }

  chargerMonProfil() {
    this.utilisateurService.getUn(this.idActuel).subscribe({
      next: (data) => {
        // On ne pré-remplit pas le mot de passe pour des raisons de sécurité
        this.monProfil = { nom: data.nom, email: data.email, motDePasse: '' };
        this.isLoading = false;
      },
      error: (err) => {
        this.message = "❌ Impossible de charger vos informations.";
        this.isLoading = false;
      }
    });
  }

  sauvegarder() {
    this.isLoading = true;
    this.message = '';
    
    // L'utilisateur ne passe QUE son propre ID à la méthode modifier
    this.utilisateurService.modifier(this.idActuel, this.monProfil).subscribe({
      next: () => {
        this.message = "✅ Vos informations ont été mises à jour avec succès !";
        this.isLoading = false;
      },
      error: (err) => {
        this.message = "❌ Erreur lors de la mise à jour.";
        this.isLoading = false;
      }
    });
  }
}