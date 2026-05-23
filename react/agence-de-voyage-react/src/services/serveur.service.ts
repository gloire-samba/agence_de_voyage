export type BackendType = 'spring' | 'django';

const STORAGE_KEY = 'serveur_actif';

// Initialisation au chargement du fichier (équivalent du constructor)
let backendActif: BackendType = (localStorage.getItem(STORAGE_KEY) as BackendType) || 'spring';

export const ServeurService = {
  getBackend(): BackendType {
    return backendActif;
  },

  setBackend(backend: BackendType): void {
    backendActif = backend;
    localStorage.setItem(STORAGE_KEY, backend);
    // Recharger la page pour forcer les services à prendre la nouvelle URL
    window.location.reload(); 
  }
};