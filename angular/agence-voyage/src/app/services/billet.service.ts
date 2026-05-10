import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { ServeurService } from './serveur.service';
import { Billet } from '../models/billet';
import { Reservation } from '../models/reservation';

@Injectable({
  providedIn: 'root'
})
export class BilletService {
  private http = inject(HttpClient);
  private serveurService = inject(ServeurService);

  private get baseUrl() {
    const backend = this.serveurService.getBackend();
    return `${environment.urls[backend]}/billets`;
  }

  // 1. Pour l'admin : lister tous les billets du système
  getTousLesBillets(): Observable<Billet[]> {
    const url = this.serveurService.getBackend() === 'django' ? `${this.baseUrl}/` : this.baseUrl;
    return this.http.get<Billet[]>(url);
  }

  // 2. Pour le client : voir ses propres billets
  getMesBillets(): Observable<Billet[]> {
    // Si tu as besoin d'une route spécifique, sinon getTousLesBillets suffit car le backend filtre déjà selon le Token !
    const url = this.serveurService.getBackend() === 'django' ? `${this.baseUrl}/` : this.baseUrl;
    return this.http.get<Billet[]>(url);
  }

  // 3. 👉 LA ROUTE SPÉCIALE ADMIN : Trouver qui est assis à une place précise
  trouverReservationParSiege(voyageId: number, siege: string): Observable<Reservation> {
    const url = this.serveurService.getBackend() === 'django' 
      ? `${this.baseUrl}/trouver-par-siege/` 
      : `${this.baseUrl}/trouver-par-siege`;

    // On crée les paramètres d'URL (?voyageId=1&siege=12A)
    let params = new HttpParams()
      .set('voyageId', voyageId.toString())
      .set('siege', siege);

    return this.http.get<Reservation>(url, { params });
  }

  // 4. CRUD basique admin (Modifier un siège)
  modifierBillet(id: number, siegeData: { siege: string }): Observable<Billet> {
    const url = this.serveurService.getBackend() === 'django' ? `${this.baseUrl}/${id}/` : `${this.baseUrl}/${id}`;
    return this.http.put<Billet>(url, siegeData);
  }

  // 5. CRUD basique admin (Supprimer un billet)
  supprimerBillet(id: number): Observable<any> {
    const url = this.serveurService.getBackend() === 'django' ? `${this.baseUrl}/${id}/` : `${this.baseUrl}/${id}`;
    return this.http.delete(url);
  }
}