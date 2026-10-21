import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { AuthService } from '../services/auth.service';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

export const adminGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const token = localStorage.getItem('token');
  const ruta = route.routeConfig?.path || '';

  const rutasPublicas = ['', 'login', 
    'recuperacion/enviar-correo', 
    'recuperacion/verificar-codigo', 
    'recuperacion/restablecer-contrasena'];

  if (!token) {
    // Si no hay token, permitimos solo rutas públicas
    if (rutasPublicas.includes(ruta)) {
      return true;
    } else {
      router.navigate(['/login']);
      return false;
    }
  }

  try {
    const decodedToken: any = jwtDecode(token);

    if (decodedToken.rol === 1) {
      return true;
    }

    if (decodedToken.rol === 4) {
      return authService.validarAccesoRutaInterna(state.url).pipe(
        map(resultado => resultado.catalogada && resultado.permitido
          ? true
          : router.parseUrl('/acceso-restringido')
        ),
        catchError(() => of(router.parseUrl('/acceso-restringido')))
      );
    }

    router.navigate(['/usuarios/dashboard']);
    return false;
  } catch (error) {
    console.error('Token inválido o error al decodificar:', error);
    router.navigate(['/login']);
    return false;
  }
};
