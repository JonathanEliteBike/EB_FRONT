import { inject } from '@angular/core';
import { CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service'; 
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

export const flujoGuard: CanActivateFn = (_route, state: RouterStateSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.getRol() === 4) {
    return auth.validarAccesoRutaInterna(state.url).pipe(
      map(resultado => resultado.catalogada && resultado.permitido
        ? true
        : router.parseUrl('/acceso-restringido')
      ),
      catchError(() => of(router.parseUrl('/acceso-restringido')))
    );
  }
  
  const permiso = auth.getFlujoPermiso();

  if (permiso === 1) {
    return true; 
  }
  
  router.navigate(['/flujo-dashboard']);
  return false;
};
