import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, of } from 'rxjs';
import { environment } from '../../environments/environment';

/** El servidor es la autoridad. El token del navegador no concede el permiso. */
export const inventarioItGuard: CanActivateFn = () => {
  const router = inject(Router);
  const http = inject(HttpClient);
  const token = localStorage.getItem('token');
  if (!token) return router.createUrlTree(['/login']);

  return http.get<{ autorizado: boolean }>(`${environment.apiUrl}/api/inventario/acceso`, {
    headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
  }).pipe(
    map(resultado => resultado.autorizado ? true : router.createUrlTree(['/home'])),
    catchError(() => of(router.createUrlTree(['/home']))),
  );
};
