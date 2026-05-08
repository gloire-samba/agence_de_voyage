import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core'; // 👉 Ajout
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UtilisateurService } from '../../services/utilisateur.service';

@Component({
  selector: 'app-admin-utilisateur-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-utilisateur-form.component.html',
  styleUrls: ['../admin-voyages/admin-voyages.component.css'] 
})
export class AdminUtilisateurFormComponent implements OnInit {
  private utilisateurService = inject(UtilisateurService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef); // 👉 L'outil magique

  utilisateurId!: number;
  isLoading = true;
  formUtilisateur = { email: '', role: 'ROLE_USER' };

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.utilisateurId = Number(idParam);
      this.chargerUtilisateur();
    }
  }

  chargerUtilisateur() {
    this.utilisateurService.getUn(this.utilisateurId).subscribe({
      next: (data: any) => {
        this.formUtilisateur = {
          email: data.email,
          role: data.role || 'ROLE_USER'
        };
        this.isLoading = false;
        this.cdr.detectChanges(); // 👉 Force l'affichage
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
        alert("Erreur lors de la récupération de l'utilisateur.");
        this.retour();
      }
    });
  }

  sauvegarder() {
    this.utilisateurService.modifier(this.utilisateurId, this.formUtilisateur).subscribe({
      next: () => {
        alert("✅ Utilisateur modifié avec succès.");
        this.retour();
      },
      error: () => alert("❌ Erreur lors de la modification.")
    });
  }

  retour() {
    this.router.navigate(['/admin/utilisateurs']);
  }
}