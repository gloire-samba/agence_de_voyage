import { BehaviorSubject } from 'rxjs';
import { ServeurService } from './serveur.service';
import { environment } from '../environments/environment.development';

export interface LoginResponse {
  token: string;
  role: string;
  email: string;
  utilisateurId: string;
}

const getUserFromStorage = (): LoginResponse | null => {
  const data = sessionStorage.getItem('userSession');
  return data ? JSON.parse(data) : null;
};

const currentUserSubject = new BehaviorSubject<LoginResponse | null>(getUserFromStorage());

export const AuthService = {
  currentUser$: currentUserSubject.asObservable(),

  getBaseUrl(): string {
    const backend = ServeurService.getBackend();
    return environment.urls[backend];
  },

  async login(email: string, motDePasse: string): Promise<LoginResponse> {
    const baseUrl = this.getBaseUrl();
    const backend = ServeurService.getBackend();
    const loginUrl = backend === 'django' ? `${baseUrl}/auth/login/` : `${baseUrl}/auth/login`;

    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, motDePasse })
    });

    if (!response.ok) throw response;
    const res: LoginResponse = await response.json();
    
    sessionStorage.setItem('userSession', JSON.stringify(res));
    currentUserSubject.next(res);
    return res;
  },

  logout() {
    sessionStorage.removeItem('userSession');
    currentUserSubject.next(null);
    window.location.href = '/login'; // Équivalent strict du router.navigate Angular
  },

  getToken(): string | null {
    return currentUserSubject.value?.token || null;
  },

  getUserId(): number {
    return Number(currentUserSubject.value?.utilisateurId) || 0;
  },

  isAdmin(): boolean {
    const role = currentUserSubject.value?.role;
    return role === 'ROLE_ADMIN' || role === 'ADMIN';
  },

  isLoggedIn(): boolean {
    return !!currentUserSubject.value;
  },

  async register(data: any): Promise<any> {
    const isDjango = this.getBaseUrl().includes('8000');
    const url = `${this.getBaseUrl()}/auth/register${isDjango ? '/' : ''}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw response;
    return response.json();
  },

  sauvegarderSession(token: string, role: string, email: string, utilisateurId: string) {
    const res: LoginResponse = { token, role, email, utilisateurId };
    sessionStorage.setItem('userSession', JSON.stringify(res));
    currentUserSubject.next(res);
  }
};