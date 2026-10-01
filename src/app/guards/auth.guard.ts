import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const token = localStorage.getItem('token');
  const ruta = route.routeConfig?.path || '';

  const rutasPublicas = ['', 'login', 
    'recuperacion/enviar-correo', 
    'recuperacion/verificar-codigo', 
    'recuperacion/restablecer-contrasena'];

  if (!token) {
    // No está logueado
    if (rutasPublicas.includes(ruta)) {
      return true;
    }
    router.navigate(['/login']);
    return false;
  }

  try {
    const decoded: any = jwtDecode(token);
    
    // Si está en ruta pública estando logueado, redirige según su rol
    if (rutasPublicas.includes(ruta)) {
      if (decoded.rol === 1) {
        router.navigate(['/home']);
      } else if (decoded.rol === 2 || decoded.rol === 3) {
        router.navigate(['/usuarios/dashboard']);
      } else if (decoded.rol === 4) {
        router.navigate(['/home']);
      } else if (decoded.rol === 99) {
        router.navigate(['/importaciones']);
      }
      return false;
    }

    // Es una vista informativa para una sesión válida; no representa un módulo.
    if (ruta === 'acceso-restringido') return true;

    // SOLO Admin (rol 1) puede acceder a rutas protegidas por authGuard
    if (decoded.rol === 1) {
      return true;
    }

    // Distribuidor (rol 2) o usuario hijo (rol 3) intenta acceder a ruta de Admin
    if (decoded.rol === 2 || decoded.rol === 3) {
      router.navigate(['/usuarios/dashboard']);
      return false;
    }

    // Home no representa un módulo y es la pantalla segura del rol 4. El
    // resto se resuelve desde el catálogo mediante ruta → módulo → "ver".
    if (decoded.rol === 4) {
      if (ruta === 'home') return true;
      return authService.validarAccesoRutaInterna(state.url).pipe(
        map(resultado => resultado.catalogada && resultado.permitido
          ? true
          : router.parseUrl('/acceso-restringido')
        ),
        catchError(() => of(router.parseUrl('/acceso-restringido')))
      );
    }

    // Importaciones (rol 99) intenta acceder a una ruta de Admin que no es la suya
    if (decoded.rol === 99) {
      router.navigate(['/importaciones']);
      return false;
    }

    // Una decisión de autorización no vuelve inválido un JWT válido.
    return router.parseUrl('/home');
    
  } catch (e) {
    localStorage.removeItem('token');
    router.navigate(['/login']);
    return false;
  }
};
