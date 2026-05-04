import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UtilisateurService } from '../../../services/utilisateur.service';
import { AuthService } from '../../../services/auth.service';
import { AdminFormUtilisateurComponent } from '../admin-form-utilisateur/admin-form-utilisateur.component';
import { ListReservationsComponent } from '../list-reservations/list-reservations.component';

@Component({
  selector: 'app-list-utilisateurs',
  standalone: true,
  imports: [CommonModule, AdminFormUtilisateurComponent, ListReservationsComponent],
  templateUrl: './list-utilisateurs.component.html',
  styleUrls: ['./list-utilisateurs.component.css']
})
export class ListUtilisateursComponent implements OnInit {
  private utilisateurService = inject(UtilisateurService);
  private authService = inject(AuthService);

  idAdminConnecte = this.authService.getUtilisateurActuel()?.id || 2;
  utilisateurs: any[] = [];
  
  afficherFormulaire = false;
  utilisateurSelectionne: any = null;

  // Si on sélectionne un utilisateur pour voir ses réservations, on stocke ici
  utilisateurPourResa: any = null;

  ngOnInit() {
    this.chargerUtilisateurs();
  }

  chargerUtilisateurs() {
    this.utilisateurService.getTous().subscribe({
      next: (data) => {
        // Règle métier : On exclut l'admin connecté de la liste
        this.utilisateurs = data.filter((u: any) => u.id !== this.idAdminConnecte);
      }
    });
  }

  supprimer(id: number) {
    if (confirm("Supprimer définitivement cet utilisateur ?")) {
      this.utilisateurService.supprimer(id).subscribe({
        next: () => this.chargerUtilisateurs(),
        error: () => alert("Impossible de supprimer cet utilisateur.")
      });
    }
  }

  ouvrirCreation() {
    this.utilisateurSelectionne = null;
    this.afficherFormulaire = true;
  }

  ouvrirModification(user: any) {
    this.utilisateurSelectionne = user;
    this.afficherFormulaire = true;
  }

  onSauvegardeReussie() {
    this.afficherFormulaire = false;
    this.chargerUtilisateurs();
  }

  // Bascule vers la vue Réservations
  voirReservations(user: any) {
    this.utilisateurPourResa = user;
  }

  retourListeUtilisateurs() {
    this.utilisateurPourResa = null;
  }
}