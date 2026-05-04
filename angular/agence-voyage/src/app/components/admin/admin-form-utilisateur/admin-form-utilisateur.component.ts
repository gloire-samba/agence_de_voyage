import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UtilisateurService } from '../../../services/utilisateur.service';

@Component({
  selector: 'app-admin-form-utilisateur',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-form-utilisateur.component.html',
  styleUrls: ['./admin-form-utilisateur.component.css']
})
export class AdminFormUtilisateurComponent implements OnInit {
  @Input() utilisateurEnEdition: any = null;
  
  @Output() fermer = new EventEmitter<void>();
  @Output() sauvegardeOk = new EventEmitter<void>();

  private utilisateurService = inject(UtilisateurService);

  formUtilisateur = { nom: '', email: '', motDePasse: '', role: 'INVITE' };

  ngOnInit() {
    if (this.utilisateurEnEdition) {
      this.formUtilisateur = {
        nom: this.utilisateurEnEdition.nom,
        email: this.utilisateurEnEdition.email,
        motDePasse: '', // On ne précharge JAMAIS le mot de passe
        role: this.utilisateurEnEdition.role || 'INVITE'
      };
    }
  }

  sauvegarder() {
    // Si c'est une modification, on retire la clé motDePasse pour ne pas écraser l'ancien
    let payload: any = {
      nom: this.formUtilisateur.nom,
      email: this.formUtilisateur.email,
      role: this.formUtilisateur.role
    };

    if (!this.utilisateurEnEdition) {
      payload.motDePasse = this.formUtilisateur.motDePasse;
    }

    if (this.utilisateurEnEdition) {
      this.utilisateurService.modifier(this.utilisateurEnEdition.id, payload).subscribe({
        next: () => this.sauvegardeOk.emit(),
        error: (err) => alert("Erreur lors de la modification.")
      });
    } else {
      this.utilisateurService.creer(payload).subscribe({
        next: () => this.sauvegardeOk.emit(),
        error: (err) => alert("Erreur lors de la création.")
      });
    }
  }
}