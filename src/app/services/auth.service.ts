import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject, of, forkJoin } from 'rxjs';
import { tap, catchError, map, finalize } from 'rxjs/operators';
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
  // Infraestructura nueva: no sustituye aún la matriz temporal por acción.
  private modulosPermitidos = new Set<string>();
  private capacidadesPermitidas = new Set<string>();
  private accesosCargadosSubject = new BehaviorSubject<boolean>(false);
  public readonly accesosCargados$ = this.accesosCargadosSubject.asObservable();
  private ocultarMontosGlobal = true;
  private ambitosMontosOcultos = new Set<string>();

  constructor() {
    this.restaurarPermisosLocales();
    this.restaurarAccesosLocales();

    if (this.isLoggedIn()) {
      this.obtenerPermisosEnVivo().subscribe();
      this.obtenerAccesosEnVivo(true).subscribe();
      this.obtenerPoliticaMontosEnVivo().subscribe();
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

  /** Carga la base nueva módulo/capacidad sin alterar permisos por acción. */
  obtenerAccesosEnVivo(mostrarCargaInicial = false): Observable<{ modulos: Set<string>, capacidades: Set<string> }> {
    const rol = this.getRol();
    if (mostrarCargaInicial) {
      this.accesosCargadosSubject.next(false);
    }
    if (rol === 1) {
      this.modulosPermitidos = new Set(['*']);
      this.capacidadesPermitidas = new Set(['*']);
      this.guardarAccesosLocales();
      this.accesosCargadosSubject.next(true);
      return of({ modulos: this.modulosPermitidos, capacidades: this.capacidadesPermitidas });
    }

    let modulosUrl = '';
    let capacidadesUrl = '';
    if (rol === 2) {
      modulosUrl = `${this.apiUrl}/api/permisos/mis-modulos`;
      capacidadesUrl = `${this.apiUrl}/api/permisos/capacidades-delegables`;
    } else if (rol === 3) {
      modulosUrl = `${this.apiUrl}/api/permisos/mis-modulos`;
      capacidadesUrl = `${this.apiUrl}/api/permisos/mis-capacidades`;
    } else {
      this.accesosCargadosSubject.next(true);
      return of({ modulos: this.modulosPermitidos, capacidades: this.capacidadesPermitidas });
    }

    return forkJoin({
      modulos: this.http.get<any>(modulosUrl).pipe(
        catchError(err => {
          console.warn('Error al obtener módulos efectivos:', err);
          return of({ modulos: [] });
        })
      ),
      capacidades: this.http.get<any>(capacidadesUrl).pipe(
        catchError(err => {
          console.warn('Error al obtener capacidades efectivas:', err);
          return of({ capacidades: [] });
        })
      )
    }).pipe(
      map(respuesta => ({
        modulos: new Set<string>((respuesta.modulos.modulos || [])
          .map((item: any) => String(item?.identificador || '').toLowerCase().trim())
          .filter(Boolean)),
        capacidades: new Set<string>((respuesta.capacidades.capacidades || [])
          .map((item: any) => String(item?.capacidad || '').toLowerCase().trim())
          .filter(Boolean))
      })),
      tap(accesos => {
        this.modulosPermitidos = accesos.modulos;
        this.capacidadesPermitidas = accesos.capacidades;
        this.guardarAccesosLocales();
      }),
      catchError(err => {
        console.warn('Error al obtener accesos por módulo/capacidad:', err);
        return of({ modulos: this.modulosPermitidos, capacidades: this.capacidadesPermitidas });
      }),
      finalize(() => this.accesosCargadosSubject.next(true))
    );
  }

  /** Carga la politica efectiva de datos monetarios. Flask sigue siendo la autoridad. */
  obtenerPoliticaMontosEnVivo(): Observable<void> {
    const rol = this.getRol();
    if (rol === 1 || rol === 2) {
      this.ocultarMontosGlobal = false;
      this.ambitosMontosOcultos.clear();
      this.guardarPoliticaMontosLocal();
      return of(void 0);
    }
    if (rol !== 3) {
      this.ocultarMontosGlobal = true;
      this.ambitosMontosOcultos.clear();
      return of(void 0);
    }
    return this.http.get<any>(`${this.apiUrl}/api/permisos/montos/mis-politicas`).pipe(
      tap(respuesta => {
        this.ocultarMontosGlobal = !!respuesta?.ocultar_montos_global;
        this.ambitosMontosOcultos = new Set<string>((respuesta?.ambitos || [])
          .filter((ambito: any) => !!ambito?.ocultar_montos)
          .map((ambito: any) => String(ambito.identificador || '').toLowerCase().trim())
          .filter(Boolean));
        this.guardarPoliticaMontosLocal();
      }),
      map(() => void 0),
      catchError(err => {
        // Falla cerrada: un rol 3 sin politica disponible no muestra montos.
        console.warn('Error al obtener politica monetaria:', err);
        this.ocultarMontosGlobal = true;
        this.ambitosMontosOcultos.clear();
        this.guardarPoliticaMontosLocal();
        return of(void 0);
      })
    );
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

  /** Comprueba identificadores de módulo mediante coincidencia exacta. */
  tieneModulo(identificador: string): boolean {
    // Rol 2 usa el portal con acceso propio. La bolsa sólo controla qué
    // módulos puede delegar a sus hijos, no su acceso personal.
    if (this.isAdmin() || this.getRol() === 2) return true;
    const normalizado = (identificador || '').toLowerCase().trim();
    return !!normalizado && this.modulosPermitidos.has(normalizado);
  }

  tieneModulosEfectivos(): boolean {
    return this.modulosPermitidos.size > 0;
  }

  /** Comprueba capacidades globales; una capacidad no da acceso a módulos. */
  tieneCapacidad(capacidad: string): boolean {
    // "Mostrar montos" y demás capacidades son propias del distribuidor.
    // Para rol 3 siguen siendo necesarias la bolsa del padre y la asignación
    // individual, que se reflejan en capacidadesPermitidas.
    if (this.isAdmin() || this.getRol() === 2) return true;
    const normalizada = (capacidad || '').toLowerCase().trim();
    return !!normalizada && this.capacidadesPermitidas.has(normalizada);
  }

  /** Semantica negativa explicita para evitar invertir la regla de negocio. */
  debeOcultarMontos(ambito: string): boolean {
    const rol = this.getRol();
    if (rol === 1 || rol === 2) return false;
    if (rol !== 3) return true;
    if (this.ocultarMontosGlobal) return true;
    const normalizado = (ambito || '').toLowerCase().trim();
    return !normalizado || this.ambitosMontosOcultos.has(normalizado);
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

  private restaurarAccesosLocales(): void {
    for (const [clave, destino] of [
      ['modulos_permitidos', 'modulos'],
      ['capacidades_permitidas', 'capacidades']
    ] as const) {
      try {
        const valores = JSON.parse(localStorage.getItem(clave) || '[]');
        if (Array.isArray(valores)) {
          if (destino === 'modulos') this.modulosPermitidos = new Set(valores);
          else this.capacidadesPermitidas = new Set(valores);
        }
      } catch {
        // El siguiente refresco autenticado reemplazará un valor no válido.
      }
    }
  }

  private guardarAccesosLocales(): void {
    localStorage.setItem('modulos_permitidos', JSON.stringify(Array.from(this.modulosPermitidos)));
    localStorage.setItem('capacidades_permitidas', JSON.stringify(Array.from(this.capacidadesPermitidas)));
  }

  private guardarPoliticaMontosLocal(): void {
    localStorage.setItem('ocultar_montos_global', JSON.stringify(this.ocultarMontosGlobal));
    localStorage.setItem('ambitos_montos_ocultos', JSON.stringify(Array.from(this.ambitosMontosOcultos)));
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
          this.obtenerAccesosEnVivo(true).subscribe();
          this.obtenerPoliticaMontosEnVivo().subscribe();
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
    // Nunca reutilizar permisos o módulos de una sesión anterior al cambiar
    // de usuario: se reemplazarán exclusivamente con la respuesta del JWT nuevo.
    localStorage.removeItem('rutas_permitidas');
    localStorage.removeItem('modulos_permitidos');
    localStorage.removeItem('capacidades_permitidas');
    localStorage.removeItem('ocultar_montos_global');
    localStorage.removeItem('ambitos_montos_ocultos');
    this.rutasPermitidas.clear();
    this.modulosPermitidos.clear();
    this.capacidadesPermitidas.clear();
    this.ocultarMontosGlobal = true;
    this.ambitosMontosOcultos.clear();
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
    localStorage.removeItem('modulos_permitidos');
    localStorage.removeItem('capacidades_permitidas');
    localStorage.removeItem('ocultar_montos_global');
    localStorage.removeItem('ambitos_montos_ocultos');
    this.rutasPermitidas.clear();
    this.modulosPermitidos.clear();
    this.capacidadesPermitidas.clear();
    this.ocultarMontosGlobal = true;
    this.ambitosMontosOcultos.clear();
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
