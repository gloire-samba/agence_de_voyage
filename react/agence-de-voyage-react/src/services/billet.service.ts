import { ServeurService } from './serveur.service';
import { environment } from '../environments/environment.development';
import { apiFetch } from '../interceptors/jwt.interceptor';
import type { Billet } from '../models/billet';
import type { Reservation } from '../models/reservation';

export const BilletService = {
  getBaseUrl() {
    const backend = ServeurService.getBackend();
    return `${environment.urls[backend]}/billets`;
  },

  async getTousLesBillets(): Promise<Billet[]> {
    const url = ServeurService.getBackend() === 'django' ? `${this.getBaseUrl()}/` : this.getBaseUrl();
    const response = await apiFetch(url);
    return response.json();
  },

  async getMesBillets(): Promise<Billet[]> {
    const url = ServeurService.getBackend() === 'django' ? `${this.getBaseUrl()}/` : this.getBaseUrl();
    const response = await apiFetch(url);
    return response.json();
  },

  async trouverReservationParSiege(voyageId: number, siege: string): Promise<Reservation> {
    const url = ServeurService.getBackend() === 'django' 
      ? `${this.getBaseUrl()}/trouver-par-siege/` 
      : `${this.getBaseUrl()}/trouver-par-siege`;

    const params = new URLSearchParams({ voyageId: voyageId.toString(), siege });
    const response = await apiFetch(`${url}?${params.toString()}`);
    if (!response.ok) throw response;
    return response.json();
  },

  async modifierBillet(id: number, siegeData: { siege: string }): Promise<Billet> {
    const url = ServeurService.getBackend() === 'django' ? `${this.getBaseUrl()}/${id}/` : `${this.getBaseUrl()}/${id}`;
    const response = await apiFetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(siegeData)
    });
    return response.json();
  },

  async supprimerBillet(id: number): Promise<any> {
    const url = ServeurService.getBackend() === 'django' ? `${this.getBaseUrl()}/${id}/` : `${this.getBaseUrl()}/${id}`;
    const response = await apiFetch(url, { method: 'DELETE' });
    if (!response.ok) throw response;
    return response;
  }
};