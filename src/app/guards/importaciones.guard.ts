import { CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const importacionesGuard: CanActivateFn = (_route, state: RouterStateSnapshot) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const token = localStorage.getItem('token');

  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  try {
    const decoded: any = jwtDecode(token);
    if (decoded.rol === 1 || decoded.rol === 99) {
      return true;
    }
    if (decoded.rol === 4) {
      return authService.validarAccesoRutaInterna(state.url).pipe(
        map(resultado => resultado.catalogada && resultado.permitido
          ? true
          : router.parseUrl('/acceso-restringido')
        ),
        catchError(() => of(router.parseUrl('/acceso-restringido')))
      );
    }
    // Distribuidor o usuario hijo → su dashboard; cualquier otro → login
    if (decoded.rol === 2 || decoded.rol === 3) {
      router.navigate(['/usuarios/dashboard']);
    } else {
      router.navigate(['/home']);
    }
    return false;
  } catch {
    localStorage.removeItem('token');
    router.navigate(['/login']);
    return false;
  }
};

// Mismo acceso que importacionesGuard, salvo para el rol 99 ("Importaciones"):
// ese rol solo llena datos de embarques, sin acceso a la auditoría de
// llenado -- se le regresa a la lista en vez de dejarlo entrar.
export const importacionesAuditoriaGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const decoded: any = jwtDecode(token);
      if (decoded.rol === 99) {
        router.navigate(['/importaciones']);
        return false;
      }
    } catch {
      // Token inválido: deja que importacionesGuard lo maneje normalmente.
    }
  }
  return importacionesGuard(route, state);
};
