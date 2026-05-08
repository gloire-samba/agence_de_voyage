import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AvisService } from '../../services/avis.service';

@Component({
  selector: 'app-admin-voyage-avis',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-voyage-avis.component.html',
  styleUrls: ['../admin-voyages/admin-voyages.component.css']
})
export class AdminVoyageAvisComponent implements OnInit {
  private avisService = inject(AvisService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  voyageId!: number;
  avisList: any[] = [];
  isLoading = true;

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.voyageId = Number(idParam);
      this.chargerAvisVoyage();
    }
  }

  chargerAvisVoyage() {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.avisService.getTous().subscribe({
      next: (data: any) => {
        try {
          const donneesBrutes = data?.results || data?.content || data?._embedded?.avis || data;
          const tousLesAvis = Array.isArray(donneesBrutes) ? donneesBrutes : [];
          
          this.avisList = tousLesAvis.filter((a: any) => this.getVoyageId(a) === this.voyageId);
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

  getVoyageId(avis: any): number {
    return avis.voyage?.id || avis.voyage_id || avis.voyage;
  }

  supprimerAvis(id: number) {
    if (confirm("Censurer définitivement cet avis ?")) {
      this.avisService.supprimer(id).subscribe({
        next: () => { alert('✅ Avis supprimé.'); this.chargerAvisVoyage(); },
        error: () => alert("❌ Erreur lors de la suppression.")
      });
    }
  }

  retour() { this.router.navigate(['/admin/voyages']); }
}