import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { ServeurService } from './serveur.service';
import { Reservation } from '../models/reservation';


@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private http = inject(HttpClient);
  private serveurService = inject(ServeurService);

  private get baseUrl(): string {
    const backend = this.serveurService.getBackend();
    return `${environment.urls[backend]}/reservations`;
  }

  getHistoriqueUtilisateur(utilisateurId: number): Observable<Reservation[]> {
    const url = this.serveurService.getBackend() === 'spring'
      ? `${this.baseUrl}/utilisateur/${utilisateurId}`
      : `${this.baseUrl}/utilisateur/${utilisateurId}/`;
    return this.http.get<Reservation[]>(url);
  }

  creerReservation(reservation: Partial<Reservation>): Observable<Reservation> {
    const url = this.serveurService.getBackend() === 'spring'
      ? this.baseUrl
      : `${this.baseUrl}/`;
    return this.http.post<Reservation>(url, reservation);
  }

  confirmerPaiement(reservationId: number): Observable<Reservation> {
    const url = this.serveurService.getBackend() === 'spring'
      ? `${this.baseUrl}/${reservationId}/confirmer`
      : `${this.baseUrl}/${reservationId}/confirmer/`;
    return this.http.post<Reservation>(url, {});
  }

  annulerReservation(reservationId: number): Observable<Reservation> {
    const url = this.serveurService.getBackend() === 'spring'
      ? `${this.baseUrl}/${reservationId}/annuler`
      : `${this.baseUrl}/${reservationId}/annuler/`;
    
    // On utilise POST au lieu de DELETE pour signifier un changement d'état métier
    return this.http.post<Reservation>(url, {});
  }

  modifierReservation(id: number, donnees: any): Observable<any> {
    const backend = this.serveurService.getBackend();
    let url = `${environment.urls[backend]}/reservations/${id}`;
    
    // Ajout du slash final obligatoire pour Django
    if (backend === 'django') {
      url += '/';
    }
    
    return this.http.put<any>(url, donnees);
  }

  // Récupérer le catalogue complet des réservations (Pour l'Admin)
  getToutes(): Observable<any[]> {
    const backend = this.serveurService.getBackend();
    const url = backend === 'django' ? `${this.baseUrl}/` : this.baseUrl;
    return this.http.get<any[]>(url);
  }
}