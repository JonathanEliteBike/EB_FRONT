import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { BehaviorSubject, of } from 'rxjs';
import { tap } from 'rxjs/operators';



// Define the SugerenciaCliente interface
export interface SugerenciaCliente {
  clave: string;
  razon_social: string;
  nombre_cliente?: string;
  evac?: string;
  nivel_firmado?: string;
}

// Interface para la respuesta de búsqueda
export interface CaratulaResponse {
  success?: boolean;
  data?: any;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CaratulasService {
  private apiUrl = `${environment.apiUrl}`;

  private clientesEvacACache = new BehaviorSubject<any>(null);
  private clientesEvacBCache = new BehaviorSubject<any>(null);

  constructor(private http: HttpClient) { }

  precargarDatos() {
    if (!this.clientesEvacACache.value) this.getClientesEvacA().subscribe();
    if (!this.clientesEvacBCache.value) this.getClientesEvacB().subscribe();
  }

  /**
   * Obtener sugerencias para el autocompletado
   * @param termino - Término de búsqueda
   * @returns Observable con las sugerencias
   */
  obtenerSugerencias(termino?: string): Observable<SugerenciaCliente[]> {
    return this.http.get<any>(`${this.apiUrl}/nombres_caratula`)
      .pipe(
        map(response => {
          console.log('Respuesta sugerencias:', response);

          let datos: any[] = [];
          if (Array.isArray(response)) {
            datos = response;
          }

          // Si no hay término o está vacío, devolver todos para el cache
          if (!termino || termino.trim().length === 0) {
            return datos.map(item => ({
              clave: item.clave || '',
              razon_social: item.nombre_cliente || '',
              nombre_cliente: item.nombre_cliente || '',
              evac: item.clave || '',
              nivel_firmado: item.nivel || ''
            }));
          }

          // Si hay término, filtrar normalmente
          if (termino.length < 2) {
            return [];
          }

          const terminoLower = termino.toLowerCase().trim();
          const resultadosFiltrados = datos.filter(item =>
            item.clave?.toLowerCase().includes(terminoLower) ||
            item.nombre_cliente?.toLowerCase().includes(terminoLower)
          );

          return resultadosFiltrados.slice(0, 10).map(item => ({
            clave: item.clave || '',
            razon_social: item.nombre_cliente || '',
            nombre_cliente: item.nombre_cliente || '',
            evac: item.clave || '',
            nivel_firmado: item.nivel || ''
          }));
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Buscar datos completos de carátulas
   * @param clave - Clave del cliente (opcional)
   * @param nombreCliente - Nombre del cliente (opcional)
   * @returns Observable con los datos del cliente
   */
  buscarCaratulas(clave?: string, nombreCliente?: string): Observable<any> {
    if (!clave && !nombreCliente) {
      return throwError(() => new Error('Se requiere al menos clave o nombre del cliente'));
    }

    let params = new HttpParams();

    if (clave) {
      params = params.set('clave', clave.trim().toUpperCase());
    }

    if (nombreCliente) {
      params = params.set('nombre_cliente', nombreCliente.trim());
    }

    console.log('Parámetros de búsqueda:', { clave, nombreCliente });
    console.log('URL de búsqueda:', `${this.apiUrl}/caratula_evac`);

    return this.http.get<any>(`${this.apiUrl}/caratula_evac`, { params })
      .pipe(
        map(response => {
          console.log('Respuesta búsqueda carátulas:', response);
          return response;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Buscar cliente por clave específica
   * @param clave - Clave del cliente
   * @returns Observable con los datos del cliente
   */
  buscarPorClave(clave: string): Observable<any> {
    if (!clave) {
      return throwError(() => new Error('Clave es requerida'));
    }

    return this.buscarCaratulas(clave.trim().toUpperCase());
  }

  /**
   * Buscar cliente por nombre
   * @param nombre - Nombre del cliente
   * @returns Observable con los datos del cliente
   */
  buscarPorNombre(nombre: string): Observable<any> {
    if (!nombre) {
      return throwError(() => new Error('Nombre es requerido'));
    }

    return this.buscarCaratulas(undefined, nombre.trim());
  }

  /**
   * Manejo centralizado de errores
   * @param error - Error HTTP
   * @returns Observable con error formateado
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ha ocurrido un error desconocido';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      switch (error.status) {
        case 0:
          errorMessage = 'Error de conexión. Verifique su conexión a internet.';
          break;
        case 404:
          errorMessage = 'No se encontraron datos para este cliente.';
          break;
        case 400:
          errorMessage = 'Parámetros de búsqueda inválidos.';
          break;
        case 500:
          errorMessage = 'Error interno del servidor. Intente nuevamente.';
          break;
        default:
          if (error.error && error.error.message) {
            errorMessage = error.error.message;
          } else {
            errorMessage = `Error ${error.status}: ${error.statusText}`;
          }
      }
    }

    console.error('Error en CaratulasService:', error);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Validar formato de clave
   * @param clave - Clave a validar
   * @returns true si el formato es válido
   */
  validarFormatoClave(clave: string): boolean {
    if (!clave) return false;

    // Formato: 2-5 letras seguidas de números opcionales
    const formatoClave = /^[A-Z]{2,5}\d*$/i;
    return formatoClave.test(clave.trim());
  }

  /**
   * Limpiar término de búsqueda
   * @param termino - Término a limpiar
   * @returns Término limpio
   */
  limpiarTerminoBusqueda(termino: string): string {
    if (!termino) return '';

    return termino
      .trim()
      .replace(/\s+/g, ' ') // Reemplazar múltiples espacios por uno solo
      .substring(0, 100); // Limitar longitud
  }

  getClientesEvacA(): Observable<any> {
    if (this.clientesEvacACache.value) return of(this.clientesEvacACache.value);

    return this.http.get<any>(`${this.apiUrl}/clientes_a`).pipe(
      tap(data => this.clientesEvacACache.next(data))
    );
  }

  getClientesEvacB(): Observable<any> {
    if (this.clientesEvacBCache.value) return of(this.clientesEvacBCache.value);

    return this.http.get<any>(`${this.apiUrl}/clientes_b`).pipe(
      tap(data => this.clientesEvacBCache.next(data))
    );
  }

  getClientesEvacGO(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/clientes_go`);
  }

  actualizarCaratulaEvacA(datos: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/caratula_evac_a`, datos).pipe(
      tap(() => this.clientesEvacACache.next(null)), 
      catchError(this.handleError)
    );
  }

  actualizarCaratulaEvacB(datos: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/caratula_evac_b`, datos).pipe(
      tap(() => this.clientesEvacBCache.next(null)), 
      catchError(this.handleError)
      );
  }

  getDatosEvacA(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/datos_evac_a`);
  }

  getDatosEvacB(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/datos_evac_b`);
  }

  getDatosPrevio(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/datos_previo`);
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No se encontró token en localStorage');
      return new HttpHeaders({ 'Content-Type': 'application/json' });
    }
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  /**
  * ---> NUEVO MÉTODO PARA GENERAR EL PDF EN EL BACKEND
  * Solicita la generación de un PDF al backend y devuelve el archivo como un Blob.
  * @param payload - Objeto con los datos del cliente y los periodos.
  * @returns Observable que emite un Blob con el contenido del PDF.
  */
  generarPdfDesdeBackend(payload: any): Observable<Blob> {
    const url = `${this.apiUrl}/generar-pdf`;

    // Hacemos un POST con los datos y especificamos que la respuesta es un 'blob'
    return this.http.post(url, payload, {
      headers: this.getAuthHeaders(), // Usamos las cabeceras de autenticación
      responseType: 'blob' // ¡Esto es muy importante!
    }).pipe(
      catchError(this.handleError)
    );
  }

  verificarGrupoCliente(clave: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/verificar_grupo_cliente`, { params: { clave } });
  }

  getTemporadasDisponibles(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/temporadas_disponibles`);
  }

  getTemporadas(): Observable<{ etiqueta: string; fecha_inicio: string; fecha_fin: string; estado: string }[]> {
    return this.http.get<any>(`${this.apiUrl}/temporadas`);
  }

  getDatosPrevioHistorico(temporada: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/datos_previo_historico`, { params: { temporada } });
  }

  getDatosEvacAHistorico(temporada: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/datos_evac_a_historico`, { params: { temporada } });
  }

  getDatosEvacBHistorico(temporada: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/datos_evac_b_historico`, { params: { temporada } });
  }

  /** Ventas de `monitor` sin cliente registrado (ni por clave ni por nombre),
   * clasificadas por marca. Carátula Global las suma a sus totales para que
   * las ventas reales cuenten aunque el cliente aún no tenga alta formal. */
  getVentasNoRegistradas(fechaDesde?: string, fechaHasta?: string): Observable<any> {
    const params: any = {};
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    return this.http.get<any>(`${this.apiUrl}/ventas_no_registradas`, { params });
  }
}