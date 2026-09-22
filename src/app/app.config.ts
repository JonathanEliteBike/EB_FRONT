import { importProvidersFrom, LOCALE_ID, inject, Injector } from '@angular/core';
import { provideRouter, RouterModule, withInMemoryScrolling, Router } from '@angular/router';
import { routes } from './app.routes';
import {
  provideHttpClient,
  withInterceptors,
  withFetch,
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn
} from '@angular/common/http';

import { registerLocaleData } from '@angular/common';
import localeEsMx from '@angular/common/locales/es-MX';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './services/auth.service';

registerLocaleData(localeEsMx, 'es-MX');

let _renovando = false;

const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  // Inyectamos Injector en lugar de AuthService para evitar el ciclo inmediato
  const injector = inject(Injector);
  const router = inject(Router);

  const token = localStorage.getItem('token');
  const authReq = token
    ? req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) })
    : req;

  return next(authReq).pipe(
    catchError(err => {
      const esRuta401 = err.status === 401;
      const esRenovacion = req.url.includes('/renovar_token');
      const esLogin = req.url.includes('/login');

      if (esRuta401 && !esRenovacion && !esLogin && !_renovando) {
        _renovando = true;

        // Se resuelve AuthService bajo demanda únicamente al atrapar el error
        const authService = injector.get(AuthService);

        return authService.renovarToken().pipe(
          switchMap(res => {
            _renovando = false;
            authService.setToken(res.token);
            const retryReq = req.clone({
              headers: req.headers.set('Authorization', `Bearer ${res.token}`)
            });
            return next(retryReq);
          }),
          catchError(refreshErr => {
            _renovando = false;
            authService.clearToken();
            router.navigate(['/login'], { queryParams: { expirado: '1' } });
            return throwError(() => refreshErr);
          })
        );
      }
      return throwError(() => err);
    })
  );
};

export const appConfig = {
  providers: [
    // 'top': cada navegación nueva sube al inicio; el botón atrás/adelante del
    // navegador (popstate) sigue restaurando la posición de scroll de todas
    // formas -- eso lo hace el router automáticamente sin importar esta opción.
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor])
    ),
    importProvidersFrom(RouterModule.forRoot(routes)),
    { provide: LOCALE_ID, useValue: 'es-MX' }
  ]
};