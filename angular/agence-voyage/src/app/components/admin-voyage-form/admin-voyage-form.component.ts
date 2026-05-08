import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { VoyageService } from '../../services/voyage.service';
import { SegmentService } from '../../services/segment.service';
import { ServeurService } from '../../services/serveur.service'; // 👉 NOUVEL IMPORT

@Component({
  selector: 'app-admin-voyage-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-voyage-form.component.html',
  styleUrls: ['./admin-voyage-form.component.css']
})
export class AdminVoyageFormComponent implements OnInit {
  private voyageService = inject(VoyageService);
  private segmentService = inject(SegmentService);
  private serveurService = inject(ServeurService); // 👉 INJECTION
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  voyageId: number | null = null;
  segmentsExistants: any[] = [];
  isLoading = true;

  formVoyage = { 
    villeDepart: '', villeArrivee: '', prixTotal: 0, statut: 'A_VENIR', segmentsIds: [] as number[] 
  };

  ngOnInit() {
    this.segmentService.getTous().subscribe({
      next: (data: any) => {
        try {
          const donneesBrutes = data?.results || data?.content || data?._embedded?.segments || data;
          this.segmentsExistants = Array.isArray(donneesBrutes) ? donneesBrutes : [];
          
          const idParam = this.route.snapshot.paramMap.get('id');
          if (idParam) {
            this.voyageId = Number(idParam);
            this.chargerVoyage(this.voyageId);
          } else {
            this.isLoading = false; 
            this.cdr.detectChanges(); 
          }
        } catch(e) {
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      },
      error: () => { this.isLoading = false; this.cdr.detectChanges(); }
    });
  }

  chargerVoyage(id: number) {
    this.voyageService.getTousLesVoyages().subscribe({
      next: (data: any) => {
        try {
          const donneesBrutes = data?.results || data?.content || data?._embedded?.voyages || data;
          const voyages = Array.isArray(donneesBrutes) ? donneesBrutes : [];
          const voyage = voyages.find((v: any) => v.id === id);
          
          if (voyage) {
            this.formVoyage = {
              villeDepart: voyage.villeDepart || (voyage as any).ville_depart || '',
              villeArrivee: voyage.villeArrivee || (voyage as any).ville_arrivee || '',
              prixTotal: voyage.prixTotal || (voyage as any).prix_total || 0,
              statut: voyage.statut || 'A_VENIR',
              segmentsIds: voyage.segments ? voyage.segments.map((s: any) => s.id) : []
            };
          }
        } finally {
          this.isLoading = false;
          this.cdr.detectChanges(); 
        }
      },
      error: () => { this.isLoading = false; this.cdr.detectChanges(); }
    });
  }

  toggleSegment(segmentId: number) {
    const index = this.formVoyage.segmentsIds.indexOf(segmentId);
    if (index > -1) {
      this.formVoyage.segmentsIds.splice(index, 1);
    } else {
      this.formVoyage.segmentsIds.push(segmentId);
    }
  }

  sauvegarder() {
    const backend = this.serveurService.getBackend();
    
    // Formatage des segments
    const segmentsFormates = backend === 'spring' 
      ? this.formVoyage.segmentsIds.map(id => ({ id: id })) 
      : this.formVoyage.segmentsIds;

    // 👉 LA MAGIE EST ICI : On crée le payload avec la grammaire exacte du serveur !
    const payload = backend === 'spring' ? {
      villeDepart: this.formVoyage.villeDepart,
      villeArrivee: this.formVoyage.villeArrivee,
      prixTotal: this.formVoyage.prixTotal,
      statut: this.formVoyage.statut,
      segments: segmentsFormates
    } : {
      ville_depart: this.formVoyage.villeDepart,
      ville_arrivee: this.formVoyage.villeArrivee,
      prix_total: this.formVoyage.prixTotal,
      statut: this.formVoyage.statut,
      segments: segmentsFormates
    };

    const requete = this.voyageId 
      ? this.voyageService.modifierVoyage(this.voyageId, payload)
      : this.voyageService.creerVoyage(payload);

    requete.subscribe({
      next: () => this.router.navigate(['/admin/voyages']),
      error: () => alert("Erreur lors de la sauvegarde du voyage.")
    });
  }

  annuler() {
    this.router.navigate(['/admin/voyages']);
  }
}