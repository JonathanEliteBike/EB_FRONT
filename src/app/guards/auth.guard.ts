import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { jwtDecode } from 'jwt-decode';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
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
      } else if (decoded.rol === 2) {
        router.navigate(['/usuarios/dashboard']);
      } else if (decoded.rol === 3) {
        router.navigate(['/importaciones/dashboard']);
      }
      return false;
    }

    // SOLO Admin (rol 1) puede acceder a rutas protegidas por authGuard
    if (decoded.rol === 1) {
      return true;
    }

    // Si es Usuario (rol 2) intenta acceder a ruta de Admin
    if (decoded.rol === 2) {
      router.navigate(['/usuarios/dashboard']);
      return false;
    }

    // Si es rol Importaciones (rol 3) intenta acceder a ruta que no es importaciones
    if (decoded.rol === 3) {
      router.navigate(['/importaciones/dashboard']);
      return false;
    }

    // Rol no reconocido
    localStorage.removeItem('token');
    router.navigate(['/login']);
    return false;
    
  } catch (e) {
    localStorage.removeItem('token');
    router.navigate(['/login']);
    return false;
  }
};