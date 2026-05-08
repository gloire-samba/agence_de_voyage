import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UtilisateurService } from '../../services/utilisateur.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-utilisateurs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-utilisateurs.component.html',
  styleUrls: ['../admin-voyages/admin-voyages.component.css'] 
})
export class AdminUtilisateursComponent implements OnInit {
  private utilisateurService = inject(UtilisateurService);
  private authService = inject(AuthService);
  private router = inject(Router);

  utilisateurs: any[] = [];
  idAdminActuel = this.authService.getUserId();

  // Outils de filtrage et tri
  texteRecherche: string = '';
  critereTri: string = 'id';
  triAscendant: boolean = true;

  ngOnInit() {
    this.chargerUtilisateurs();
  }

  chargerUtilisateurs() {
    this.utilisateurService.getTous().subscribe({
      next: (data: any) => {
        // 👉 LA CORRECTION EST ICI : Le "déballage" intelligent
        // On cherche le tableau là où il est caché (Django = results, Spring = content ou _embedded)
        const donneesBrutes = data?.results || data?.content || data?._embedded?.utilisateurs || data;
        
        // On s'assure que c'est bien un tableau pour éviter les crashs
        const listeComplete = Array.isArray(donneesBrutes) ? donneesBrutes : [];
        
        // On exclut l'admin actuel pour éviter qu'il ne se supprime lui-même
        this.utilisateurs = listeComplete.filter((u: any) => u.id !== this.idAdminActuel);
      },
      error: (err) => console.error("Erreur chargement utilisateurs", err)
    });
  }

  supprimerUtilisateur(id: number) {
    if (confirm("⚠️ Bannir définitivement cet utilisateur de la plateforme ? (Cette action détruira ses données non-liées).")) {
      this.utilisateurService.supprimer(id).subscribe({
        next: () => {
          alert('✅ Utilisateur supprimé.');
          this.chargerUtilisateurs();
        },
        error: () => alert("❌ Impossible de supprimer cet utilisateur (il a peut-être des réservations en cours).")
      });
    }
  }

  // Navigations via les Routes
  voirAvisUtilisateur(id: number) {
    this.router.navigate(['/admin/utilisateurs', id, 'avis']);
  }

  voirReservationsUtilisateur(id: number) {
    this.router.navigate(['/admin/utilisateurs', id, 'reservations']);
  }

  // Système de Tri
  changerTri(critere: string) {
    if (this.critereTri === critere) {
      this.triAscendant = !this.triAscendant;
    } else {
      this.critereTri = critere;
      this.triAscendant = true;
    }
  }

  // Filtrage et Tri en direct
  get utilisateursFiltres() {
    let resultats = this.utilisateurs.filter(u => {
      const recherche = this.texteRecherche.toLowerCase();
      const email = (u.email || '').toLowerCase();
      const role = (u.role || '').toLowerCase();
      return email.includes(recherche) || role.includes(recherche) || u.id.toString().includes(recherche);
    });

    resultats.sort((a, b) => {
      let valA = a[this.critereTri] || '';
      let valB = b[this.critereTri] || '';
      
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return this.triAscendant ? -1 : 1;
      if (valA > valB) return this.triAscendant ? 1 : -1;
      return 0;
    });

    return resultats;
  }

  modifierUtilisateur(id: number) {
    this.router.navigate(['/admin/utilisateurs', id, 'modifier']);
  }
}