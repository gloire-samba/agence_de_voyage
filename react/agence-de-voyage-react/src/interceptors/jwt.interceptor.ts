import { AuthService } from '../services/auth.service';

/**
 * Fonction qui remplace le 'fetch' standard pour agir comme le HttpInterceptor d'Angular.
 * Elle intercepte la requête, vérifie le token, et le colle dans les en-têtes.
 */
export const apiFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  // On récupère le token via le service
  const token = AuthService.getToken();
  
  // On prépare les en-têtes (headers)
  const headers = new Headers(init?.headers);
  
  // Si on est connecté, on colle le Token sur la requête pour passer la douane de Spring/Django
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // On clone la configuration initiale avec les nouveaux en-têtes (comme req.clone() en Angular)
  const modifiedInit: RequestInit = {
    ...init,
    headers,
  };

  // On exécute la requête HTTP modifiée
  return fetch(input, modifiedInit);
};