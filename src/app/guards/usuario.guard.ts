import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const usuarioGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const token = localStorage.getItem('token');
  const ruta = route.routeConfig?.path || '';

  const rutasPublicas = [
    '',
    'login',
    'recuperacion/enviar-correo',
    'recuperacion/verificar-codigo',
    'recuperacion/restablecer-contrasena'
  ];

  // Rutas donde el staff interno (rol 1) también puede entrar
  const rutasUsuarioYAdmin = [
    'usuarios/solicitud-retroactivo',
    'usuarios/solicitud-retroactivo/formulario',
    'usuarios/solicitud-retroactivo/seguimiento'
  ];

  if (!token) {
    if (rutasPublicas.includes(ruta)) {
      return true;
    }
    router.navigate(['/login']);
    return false;
  }

  try {
    const decodedToken: any = jwtDecode(token);

    // Si está en ruta pública estando logueado, redirige según su rol
    if (rutasPublicas.includes(ruta)) {
      if (decodedToken.rol === 1) {
        router.navigate(['/home']);
      } else if (decodedToken.rol === 2 || decodedToken.rol === 3) {
        router.navigate(['/usuarios/dashboard']);
      }
      return false;
    }

    // Permite acceso a Clientes (rol 2) y Usuarios Hijos (rol 3)
    if (decodedToken.rol === 2 || decodedToken.rol === 3) {
      return true;
    }

    // Excepción puntual para staff interno (rol 1)
    if (decodedToken.rol === 1 && rutasUsuarioYAdmin.includes(ruta)) {
      return true;
    }

    // El rol interno conserva una capa de permisos distinta al portal de
    // distribuidores e hijos. La ruta debe estar catalogada y contar con
    // permiso "ver"; una denegación muestra acceso restringido, nunca invalida
    // una sesión cuyo JWT sigue siendo válido.
    if (decodedToken.rol === 4) {
      return authService.validarAccesoRutaInterna(state.url).pipe(
        map(resultado => resultado.catalogada && resultado.permitido
          ? true
          : router.parseUrl('/acceso-restringido')
        ),
        catchError(() => of(router.parseUrl('/acceso-restringido')))
      );
    }

    // Si es Admin (rol 1) e intenta acceder a otra ruta de Usuario
    if (decodedToken.rol === 1) {
      router.navigate(['/home']);
      return false;
    }

    // Un rol sin acceso al portal de usuarios conserva su sesión válida.
    return router.parseUrl('/home');

  } catch (error) {
    localStorage.removeItem('token');
    router.navigate(['/login']);
    return false;
  }
};
