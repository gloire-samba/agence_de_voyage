import { ServeurService } from './serveur.service';
import { environment } from '../environments/environment.development';
import { apiFetch } from '../interceptors/jwt.interceptor';

export const SegmentService = {
  getBaseUrl() {
    const backend = ServeurService.getBackend();
    return `${environment.urls[backend]}/segments`;
  },

  formatUrl(id?: number): string {
    const base = id ? `${this.getBaseUrl()}/${id}` : this.getBaseUrl();
    return ServeurService.getBackend() === 'django' ? `${base}/` : base;
  },

  async getTous(): Promise<any[]> {
    const response = await apiFetch(this.formatUrl());
    return response.json();
  },

  async creer(segment: any): Promise<any> {
    const response = await apiFetch(this.formatUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(segment)
    });
    return response.json();
  },

  async modifier(id: number, segment: any): Promise<any> {
    const response = await apiFetch(this.formatUrl(id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(segment)
    });
    return response.json();
  },

  async supprimer(id: number): Promise<any> {
    const response = await apiFetch(this.formatUrl(id), { method: 'DELETE' });
    if (!response.ok) throw response;
    return response;
  }
};