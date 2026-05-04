import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';
import { ServeurService } from './serveur.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.development';


@Injectable({
  providedIn: 'root'
})
export class SegmentService {
  private http = inject(HttpClient);
  private serveurService = inject(ServeurService);

  private get baseUrl() {
    const backend = this.serveurService.getBackend();
    return `${environment.urls[backend]}/segments`;
  }

  // Formatage pour s'adapter à la fois à Spring et Django (gestion du slash final)
  private formatUrl(id?: number): string {
    const base = id ? `${this.baseUrl}/${id}` : this.baseUrl;
    return this.serveurService.getBackend() === 'django' ? `${base}/` : base;
  }

  getTous(): Observable<any[]> {
    return this.http.get<any[]>(this.formatUrl());
  }

  creer(segment: any): Observable<any> {
    return this.http.post<any>(this.formatUrl(), segment);
  }

  modifier(id: number, segment: any): Observable<any> {
    return this.http.put<any>(this.formatUrl(id), segment);
  }

  supprimer(id: number): Observable<any> {
    return this.http.delete(this.formatUrl(id));
  }
}