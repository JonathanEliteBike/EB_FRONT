import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpRequest } from '@angular/common/http';
import { Observable, map, filter } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GarantiasKpis {
  total: number;
  cerradas: number;
  en_proceso: number;
  lat_atencion: number;
  lat_cierre: number;
}

export interface CuadroDetalle {
  folio: string;
  distribuidor: string;
  tipo_marco: string;
  tipo_dano: string;
}

export interface GarantiasDashboard {
  kpis: GarantiasKpis;
  por_estatus: Record<string, number>;
  latencia_mensual: Record<string, number>;
  latencia_por_cliente: Record<string, number>;
  garantias_por_cliente: Record<string, number>;
  piezas_reemplazo: Record<string, number>;
  ubicacion_dano: Record<string, number>;
  por_marca: Record<string, number>;
  cuadros_por_tipo_marco: Record<string, number>;
  cuadros_detalle: CuadroDetalle[];
  ultima_actualizacion: string;
}

export interface LatenciaTicket {
  id: number;
  folio: string;
  estatus: string;
  distribuidor: string;
  marca: string;
  fecha_creacion: string;
  lat_atencion: number | null;
  lat_cierre: number | null;
}

export interface GarantiasStats {
  total: number;
  abiertos: number;
  este_mes: number;
  cerrados: number;
}

export interface GarantiaComentario {
  id: number;
  formulario_id: number;
  autor: string;
  texto: string;
  tipo: string;
  fecha: string;
}

export interface GarantiaFormulario {
  id: number;
  folio: string;
  email: string;
  distribuidor: string;
  contacto: string;
  puesto: string;
  marca: string;

  estatus: string;
  estatus_pieza: string;
  pieza_reemplazo?: string | null;

  docs_validados: number;
  serie_validada: number;
  validacion_docs_json?: Record<string, string> | null;

  fecha_creacion: string;
  fecha_actualizacion?: string | null;
  fecha_estatus?: string | null;
  fecha_pieza?: string | null;

  datos?: any;

  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class GarantiasService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Dashboard ────────────────────────────────────────
  getDashboard(desde?: string, hasta?: string): Observable<GarantiasDashboard> {
    let url = `${this.api}/garantias/dashboard`;
    if (desde && hasta) url += `?desde=${desde}&hasta=${hasta}`;
    return this.http.get<GarantiasDashboard>(url);
  }

  refrescar(): Observable<any> {
    return this.http.post(`${this.api}/garantias/refrescar`, {});
  }

  getExportUrl(distribuidor?: string, desde?: string, hasta?: string): string {
    const url = `${this.api}/garantias/exportar`;
    const params: string[] = [];
    if (distribuidor) params.push(`distribuidor=${encodeURIComponent(distribuidor)}`);
    if (desde && hasta) params.push(`desde=${desde}`, `hasta=${hasta}`);
    return params.length ? `${url}?${params.join('&')}` : url;
  }

  // ── Temporadas (mismo endpoint compartido que usan caratulas/monitor) ─
  getTemporadas(): Observable<{ etiqueta: string; fecha_inicio: string; fecha_fin: string; estado: string }[]> {
    return this.http.get<any>(`${this.api}/temporadas`);
  }

  // ── DB init ──────────────────────────────────────────
  inicializarTablas(): Observable<any> {
    return this.http.post(`${this.api}/garantias/inicializar-tablas`, {});
  }

  // ── Form submissions ────────────────────────────────
  enviarFormulario(datos: any): Observable<{ ok: boolean; folio: string; id: number }> {
    return this.http.post<{ ok: boolean; folio: string; id: number }>(
      `${this.api}/garantias/formulario/enviar`,
      datos
    );
  }

  listarFormularios(): Observable<GarantiaFormulario[]> {
    return this.http.get<GarantiaFormulario[]>(`${this.api}/garantias/formulario/lista`);
  }

  obtenerFormulario(id: number): Observable<GarantiaFormulario> {
    return this.http.get<GarantiaFormulario>(`${this.api}/garantias/formulario/${id}`);
  }

  eliminarFormulario(id: number): Observable<any> {
    return this.http.delete(`${this.api}/garantias/formulario/${id}`);
  }

  actualizarEstatus(id: number, estatus: string, fecha?: string): Observable<any> {
    return this.http.put(`${this.api}/garantias/formulario/${id}/estatus`, {
      estatus,
      fecha: fecha || null
    });
  }

  actualizarPieza(id: number, estatus_pieza: string, fecha?: string): Observable<any> {
    return this.http.put(`${this.api}/garantias/formulario/${id}/pieza`, {
      estatus_pieza,
      fecha: fecha || null
    });
  }

  actualizarFechaEstatus(id: number, fecha: string): Observable<any> {
    return this.http.put(`${this.api}/garantias/formulario/${id}/fecha-estatus`, {
      fecha
    });
  }

  actualizarFechaCreacion(id: number, fecha: string): Observable<any> {
    return this.http.put(`${this.api}/garantias/formulario/${id}/fecha-creacion`, {
      fecha
    });
  }

  actualizarFechaPieza(id: number, fecha: string): Observable<any> {
    return this.http.put(`${this.api}/garantias/formulario/${id}/fecha-pieza`, {
      fecha
    });
  }

  actualizarValidacion(id: number, docs_validados: boolean, serie_validada: boolean): Observable<any> {
    return this.http.put(`${this.api}/garantias/formulario/${id}/validacion`, {
      docs_validados,
      serie_validada
    });
  }

  validarDocumento(
    id: number,
    campo: string,
    estado: string | null,
    nombre_legible: string,
    fecha_validacion?: string
  ): Observable<any> {
    return this.http.put(`${this.api}/garantias/formulario/${id}/validacion-doc`, {
      campo,
      estado,
      nombre_legible,
      fecha_validacion: fecha_validacion || null
    });
  }

  // ── Form structure editor ────────────────────────────
  obtenerEstructura(): Observable<any> {
    return this.http.get<any>(`${this.api}/garantias/estructura`);
  }

  guardarEstructura(estructura: any[]): Observable<any> {
    return this.http.post(`${this.api}/garantias/estructura`, {
      estructura
    });
  }

  // ── Stats hub ────────────────────────────────────────
  getStats(): Observable<GarantiasStats> {
    return this.http.get<GarantiasStats>(`${this.api}/garantias/stats`);
  }

  // ── Comentarios ──────────────────────────────────────
  getComentarios(id: number): Observable<GarantiaComentario[]> {
    return this.http.get<GarantiaComentario[]>(`${this.api}/garantias/ticket/${id}/comentarios`);
  }

  addComentario(
    id: number,
    autor: string,
    texto: string,
    tipo: string = 'comentario'
  ): Observable<any> {
    return this.http.post(`${this.api}/garantias/ticket/${id}/comentarios`, {
      autor,
      texto,
      tipo
    });
  }

  getMisTickets(): Observable<GarantiaFormulario[]> {
    return this.http.get<GarantiaFormulario[]>(`${this.api}/garantias/mis-tickets`);
  }

  actualizarDato(id: number, campo: string, valor: string): Observable<any> {
    return this.http.put(`${this.api}/garantias/formulario/${id}/actualizar-dato`, {
      campo,
      valor
    });
  }

  actualizarPiezaReemplazo(id: number, pieza_reemplazo: string): Observable<any> {
    return this.http.put(`${this.api}/garantias/formulario/${id}/pieza-reemplazo`, {
      pieza_reemplazo
    });
  }

  getLatencias(): Observable<LatenciaTicket[]> {
    return this.http.get<LatenciaTicket[]>(`${this.api}/garantias/latencias`);
  }

  // ── Catálogo piezas ──────────────────────────────────────────────────────
  getPiezas(): Observable<string[]> {
    return this.http.get<string[]>(`${this.api}/garantias/piezas`);
  }

  agregarPieza(nombre: string): Observable<{ ok: boolean; nombre: string }> {
    return this.http.post<{ ok: boolean; nombre: string }>(
      `${this.api}/garantias/piezas`,
      { nombre }
    );
  }

  contarUsoPieza(nombre: string): Observable<{ nombre: string; count: number }> {
    return this.http.get<{ nombre: string; count: number }>(
      `${this.api}/garantias/piezas/uso?nombre=${encodeURIComponent(nombre)}`
    );
  }

  eliminarPieza(nombre: string): Observable<{ ok: boolean; nombre: string }> {
    return this.http.delete<{ ok: boolean; nombre: string }>(
      `${this.api}/garantias/piezas`,
      { body: { nombre } }
    );
  }

  // ── Importación masiva histórica ─────────────────────────────────────────
  descargarPlantillaImport(): Observable<Blob> {
    return this.http.get(`${this.api}/garantias/importar/plantilla`, { responseType: 'blob' });
  }

  importarHistorico(archivo: File): Observable<{
    ok: boolean; insertados: number; errores: { fila: number; errores: string[] }[]; mensaje: string;
  }> {
    const fd = new FormData();
    fd.append('archivo', archivo);
    return this.http.post<any>(`${this.api}/garantias/importar`, fd);
  }

  // ── Usuarios ─────────────────────────────────────────
  getUsuariosParaAsignar(): Observable<{ id: number; nombre: string; correo: string; rol: string }[]> {
    return this.http.get<{ id: number; nombre: string; correo: string; rol: string }[]>(
      `${this.api}/usuarios`
    );
  }

  // ── File uploads ─────────────────────────────────────
  subirArchivo(
    file: File,
    onProgress?: (pct: number) => void
  ): Observable<{ ok: boolean; nombre: string; original: string }> {
    const fd = new FormData();
    fd.append('archivo', file);

    if (!onProgress) {
      return this.http.post<{ ok: boolean; nombre: string; original: string }>(
        `${this.api}/garantias/archivo/subir`,
        fd
      );
    }

    const req = new HttpRequest('POST', `${this.api}/garantias/archivo/subir`, fd, {
      reportProgress: true
    });

    return this.http.request(req).pipe(
      map(event => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          onProgress(Math.round((100 * event.loaded) / event.total));
        }

        return event;
      }),
      filter(event => event.type === HttpEventType.Response),
      map(event => (event as any).body as { ok: boolean; nombre: string; original: string })
    );
  }
}