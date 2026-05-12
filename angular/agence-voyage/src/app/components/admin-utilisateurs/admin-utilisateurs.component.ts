import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common'; // Injection DatePipe pour le HTML
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

  // 👉 NOUVEAUX OUTILS DE FILTRAGE
  texteRecherche: string = '';
  filtreEmail: string = '';
  filtreRole: string = '';
  filtreDateInscription: string = '';

  critereTri: string = 'id';
  triAscendant: boolean = true;

  ngOnInit() {
    this.chargerUtilisateurs();
  }

  chargerUtilisateurs() {
    this.utilisateurService.getTous().subscribe({
      next: (data: any) => {
        const donneesBrutes = data?.results || data?.content || data?._embedded?.utilisateurs || data;
        const listeComplete = Array.isArray(donneesBrutes) ? donneesBrutes : [];
        this.utilisateurs = listeComplete.filter((u: any) => u.id !== this.idAdminActuel);
      },
      error: (err) => console.error("Erreur chargement utilisateurs", err)
    });
  }

  supprimerUtilisateur(id: number) {
    if (confirm("⚠️ Bannir définitivement cet utilisateur de la plateforme ? (Cette action détruira ses données non-liées).")) {
      this.utilisateurService.supprimer(id).subscribe({
        next: () => { alert('✅ Utilisateur supprimé.'); this.chargerUtilisateurs(); },
        error: () => alert("❌ Impossible de supprimer cet utilisateur (il a peut-être des réservations en cours).")
      });
    }
  }

  voirAvisUtilisateur(id: number) { this.router.navigate(['/admin/utilisateurs', id, 'avis']); }
  voirReservationsUtilisateur(id: number) { this.router.navigate(['/admin/utilisateurs', id, 'reservations']); }
  modifierUtilisateur(id: number) { this.router.navigate(['/admin/utilisateurs', id, 'modifier']); }

  changerTri(critere: string) {
    if (this.critereTri === critere) {
      this.triAscendant = !this.triAscendant;
    } else {
      this.critereTri = critere;
      this.triAscendant = true;
    }
  }

  // 👉 LA NOUVELLE LOGIQUE DE FILTRAGE
  get utilisateursFiltres() {
    let resultats = this.utilisateurs.filter(u => {
      const email = (u.email || '').toLowerCase();
      const role = (u.role || '').toLowerCase();
      const rechercheGlobale = this.texteRecherche.toLowerCase();

      // 1. Vérification Globale
      const matchGlobal = !this.texteRecherche || 
                          email.includes(rechercheGlobale) || 
                          role.includes(rechercheGlobale) || 
                          u.id.toString().includes(rechercheGlobale);

      // 2. Vérifications Spécifiques
      const matchEmail = !this.filtreEmail || email.includes(this.filtreEmail.toLowerCase());
      const matchRole = !this.filtreRole || role.includes(this.filtreRole.toLowerCase());
      
      // 3. Vérification Date
      let matchDate = true;
      if (this.filtreDateInscription) {
        const dateInscrit = u.dateInscription || u.date_inscription || '';
        matchDate = dateInscrit.startsWith(this.filtreDateInscription);
      }

      return matchGlobal && matchEmail && matchRole && matchDate;
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
}