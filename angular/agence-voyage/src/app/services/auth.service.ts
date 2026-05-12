import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, tap } from 'rxjs';
import { ServeurService } from './serveur.service';
import { environment } from '../../environments/environment.development';

export interface LoginResponse {
  token: string;
  role: string;
  email: string;
  utilisateurId: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private serveurService = inject(ServeurService);

  private currentUserSubject = new BehaviorSubject<LoginResponse | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  private getUserFromStorage(): LoginResponse | null {
    const data = sessionStorage.getItem('userSession');
    return data ? JSON.parse(data) : null;
  }

  getBaseUrl(): string {
    const backend = this.serveurService.getBackend();
    return environment.urls[backend];
  }

  login(email: string, motDePasse: string) {
    const baseUrl = this.getBaseUrl();
    const backend = this.serveurService.getBackend();

    const loginUrl = backend === 'django' 
      ? `${baseUrl}/auth/login/` 
      : `${baseUrl}/auth/login`;

    return this.http.post<LoginResponse>(loginUrl, { email, motDePasse }).pipe(
      tap(res => {
        sessionStorage.setItem('userSession', JSON.stringify(res));
        this.currentUserSubject.next(res);
      })
    );
  }

  logout() {
    sessionStorage.removeItem('userSession');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.currentUserSubject.value?.token || null;
  }

  getUserId(): number {
    return Number(this.currentUserSubject.value?.utilisateurId) || 0;
  }

  // 👉 CORRECTION MAJEURE ICI : On accepte les deux formats !
  isAdmin(): boolean {
    const role = this.currentUserSubject.value?.role;
    return role === 'ROLE_ADMIN' || role === 'ADMIN';
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  register(data: any) {
    const isDjango = this.getBaseUrl().includes('8000');
    const url = `${this.getBaseUrl()}/auth/register${isDjango ? '/' : ''}`;
    return this.http.post(url, data);
  }

  sauvegarderSession(token: string, role: string, email: string, utilisateurId: string) {
    const res: LoginResponse = { token, role, email, utilisateurId };
    sessionStorage.setItem('userSession', JSON.stringify(res));
    this.currentUserSubject.next(res);
  }
}