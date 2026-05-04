import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AvisService } from '../../../services/avis.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-list-avis',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './list-avis.component.html',
  styleUrls: ['./list-avis.component.css']
})
export class ListAvisComponent implements OnInit {
  private avisService = inject(AvisService);
  private authService = inject(AuthService);

  avisList: any[] = [];
  
  // On récupère l'ID de l'admin pour pouvoir filtrer ses propres avis
  idAdminConnecte = this.authService.getUtilisateurActuel()?.id || 2;

  ngOnInit() {
    this.chargerAvis();
  }

  // Fonction utilitaire pour extraire l'ID de l'auteur (compatible avec les formats Spring et Django)
  getAuteurId(avis: any): number {
    return avis.utilisateur?.id || avis.utilisateur_id || avis.utilisateur;
  }

  // Fonction utilitaire pour extraire le nom de l'auteur s'il est fourni par l'API
  getAuteurNom(avis: any): string {
    return avis.utilisateur?.nom || `Client #${this.getAuteurId(avis)}`;
  }

  chargerAvis() {
    this.avisService.getTous().subscribe({
      next: (data) => {
        // APPLICATION DE TA RÈGLE : On filtre pour cacher les avis de l'admin
        this.avisList = data.filter((a: any) => this.getAuteurId(a) !== this.idAdminConnecte);
      },
      error: (err) => console.error("Erreur de chargement des avis", err)
    });
  }

  supprimer(id: number) {
    if (confirm("Supprimer cet avis de la plateforme ? (Modération)")) {
      this.avisService.supprimer(id).subscribe({
        next: () => this.chargerAvis(),
        error: () => alert("Impossible de supprimer cet avis.")
      });
    }
  }
}