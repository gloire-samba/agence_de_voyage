import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';
import { ServeurService } from './serveur.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.development';


@Injectable({
  providedIn: 'root'
})
export class UtilisateurService {
  private http = inject(HttpClient);
  private serveurService = inject(ServeurService);

  private get baseUrl() {
    const backend = this.serveurService.getBackend();
    return `${environment.urls[backend]}/utilisateurs`;
  }

  // Permet de gérer le slash final requis par Django mais pas par Spring
  private formatUrl(id?: number): string {
    const base = id ? `${this.baseUrl}/${id}` : this.baseUrl;
    return this.serveurService.getBackend() === 'django' ? `${base}/` : base;
  }

  getTous(): Observable<any[]> {
    return this.http.get<any[]>(this.formatUrl());
  }

  creer(utilisateur: any): Observable<any> {
    return this.http.post<any>(this.formatUrl(), utilisateur);
  }

  modifier(id: number, utilisateur: any): Observable<any> {
    return this.http.put<any>(this.formatUrl(id), utilisateur);
  }

  supprimer(id: number): Observable<any> {
    return this.http.delete(this.formatUrl(id));
  }

  getUn(id: number): Observable<any> {
    return this.http.get<any>(this.formatUrl(id));
  }
}