import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';
import { ServeurService } from './serveur.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.development';


@Injectable({
  providedIn: 'root'
})
export class AvisService {
  private http = inject(HttpClient);
  private serveurService = inject(ServeurService);

  private get baseUrl() {
    const backend = this.serveurService.getBackend();
    return `${environment.urls[backend]}/avis`;
  }

  private formatUrl(id?: number): string {
    const base = id ? `${this.baseUrl}/${id}` : this.baseUrl;
    return this.serveurService.getBackend() === 'django' ? `${base}/` : base;
  }

  // L'admin a besoin de récupérer TOUT le catalogue d'avis
  getTous(): Observable<any[]> {
    return this.http.get<any[]>(this.formatUrl());
  }

  modifier(id: number, donnees: any): Observable<any> {
    return this.http.put<any>(this.formatUrl(id), donnees);
  }

  supprimer(id: number): Observable<any> {
    return this.http.delete(this.formatUrl(id));
  }
}