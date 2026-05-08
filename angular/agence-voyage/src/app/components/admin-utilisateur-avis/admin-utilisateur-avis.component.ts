import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AvisService } from '../../services/avis.service';

@Component({
  selector: 'app-admin-utilisateur-avis',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-utilisateur-avis.component.html',
  styleUrls: ['../admin-voyages/admin-voyages.component.css']
})
export class AdminUtilisateurAvisComponent implements OnInit {
  private avisService = inject(AvisService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  utilisateurId!: number;
  avisList: any[] = [];
  isLoading = true;

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.utilisateurId = Number(idParam);
      this.chargerAvisUtilisateur();
    }
  }

  chargerAvisUtilisateur() {
    this.isLoading = true;
    this.cdr.detectChanges();

    // 👉 Retour à la source : L'API nous donne enfin les bons auteurs !
    this.avisService.getTous().subscribe({
      next: (data: any) => {
        try {
          const donneesBrutes = data?.results || data?.content || data?._embedded?.avis || data;
          const tousLesAvis = Array.isArray(donneesBrutes) ? donneesBrutes : [];

          this.avisList = tousLesAvis.filter((a: any) => {
            const authorId = this.getAuteurId(a);
            return Number(authorId) === Number(this.utilisateurId);
          });
        } finally {
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.avisList = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getAuteurId(avis: any): number {
    return avis.utilisateur?.id || avis.utilisateur_id || avis.utilisateur;
  }

  supprimerAvis(id: number) {
    if (confirm("Supprimer définitivement cet avis pour non-respect des règles ?")) {
      this.avisService.supprimer(id).subscribe({
        next: () => {
          alert('✅ Avis censuré.');
          this.chargerAvisUtilisateur();
        },
        error: () => alert("❌ Erreur lors de la suppression de l'avis.")
      });
    }
  }

  retour() {
    this.router.navigate(['/admin/utilisateurs']);
  }
}