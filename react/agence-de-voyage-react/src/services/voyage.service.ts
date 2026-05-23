import { ServeurService } from './serveur.service';
import { environment } from '../environments/environment.development';
import { apiFetch } from '../interceptors/jwt.interceptor';
import type { RechercheIntelligenteResponse } from '../models/ia-response';
import type { Voyage } from '../models/voyage';

export const VoyageService = {
  getBaseUrl(): string {
    const backend = ServeurService.getBackend();
    return `${environment.urls[backend]}/voyages`;
  },

  get apiRoot(): string {
    const backend = ServeurService.getBackend();
    return environment.urls[backend];
  },

  async getTousLesVoyages(): Promise<Voyage[]> {
    const url = ServeurService.getBackend() === 'spring' ? this.getBaseUrl() : `${this.getBaseUrl()}/`;
    const response = await apiFetch(url);
    return response.json();
  },

  async rechercheTexteIA(texte: string): Promise<RechercheIntelligenteResponse> {
    const url = ServeurService.getBackend() === 'spring'
      ? `${this.getBaseUrl()}/recherche-intelligente`
      : `${this.getBaseUrl()}/recherche-intelligente/`;
    
    const response = await apiFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texte })
    });
    if (!response.ok) throw await response.json();
    return response.json();
  },

  async rechercheVocaleIA(audioFile: Blob): Promise<RechercheIntelligenteResponse> {
    const formData = new FormData();
    formData.append('audio', audioFile, 'enregistrement.flac');
    
    const url = ServeurService.getBackend() === 'spring'
      ? `${this.getBaseUrl()}/recherche-vocale`
      : `${this.getBaseUrl()}/recherche-vocale/`;
      
    // Pas de header 'Content-Type' défini manuellement pour FormData (le navigateur le gère)
    const response = await apiFetch(url, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw await response.json();
    return response.json();
  },

  async creerAvisTexte(reservationId: number, note: number, commentaire: string): Promise<any> {
    const payload = { reservationId, note, commentaire };
    const backend = ServeurService.getBackend();
    const url = backend === 'django' ? `${this.apiRoot}/avis/` : `${this.apiRoot}/avis`;
    
    const response = await apiFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  async soumettreAvisVocal(reservationId: number, audioBlob: Blob, note: number): Promise<any> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'avis_vocal.wav');
    formData.append('reservationId', reservationId.toString());
    formData.append('note', note.toString());

    const backend = ServeurService.getBackend();
    const url = backend === 'django' 
      ? `${this.apiRoot}/voyages/avis-vocal/` 
      : `${this.apiRoot}/avis/vocal`;

    const response = await apiFetch(url, {
      method: 'POST',
      body: formData
    });
    return response.json();
  },

  async modifierAvis(avisId: number, note: number, commentaire: string): Promise<any> {
    const url = ServeurService.getBackend() === 'spring'
      ? `${this.apiRoot}/avis/${avisId}`
      : `${this.apiRoot}/avis/${avisId}/`;
      
    const response = await apiFetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note, commentaire })
    });
    return response.json();
  },

  async supprimerAvisBase(avisId: number): Promise<any> {
    const url = ServeurService.getBackend() === 'spring'
      ? `${this.apiRoot}/avis/${avisId}`
      : `${this.apiRoot}/avis/${avisId}/`;
      
    const response = await apiFetch(url, { method: 'DELETE' });
    if (!response.ok) throw response;
    return response;
  },

  async creerVoyage(voyageData: any): Promise<any> {
    const url = ServeurService.getBackend() === 'django' ? `${this.getBaseUrl()}/` : this.getBaseUrl();
    const response = await apiFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(voyageData)
    });
    return response.json();
  },

  async modifierVoyage(id: number, voyageData: any): Promise<any> {
    const base = `${this.getBaseUrl()}/${id}`;
    const url = ServeurService.getBackend() === 'django' ? `${base}/` : base;
    const response = await apiFetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(voyageData)
    });
    return response.json();
  },

  async supprimerVoyage(id: number): Promise<any> {
    const base = `${this.getBaseUrl()}/${id}`;
    const url = ServeurService.getBackend() === 'django' ? `${base}/` : base;
    const response = await apiFetch(url, { method: 'DELETE' });
    if (!response.ok) throw response;
    return response;
  }
};