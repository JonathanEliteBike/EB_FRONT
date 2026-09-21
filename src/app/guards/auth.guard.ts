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
      } else if (decoded.rol === 2 || decoded.rol === 3) {
        router.navigate(['/usuarios/dashboard']);
      } else if (decoded.rol === 99) {
        router.navigate(['/importaciones']);
      }
      return false;
    }

    // SOLO Admin (rol 1) puede acceder a rutas protegidas por authGuard
    if (decoded.rol === 1) {
      return true;
    }

    // Distribuidor (rol 2) o usuario hijo (rol 3) intenta acceder a ruta de Admin
    if (decoded.rol === 2 || decoded.rol === 3) {
      router.navigate(['/usuarios/dashboard']);
      return false;
    }

    // Importaciones (rol 99) intenta acceder a una ruta de Admin que no es la suya
    if (decoded.rol === 99) {
      router.navigate(['/importaciones']);
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
