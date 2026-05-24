import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GarantiasKpis {
  total: number;
  cerradas: number;
  en_proceso: number;
  lat_atencion: number;
  lat_cierre: number;
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
  ultima_actualizacion: string;
}

export interface LatenciaTicket {
  id: number;
  folio: string;
  estatus: string;
  distribuidor: string;
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
  pieza_reemplazo?: string;
  docs_validados: number;
  serie_validada: number;
  validacion_docs_json?: Record<string, string>;
  fecha_creacion: string;
  fecha_actualizacion?: string;
  datos?: any;
}

@Injectable({ providedIn: 'root' })
export class GarantiasService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Dashboard (existing) ────────────────────────────────────────
  getDashboard(): Observable<GarantiasDashboard> {
    return this.http.get<GarantiasDashboard>(`${this.api}/garantias/dashboard`);
  }

  refrescar(): Observable<any> {
    return this.http.post(`${this.api}/garantias/refrescar`, {});
  }

  getExportUrl(): string {
    return `${this.api}/garantias/exportar`;
  }

  // ── DB init ─────────────────────────────────────────────────────
  inicializarTablas(): Observable<any> {
    return this.http.post(`${this.api}/garantias/inicializar-tablas`, {});
  }

  // ── Form submissions ────────────────────────────────────────────
  enviarFormulario(datos: any): Observable<{ ok: boolean; folio: string; id: number }> {
    return this.http.post<{ ok: boolean; folio: string; id: number }>(
      `${this.api}/garantias/formulario/enviar`, datos
    );
  }

  listarFormularios(): Observable<GarantiaFormulario[]> {
    return this.http.get<GarantiaFormulario[]>(`${this.api}/garantias/formulario/lista`);
  }

  obtenerFormulario(id: number): Observable<GarantiaFormulario> {
    return this.http.get<GarantiaFormulario>(`${this.api}/garantias/formulario/${id}`);
  }

  actualizarEstatus(id: number, estatus: string): Observable<any> {
    return this.http.put(`${this.api}/garantias/formulario/${id}/estatus`, { estatus });
  }

  actualizarPieza(id: number, estatus_pieza: string): Observable<any> {
    return this.http.put(`${this.api}/garantias/formulario/${id}/pieza`, { estatus_pieza });
  }

  actualizarValidacion(id: number, docs_validados: boolean, serie_validada: boolean): Observable<any> {
    return this.http.put(`${this.api}/garantias/formulario/${id}/validacion`, { docs_validados, serie_validada });
  }

  validarDocumento(id: number, campo: string, estado: string | null, nombre_legible: string): Observable<any> {
    return this.http.put(`${this.api}/garantias/formulario/${id}/validacion-doc`, { campo, estado, nombre_legible });
  }

  // ── Form structure (editor) ─────────────────────────────────────
  obtenerEstructura(): Observable<any> {
    return this.http.get<any>(`${this.api}/garantias/estructura`);
  }

  guardarEstructura(estructura: any[]): Observable<any> {
    return this.http.post(`${this.api}/garantias/estructura`, { estructura });
  }

  // ── Stats (hub) ─────────────────────────────────────────────────
  getStats(): Observable<GarantiasStats> {
    return this.http.get<GarantiasStats>(`${this.api}/garantias/stats`);
  }

  // ── Comentarios ─────────────────────────────────────────────────
  getComentarios(id: number): Observable<GarantiaComentario[]> {
    return this.http.get<GarantiaComentario[]>(`${this.api}/garantias/ticket/${id}/comentarios`);
  }

  addComentario(id: number, autor: string, texto: string, tipo = 'comentario'): Observable<any> {
    return this.http.post(`${this.api}/garantias/ticket/${id}/comentarios`, { autor, texto, tipo });
  }

  getMisTickets(): Observable<GarantiaFormulario[]> {
    return this.http.get<GarantiaFormulario[]>(`${this.api}/garantias/mis-tickets`);
  }

  actualizarDato(id: number, campo: string, valor: string): Observable<any> {
    return this.http.put(`${this.api}/garantias/formulario/${id}/actualizar-dato`, { campo, valor });
  }

  actualizarPiezaReemplazo(id: number, pieza_reemplazo: string): Observable<any> {
    return this.http.put(`${this.api}/garantias/formulario/${id}/pieza-reemplazo`, { pieza_reemplazo });
  }

  getLatencias(): Observable<LatenciaTicket[]> {
    return this.http.get<LatenciaTicket[]>(`${this.api}/garantias/latencias`);
  }

  // ── Usuarios (para asignar tickets desde admin) ─────────────────
  getUsuariosParaAsignar(): Observable<{ id: number; nombre: string; correo: string; rol: string }[]> {
    return this.http.get<any[]>(`${this.api}/usuarios`);
  }

  // ── File uploads ────────────────────────────────────────────────
  subirArchivo(file: File): Observable<{ ok: boolean; nombre: string; original: string }> {
    const fd = new FormData();
    fd.append('archivo', file);
    return this.http.post<{ ok: boolean; nombre: string; original: string }>(
      `${this.api}/garantias/archivo/subir`, fd
    );
  }
}
