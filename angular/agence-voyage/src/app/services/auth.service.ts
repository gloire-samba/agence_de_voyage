import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface UtilisateurSession {
  id: number;
  role: 'INVITE' | 'ADMIN';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Par défaut, personne n'est connecté
  private sessionSource = new BehaviorSubject<UtilisateurSession | null>(null);
  session$ = this.sessionSource.asObservable();

  constructor() {}

  connexionInvite() {
    // L'invité (ou client standard) garde l'ID 1 comme tu le faisais avant
    this.sessionSource.next({ id: 1, role: 'INVITE' });
  }

  connexionAdmin() {
    // L'admin utilise un ID qui existe vraiment en base (ex: 2)
    this.sessionSource.next({ id: 2, role: 'ADMIN' });
  }

  deconnexion() {
    this.sessionSource.next(null);
  }

  getUtilisateurActuel(): UtilisateurSession | null {
    return this.sessionSource.value;
  }

  estAdmin(): boolean {
    const user = this.sessionSource.value;
    return user !== null && user.role === 'ADMIN';
  }
}