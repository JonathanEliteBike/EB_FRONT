import { inject } from '@angular/core';
import { CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Protege rutas internas con la matriz aislada módulo + acción del rol 4. */
export const requierePermisoInternoGuard = (
  moduloIdentificador: string,
  accionIdentificador: string
): CanActivateFn => (_route, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Esta capa solo decide el acceso del rol interno. Las rutas que también
  // atienden a distribuidores o usuarios hijo conservan su guard existente.
  if (authService.isAdmin() || authService.getRol() !== 4) return true;

  return authService.validarAccesoRutaInterna(state.url).pipe(
    map(() => {
      // Cuando una ruta declara su módulo de forma explícita, no debe obtener
      // acceso por la herencia de su módulo padre. La consulta previa conserva
      // la sincronización en vivo de permisos y catálogo.
      return authService.tienePermisoInterno(moduloIdentificador, accionIdentificador)
        ? true
        : router.parseUrl('/acceso-restringido');
    }),
    // La denegación o un error de consulta nunca navegan al login por sí solos.
    // Solo el interceptor trata un 401 real como expiración de sesión.
    catchError(() => of(router.parseUrl('/acceso-restringido')))
  );
};
