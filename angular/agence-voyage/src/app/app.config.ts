import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { jwtInterceptor } from './interceptors/jwt.interceptor';
// 🗑️ On a supprimé l'import et le provider de ngx-stripe

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(), 
    provideRouter(routes),
    provideHttpClient(),
    // 👉 On l'active ici pour toutes les requêtes HTTP
    provideHttpClient(withInterceptors([jwtInterceptor]))
  ],
};