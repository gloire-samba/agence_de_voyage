import { ServeurService } from './serveur.service';
import { environment } from '../environments/environment.development';
import { apiFetch } from '../interceptors/jwt.interceptor';
import type { Reservation } from '../models/reservation';

export const ReservationService = {
  getBaseUrl(): string {
    const backend = ServeurService.getBackend();
    return `${environment.urls[backend]}/reservations`;
  },

  async getHistoriqueUtilisateur(utilisateurId: number): Promise<Reservation[]> {
    const url = ServeurService.getBackend() === 'spring'
      ? `${this.getBaseUrl()}/utilisateur/${utilisateurId}`
      : `${this.getBaseUrl()}/utilisateur/${utilisateurId}/`;
    const response = await apiFetch(url);
    return response.json();
  },

  async creerReservation(reservation: Partial<Reservation>): Promise<Reservation> {
    const url = ServeurService.getBackend() === 'spring' ? this.getBaseUrl() : `${this.getBaseUrl()}/`;
    const response = await apiFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reservation)
    });
    return response.json();
  },

  async confirmerPaiement(id: number, stripePaymentId: string): Promise<any> {
    const backend = ServeurService.getBackend();
    const url = backend === 'spring' ? `${this.getBaseUrl()}/${id}/confirmer` : `${this.getBaseUrl()}/${id}/confirmer/`;
    const response = await apiFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stripePaymentId })
    });
    return response.json();
  },

  async annulerReservation(id: number): Promise<any> {
    const backend = ServeurService.getBackend();
    const url = backend === 'spring' ? `${this.getBaseUrl()}/${id}/annuler` : `${this.getBaseUrl()}/${id}/annuler/`;
    const response = await apiFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    return response.json();
  },

  async modifierReservation(id: number, donnees: any): Promise<any> {
    const backend = ServeurService.getBackend();
    let url = `${environment.urls[backend]}/reservations/${id}`;
    if (backend === 'django') url += '/';
    
    const response = await apiFetch(url, {
      // 👉 CORRECTION 1 : Django exige un PATCH pour les updates partielles !
      method: backend === 'django' ? 'PATCH' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donnees)
    });
    
    // 👉 CORRECTION 2 : Force React à rejeter la promesse si l'API renvoie une erreur (ex: 400)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw errorData;
    }
    return response.json();
  },

  async getToutes(): Promise<any[]> {
    const backend = ServeurService.getBackend();
    const url = backend === 'django' ? `${this.getBaseUrl()}/` : this.getBaseUrl();
    const response = await apiFetch(url);
    return response.json();
  }
};