import { importProvidersFrom, LOCALE_ID } from '@angular/core';
import { provideRouter, RouterModule, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';

import { registerLocaleData } from '@angular/common';
import localeEsMx from '@angular/common/locales/es-MX';

registerLocaleData(localeEsMx, 'es-MX');

export const appConfig = {
  providers: [
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'disabled' })),

    provideHttpClient(
      withFetch(),
      withInterceptors([
        (req, next) => {
          const token = localStorage.getItem('token');
          if (token) {
            const authReq = req.clone({
              headers: req.headers.set('Authorization', `Bearer ${token}`)
            });
            return next(authReq);
          }
          return next(req);
        }
      ])
    ),
    importProvidersFrom(RouterModule.forRoot(routes)),

    { provide: LOCALE_ID, useValue: 'es-MX' }

  ]
};
