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
import { jwtDecode } from 'jwt-decode';
import { environment } from '../environments/environment';

registerLocaleData(localeEsMx, 'es-MX');

let _renovando = false;

const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  // Inyectamos Injector en lugar de AuthService para evitar el ciclo inmediato
  const injector = inject(Injector);
  const router = inject(Router);

  const token = localStorage.getItem('token');
  let esInterno = false;
  try { esInterno = !!token && Number(jwtDecode<any>(token).rol) === 4; } catch { }
  let authReq = token
    ? req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) })
    : req;
  if (esInterno && req.url.startsWith(environment.apiUrl + '/') && router.url !== '/home') {
    authReq = authReq.clone({ setHeaders: { 'X-Ruta-Interna': router.url } });
  }

  return next(authReq).pipe(
    catchError(err => {
      // Un 403 representa falta de autorización, no una sesión inválida.
      // No se renueva ni se elimina el JWT en este caso.
      if (err.status === 403) {
        // Rol 4 conserva la pantalla ante una operación denegada. El guard
        // sigue decidiendo el acceso al módulo; los demás roles no cambian.
        if (esInterno) return throwError(() => err);
        if (!router.url.startsWith('/acceso-restringido')) {
          router.navigate(['/acceso-restringido']);
        }
        return throwError(() => err);
      }

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
            const retryReq = authReq.clone({
              headers: authReq.headers.set('Authorization', `Bearer ${res.token}`)
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
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'disabled' })),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor])
    ),
    importProvidersFrom(RouterModule.forRoot(routes)),
    { provide: LOCALE_ID, useValue: 'es-MX' }
  ]
};
