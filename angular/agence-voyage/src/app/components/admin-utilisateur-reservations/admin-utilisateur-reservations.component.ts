import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ReservationService } from '../../services/reservation.service';
import { VoyageService } from '../../services/voyage.service';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { ServeurService } from '../../services/serveur.service';

@Component({
  selector: 'app-admin-utilisateur-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-utilisateur-reservations.component.html',
  styleUrls: ['../admin-voyages/admin-voyages.component.css']
})
export class AdminUtilisateurReservationsComponent implements OnInit {
  private reservationService = inject(ReservationService);
  private voyageService = inject(VoyageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private serveurService = inject(ServeurService);

  utilisateurId!: number;
  reservations: any[] = [];
  isLoading = true;

  // 👉 GESTION DE L'ÉCHANGE
  reservationAEchanger: any = null;
  voyagesDisponibles: any[] = [];
  
  // 👉 FILTRES POUR LE CATALOGUE D'ÉCHANGE
  filtreDepart: string = '';
  filtreArrivee: string = '';
  filtreDate: string = '';
  texteRecherche: string = '';
  
  // 👉 NOUVEAU : Filtre manuel des places
  filtrePlaces: number | null = null;

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.utilisateurId = Number(idParam);
      this.chargerDonnees();
    }
  }

  chargerDonnees() {
    this.isLoading = true;
    this.reservationService.getHistoriqueUtilisateur(this.utilisateurId).subscribe({
      next: (data: any) => {
        const donneesBrutes = data?.results || data?.content || data?._embedded?.reservations || data;
        this.reservations = Array.isArray(donneesBrutes) ? donneesBrutes : [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.reservations = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  annulerReservation(id: number) {
    if (confirm("🚨 Voulez-vous vraiment annuler ce billet et rembourser le client ?")) {
       this.reservationService.annulerReservation(id).subscribe({
         next: () => {
           alert("✅ Billet annulé et client remboursé (Mail envoyé).");
           this.chargerDonnees();
         },
         error: () => alert("❌ Erreur lors de l'annulation.")
       });
    }
  }

  preparerEchange(res: any) {
    this.reservationAEchanger = res;
    // On charge le catalogue des voyages disponibles
    this.voyageService.getTousLesVoyages().subscribe((vData: any) => {
      const voyagesBruts = vData?.results || vData?.content || vData?._embedded?.voyages || vData;
      this.voyagesDisponibles = Array.isArray(voyagesBruts) ? voyagesBruts : [];
      this.cdr.detectChanges();
      // On scroll vers la section d'échange
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
    });
  }

  annulerEchange() {
    this.reservationAEchanger = null;
    this.filtrePlaces = null; // On réinitialise le filtre
  }

  // 👉 NOUVEAU : Récupère le nombre de places exact du dossier client
  getNbPlacesAEchanger(): number {
    if (!this.reservationAEchanger) return 1;
    return this.reservationAEchanger.billets?.length || 1;
  }

  validerEchange(nouveauVoyageId: number) {
    if (confirm("🔄 Confirmer l'échange vers ce nouveau vol ?")) {
      const baseUrl = this.authService.getBaseUrl();
      const isDjango = this.serveurService.getBackend() === 'django';
      const url = `${baseUrl}/reservations/${this.reservationAEchanger.id}/echanger${isDjango ? '/' : ''}`;

      const payload = { nouveauVoyageId: Number(nouveauVoyageId) };

      this.http.post(url, payload).subscribe({
        next: () => {
          alert("✅ Échange réussi ! Un nouveau billet a été généré et envoyé au client.");
          this.reservationAEchanger = null;
          this.filtrePlaces = null;
          this.chargerDonnees();
        },
        error: (err) => {
          const message = err.error?.erreur || err.error?.error || "Erreur serveur";
          alert("❌ Échec de l'échange : " + message);
        }
      });
    }
  }

  get voyagesFiltres() {
    return this.voyagesDisponibles.filter(v => {
      // 1. Uniquement les voyages "A_VENIR"
      const statut = (v.statut || (v as any).statut || 'A_VENIR').toUpperCase();
      if (statut !== 'A_VENIR') return false;

      // 2. Uniquement si le nombre de places est supérieur à 0
      const places = (v.placesRestantes !== undefined) ? v.placesRestantes : (v as any).places_restantes;
      if (places <= 0) return false;
      
      // 👉 3. NOUVEAU : Le filtre dynamique renseigné par l'admin
      if (this.filtrePlaces !== null && places < this.filtrePlaces) return false;

      const depart = (v.villeDepart || (v as any).ville_depart || '').toLowerCase();
      const arrivee = (v.villeArrivee || (v as any).ville_arrivee || '').toLowerCase();
      const globale = this.texteRecherche.toLowerCase();

      const matchGlobal = !this.texteRecherche || depart.includes(globale) || arrivee.includes(globale) || v.id.toString() === globale;
      const matchDepart = !this.filtreDepart || depart.includes(this.filtreDepart.toLowerCase());
      const matchArrivee = !this.filtreArrivee || arrivee.includes(this.filtreArrivee.toLowerCase());
      
      let matchDate = true;
      if (this.filtreDate && v.segments && v.segments.length > 0) {
        const heureDep = v.segments[0].heureDepart || v.segments[0].heure_depart || '';
        matchDate = heureDep.startsWith(this.filtreDate);
      }

      return matchGlobal && matchDepart && matchArrivee && matchDate;
    });
  }

  retour() {
    this.router.navigate(['/admin/utilisateurs']);
  }
}