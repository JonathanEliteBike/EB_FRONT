import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { jwtDecode } from 'jwt-decode';

export interface PermisoItem {
  modulo: string;
  accion: string;
  modulo_padre?: string;
  padre_identificador?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly http = inject(HttpClient);
  private logoutSubject = new Subject<void>();
  public onLogout$ = this.logoutSubject.asObservable();

  private authState = new BehaviorSubject<boolean>(this.isLoggedIn());
  public authState$ = this.authState.asObservable();

  private apiUrl = environment.apiUrl;

  // Matriz de rutas permitidas cargadas en memoria
  private rutasPermitidas = new Set<string>();

  constructor() {
    this.restaurarPermisosLocales();

    if (this.isLoggedIn()) {
      this.obtenerPermisosEnVivo().subscribe();
    }
  }

  // ==========================================
  // GESTIÓN DE PERMISOS EN VIVO Y MATRIZ
  // ==========================================

  /**
   * Consulta a la BD en tiempo real la matriz de permisos según el Rol activo
   */
  obtenerPermisosEnVivo(): Observable<Set<string>> {
    const rol = this.getRol();
    const userId = this.getUserId();

    // Rol 1: Bypass total SuperAdmin
    if (rol === 1) {
      this.rutasPermitidas = new Set(['*']);
      this.guardarPermisosLocales(this.rutasPermitidas);
      return of(this.rutasPermitidas);
    }

    // Rol 2: Administrador Cliente / Distribuidor
    if (rol === 2 && userId) {
      return this.http.get<any>(`${this.apiUrl}/api/permisos/delegables`).pipe(
        map(res => this.normalizarPermisos(res.permisos_delegables || [])),
        tap(set => {
          this.rutasPermitidas = set;
          this.guardarPermisosLocales(set);
        }),
        catchError(err => {
          console.warn('Error al obtener bolsa delegable en vivo:', err);
          return of(this.rutasPermitidas);
        })
      );
    }

    // Rol 3: Usuario Hijo
    if (rol === 3) {
      return this.http.get<any>(`${this.apiUrl}/api/permisos/mis-permisos`).pipe(
        map(res => this.normalizarPermisos(res.permisos || [])),
        tap(set => {
          this.rutasPermitidas = set;
          this.guardarPermisosLocales(set);
        }),
        catchError(err => {
          console.warn('Error al obtener matriz de permisos del hijo en vivo:', err);
          return of(this.rutasPermitidas);
        })
      );
    }

    return of(this.rutasPermitidas);
  }

  /**
   * Estandariza módulos y acciones construyendo todas las combinaciones posibles
   */
  private normalizarPermisos(lista: any[]): Set<string> {
    const set = new Set<string>();

    lista.forEach(item => {
      if (!item) return;

      if (typeof item === 'string') {
        const limpia = item.toLowerCase().trim();
        set.add(limpia);
        set.add(limpia.startsWith('/') ? limpia.substring(1) : `/${limpia}`);
        return;
      }

      const padre = (
        item.padre_identificador ||
        item.modulo_padre ||
        item.padre ||
        ''
      ).toLowerCase().trim();

      const mod = (
        item.identificador ||
        item.modulo ||
        ''
      ).toLowerCase().trim();

      const acc = (
        item.accion_id_texto ||
        item.accion ||
        'ver'
      ).toLowerCase().trim();

      if (mod) {
        set.add(mod);
        set.add(`/${mod}`);

        set.add(`${mod}/${acc}`);
        set.add(`/${mod}/${acc}`);

        if (padre) {
          set.add(`${padre}/${mod}`);
          set.add(`/${padre}/${mod}`);
          set.add(`${padre}/${mod}/${acc}`);
          set.add(`/${padre}/${mod}/${acc}`);
        }
      }
    });

    return set;
  }

  /**
   * Carga manual específica para usuario hijo
   */
  cargarPermisos(): Observable<any> {
    return this.http.get<{ permisos: PermisoItem[] }>(
      `${this.apiUrl}/api/permisos/mis-permisos`
    ).pipe(
      tap(response => {
        const permisosLista = (response && response.permisos && Array.isArray(response.permisos))
          ? response.permisos
          : [];

        this.rutasPermitidas = this.normalizarPermisos(permisosLista);
        this.guardarPermisosLocales(this.rutasPermitidas);
      }),
      catchError(err => {
        console.warn('Error al obtener la matriz de permisos:', err);
        return of({ permisos: [] });
      })
    );
  }

  /**
   * Consulta sincrónica in-situ para directivas *ngIf
   */
  tienePermiso(pathOAccion: string): boolean {
    if (this.isAdmin()) return true;
    if (!pathOAccion) return false;

    if (this.rutasPermitidas.has('*')) return true;

    const limpia = pathOAccion.toLowerCase().trim();
    const sinDiagonal = limpia.startsWith('/') ? limpia.substring(1) : limpia;
    const conDiagonal = limpia.startsWith('/') ? limpia : `/${limpia}`;

    if (this.rutasPermitidas.has(sinDiagonal) || this.rutasPermitidas.has(conDiagonal)) {
      return true;
    }

    const partes = sinDiagonal.split('/');

    if (partes.length === 1) {
      const moduloBuscado = partes[0];
      for (const perm of this.rutasPermitidas) {
        const pLimpio = perm.startsWith('/') ? perm.substring(1) : perm;
        if (pLimpio === moduloBuscado || pLimpio.startsWith(`${moduloBuscado}/`)) {
          return true;
        }
      }
    }

    if (partes.length === 3) {
      const submoduloAccion = `${partes[1]}/${partes[2]}`;
      if (this.rutasPermitidas.has(submoduloAccion) || this.rutasPermitidas.has(`/${submoduloAccion}`)) {
        return true;
      }
    }

    if (partes.length === 2) {
      for (const perm of this.rutasPermitidas) {
        const pLimpio = perm.startsWith('/') ? perm.substring(1) : perm;
        const pPartes = pLimpio.split('/');
        if (pPartes.length === 3 && pPartes[1] === partes[0] && pPartes[2] === partes[1]) {
          return true;
        }
      }
    }

    for (const perm of this.rutasPermitidas) {
      const pLimpio = perm.startsWith('/') ? perm.substring(1) : perm;
      if (pLimpio.includes(sinDiagonal)) {
        return true;
      }
    }

    return false;
  }

  private restaurarPermisosLocales(): void {
    const raw = localStorage.getItem('rutas_permitidas');
    if (raw) {
      try {
        const arreglo: string[] = JSON.parse(raw);
        this.rutasPermitidas = new Set(arreglo);
      } catch (e) {
        this.rutasPermitidas = new Set();
      }
    }
  }

  private guardarPermisosLocales(set: Set<string>): void {
    localStorage.setItem('rutas_permitidas', JSON.stringify(Array.from(set)));
  }

  // ==========================================
  // HELPER MÉTODOS DE ROLES Y TOKEN
  // ==========================================

  getRol(): number {
    const token = localStorage.getItem('token');
    if (!token) return 0;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.rol || payload.rol_id || 0;
    } catch {
      return 0;
    }
  }

  isAdmin(): boolean {
    return this.getRol() === 1;
  }

  isUsuarioHijo(): boolean {
    return this.getRol() === 3;
  }

  /**
   * Obtiene el ID del padre tolerando diferentes nombres de propiedad en el JWT
   */
  getPadreId(): number | null {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const pId = payload.padre_id ?? payload.id_padre ?? payload.padre ?? payload.parent_id;
      return pId ? Number(pId) : null;
    } catch {
      return null;
    }
  }

  // ==========================================
  // MÉTODOS EXISTENTES DE AUTENTICACIÓN
  // ==========================================

  register(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/registro`, user);
  }

  login(credentials: any): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        if (response.token) {
          this.setToken(response.token);
          this.authState.next(true);
          this.obtenerPermisosEnVivo().subscribe();
        }
      })
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/logout`, {}).pipe(
      tap(() => {
        this.clearToken();
        this.logoutSubject.next();
        this.authState.next(false);
      })
    );
  }

  enviarCodigoActivacion(correo: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/enviar_codigo_activacion`, { correo });
  }

  verificarCodigo(codigo: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verificar_codigo`, { codigo });
  }

  cambiarContrasena(token: string, nuevaContrasena: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/cambiar_contrasena`, {
      token,
      nueva_contrasena: nuevaContrasena
    });
  }

  renovarToken(): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/renovar_token`, {});
  }

  getTokenExpirySeconds(): number {
    const token = localStorage.getItem('token');
    if (!token) return 0;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp - Math.floor(Date.now() / 1000);
    } catch { return 0; }
  }

  isTokenValid(): boolean {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp;
      const now = Math.floor(Date.now() / 1000);
      return exp > now;
    } catch (e) {
      return false;
    }
  }

  isLoggedIn(): boolean {
    return this.isTokenValid();
  }

  setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  getToken(): string {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return token;
  }

  clearToken(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('rutas_permitidas');
    this.rutasPermitidas.clear();
  }

  getUserId(): number | null {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id || null;
    } catch (e) {
      return null;
    }
  }

  getUserName(): string | null {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.nombre || payload.usuario || null;
    } catch (e) {
      return null;
    }
  }

  getFlujoPermiso(): number {
    const token = localStorage.getItem('token');
    if (!token) return 0;

    try {
      const decoded: any = jwtDecode(token);
      return decoded.flujo || 0;
    } catch (error) {
      return 0;
    }
  }

    /**
 * Obtiene el correo del usuario en sesión inspeccionando distintas llaves y estructuras
 */
  getUserEmail(): string | null {
    const keys = ['usuario', 'user', 'currentUser', 'auth_user'];
    
    for (const key of keys) {
      const data = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          const email = parsed.correo || parsed.email || parsed.user_email || parsed.usuario_correo;
          if (email) return email;
        } catch {
          // Si no es un JSON, verificar si la cadena misma es un correo
          if (data.includes('@')) return data;
        }
      }
    }
    return null;
  }
}
