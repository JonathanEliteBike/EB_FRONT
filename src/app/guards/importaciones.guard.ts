import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { jwtDecode } from 'jwt-decode';

export const importacionesGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  try {
    const decoded: any = jwtDecode(token);
    if (decoded.rol === 1 || decoded.rol === 3) {
      return true;
    }
    // Usuario distribuidor → su dashboard; cualquier otro → login
    if (decoded.rol === 2) {
      router.navigate(['/usuarios/dashboard']);
    } else {
      router.navigate(['/login']);
    }
    return false;
  } catch {
    localStorage.removeItem('token');
    router.navigate(['/login']);
    return false;
  }
};
