import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { ServeurService } from './serveur.service';
import { RechercheIntelligenteResponse } from '../models/ia-response';
import { Voyage } from '../models/voyage';


@Injectable({
  providedIn: 'root'
})
export class VoyageService {
  private http = inject(HttpClient);
  private serveurService = inject(ServeurService); // Injection de ton service dynamique

  // Le getter dynamique basé sur le choix de l'utilisateur
  private get baseUrl(): string {
    const backend = this.serveurService.getBackend();
    return `${environment.urls[backend]}/voyages`;
  }

  getTousLesVoyages(): Observable<Voyage[]> {
    const url = this.serveurService.getBackend() === 'spring'
      ? this.baseUrl
      : `${this.baseUrl}/`;
    return this.http.get<Voyage[]>(url);
  }

  rechercheTexteIA(texte: string): Observable<RechercheIntelligenteResponse> {
    const url = this.serveurService.getBackend() === 'spring'
      ? `${this.baseUrl}/recherche-intelligente`
      : `${this.baseUrl}/recherche-intelligente/`;
    return this.http.post<RechercheIntelligenteResponse>(url, { texte });
  }

  rechercheVocaleIA(audioFile: Blob): Observable<RechercheIntelligenteResponse> {
    const formData = new FormData();
    formData.append('audio', audioFile, 'enregistrement.flac');
    
    const url = this.serveurService.getBackend() === 'spring'
      ? `${this.baseUrl}/recherche-vocale`
      : `${this.baseUrl}/recherche-vocale/`;
    return this.http.post<RechercheIntelligenteResponse>(url, formData);
  }

  // 1. Pour l'avis écrit
  creerAvisTexte(reservationId: number, note: number, commentaire: string) {
    const payload = { reservationId, note, commentaire };
    const backend = this.serveurService.getBackend();
    const baseUrl = environment.urls[backend];
    
    // 👉 On pointe bien vers /avis (plus de custom !)
    const url = backend === 'django' ? `${baseUrl}/avis/` : `${baseUrl}/avis`;
    return this.http.post(url, payload);
  }

  // 2. Pour l'avis vocal
  soumettreAvisVocal(reservationId: number, audioBlob: Blob, note: number, avisId?: number) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'avis_vocal.wav');
    formData.append('reservationId', reservationId.toString());
    formData.append('note', note.toString());

    const backend = this.serveurService.getBackend();
    const baseUrl = environment.urls[backend];

    // 👉 L'URL vocale de Spring est /avis/vocal (plus de custom !)
    const url = backend === 'django' 
      ? `${baseUrl}/voyages/avis-vocal/` 
      : `${baseUrl}/avis/vocal`;

    return this.http.post(url, formData);
  }

  // ✏️ Modifier un avis existant
  modifierAvis(avisId: number, note: number, commentaire: string): Observable<any> {
    const url = this.serveurService.getBackend() === 'spring'
      ? `${this.apiRoot}/avis/${avisId}`
      : `${this.apiRoot}/avis/${avisId}/`;
      
    return this.http.put(url, { note, commentaire });
  }

  // 🗑️ Supprimer un avis
  supprimerAvisBase(avisId: number): Observable<any> {
    const url = this.serveurService.getBackend() === 'spring'
      ? `${this.apiRoot}/avis/${avisId}`
      : `${this.apiRoot}/avis/${avisId}/`;
      
    return this.http.delete(url);
  }

  // 👉 NOUVEAU : Récupère la racine (ex: http://localhost:8000/api)
  private get apiRoot(): string {
    const backend = this.serveurService.getBackend();
    return environment.urls[backend];
  }

  // --- MÉTHODES ADMINISTRATEUR (CRUD) ---

  creerVoyage(voyageData: any): Observable<any> {
    const url = this.serveurService.getBackend() === 'django' ? `${this.baseUrl}/` : this.baseUrl;
    return this.http.post<any>(url, voyageData);
  }

  modifierVoyage(id: number, voyageData: any): Observable<any> {
    const base = `${this.baseUrl}/${id}`;
    const url = this.serveurService.getBackend() === 'django' ? `${base}/` : base;
    return this.http.put<any>(url, voyageData);
  }

  supprimerVoyage(id: number): Observable<any> {
    const base = `${this.baseUrl}/${id}`;
    const url = this.serveurService.getBackend() === 'django' ? `${base}/` : base;
    return this.http.delete(url);
  }

  
}