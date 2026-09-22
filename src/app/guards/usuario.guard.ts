import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { jwtDecode } from 'jwt-decode';

export const usuarioGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
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

    // Si es Admin (rol 1) e intenta acceder a otra ruta de Usuario
    if (decodedToken.rol === 1) {
      router.navigate(['/home']);
      return false;
    }

    // Rol verdaderamente no reconocido
    localStorage.removeItem('token');
    router.navigate(['/login']);
    return false;

  } catch (error) {
    localStorage.removeItem('token');
    router.navigate(['/login']);
    return false;
  }
};